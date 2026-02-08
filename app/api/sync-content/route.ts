import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { getBlocks, getDatabase, getPage } from "@/lib/notion";
import { getPageSlug } from "@/lib/utils";
import type {
	NotionPage,
	PostContent,
	PostMeta,
	SyncResponse,
	SyncResult,
} from "@/types";

const databaseId = process.env.NOTION_DATABASE_ID;

/**
 * Generate a hash of content for change detection
 */
function generateContentHash(content: object): string {
	return crypto.createHash("md5").update(JSON.stringify(content)).digest("hex");
}

/**
 * Try to fetch existing meta.json from Blob storage
 */
async function fetchExistingMeta(slug: string): Promise<PostMeta | null> {
	try {
		const blobUrl = process.env.NEXT_PUBLIC_BLOB_URL;
		if (!blobUrl) return null;

		const response = await fetch(`${blobUrl}/blog/posts/${slug}/meta.json`);
		if (response.ok) {
			return (await response.json()) as PostMeta;
		}
	} catch {
		console.log(`No existing meta for ${slug}`);
	}
	return null;
}

/**
 * Trigger audio generation for a post
 */
async function triggerAudioGeneration(
	slug: string,
	baseUrl: string,
): Promise<void> {
	try {
		const response = await fetch(`${baseUrl}/api/generate-audio`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.CRON_SECRET}`,
			},
			body: JSON.stringify({ slug }),
		});

		if (!response.ok) {
			console.error(
				`Failed to trigger audio generation for ${slug}: ${response.status}`,
			);
		}
	} catch (error) {
		console.error(
			`Error triggering audio generation for ${slug}:`,
			(error as Error).message,
		);
	}
}

/**
 * Process a single post and return the results
 */
async function processPost(
	post: NotionPage,
	baseUrl: string,
): Promise<{
	syncResult: SyncResult;
	indexPost: {
		id: string;
		slug: string;
		title: string;
		lastEditedTime: string;
		createdTime: string;
		properties: NotionPage["properties"];
	} | null;
}> {
	const slug = getPageSlug(post);
	const pageId = post.id;

	try {
		// Fetch full page and blocks
		const [page, blocks] = await Promise.all([
			getPage(pageId),
			getBlocks(pageId),
		]);

		// Create content object
		const content: PostContent = {
			page,
			blocks,
			fetchedAt: new Date().toISOString(),
		};

		// Generate hash for change detection
		const contentHash = generateContentHash({ page, blocks });

		// Check existing meta
		const existingMeta = await fetchExistingMeta(slug);
		const hasChanged =
			!existingMeta || existingMeta.contentHash !== contentHash;

		if (hasChanged) {
			console.log(`Content changed for ${slug}, updating...`);

			// Store content.json
			await put(
				`blog/posts/${slug}/content.json`,
				JSON.stringify(content, null, 2),
				{
					access: "public",
					contentType: "application/json",
					addRandomSuffix: false,
					allowOverwrite: true,
				},
			);

			// Create/update meta.json
			const meta: PostMeta = {
				slug,
				pageId,
				contentHash,
				title: page.properties.Name.title[0]?.plain_text || "",
				lastEditedTime: page.last_edited_time,
				createdTime: page.created_time,
				syncedAt: new Date().toISOString(),
				audioStatus:
					existingMeta?.audioStatus === "ready"
						? "pending"
						: existingMeta?.audioStatus || "pending",
				audioUrl: hasChanged ? null : (existingMeta?.audioUrl ?? null),
				audioDuration: hasChanged
					? null
					: (existingMeta?.audioDuration ?? null),
			};

			await put(
				`blog/posts/${slug}/meta.json`,
				JSON.stringify(meta, null, 2),
				{
					access: "public",
					contentType: "application/json",
					addRandomSuffix: false,
					allowOverwrite: true,
				},
			);

			// Trigger audio generation asynchronously (don't await)
			triggerAudioGeneration(slug, baseUrl);

			return {
				syncResult: { slug, status: "updated" },
				indexPost: {
					id: pageId,
					slug,
					title: page.properties.Name.title[0]?.plain_text || "",
					lastEditedTime: page.last_edited_time,
					createdTime: page.created_time,
					properties: page.properties,
				},
			};
		}

		console.log(`No changes for ${slug}`);
		return {
			syncResult: { slug, status: "unchanged" },
			indexPost: {
				id: pageId,
				slug,
				title: page.properties.Name.title[0]?.plain_text || "",
				lastEditedTime: page.last_edited_time,
				createdTime: page.created_time,
				properties: page.properties,
			},
		};
	} catch (error) {
		console.error(`Error processing ${slug}:`, (error as Error).message);
		return {
			syncResult: {
				slug,
				status: "error",
				error: (error as Error).message,
			},
			indexPost: null,
		};
	}
}

/**
 * Process posts in parallel batches
 */
async function processPosts(
	posts: NotionPage[],
	baseUrl: string,
	batchSize = 5,
): Promise<{
	syncResults: SyncResult[];
	indexPosts: Array<{
		id: string;
		slug: string;
		title: string;
		lastEditedTime: string;
		createdTime: string;
		properties: NotionPage["properties"];
	}>;
}> {
	const syncResults: SyncResult[] = [];
	const indexPosts: Array<{
		id: string;
		slug: string;
		title: string;
		lastEditedTime: string;
		createdTime: string;
		properties: NotionPage["properties"];
	}> = [];

	// Process posts in batches
	for (let i = 0; i < posts.length; i += batchSize) {
		const batch = posts.slice(i, i + batchSize);
		console.log(
			`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(posts.length / batchSize)} (${batch.length} posts)`,
		);

		const results = await Promise.all(
			batch.map((post) => processPost(post, baseUrl)),
		);

		for (const result of results) {
			syncResults.push(result.syncResult);
			if (result.indexPost) {
				indexPosts.push(result.indexPost);
			}
		}
	}

	return { syncResults, indexPosts };
}

export async function POST(
	request: NextRequest,
): Promise<NextResponse<SyncResponse>> {
	// Verify authorization
	const authHeader = request.headers.get("authorization");
	const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

	if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	try {
		console.log("Starting content sync...");

		// Fetch all posts from Notion
		const posts = await getDatabase(databaseId);
		console.log(`Found ${posts.length} posts in Notion`);

		// Determine base URL for triggering audio generation
		const baseUrl = process.env.VERCEL_URL
			? `https://${process.env.VERCEL_URL}`
			: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

		// Process all posts in parallel batches
		const { syncResults, indexPosts } = await processPosts(posts, baseUrl);

		// Update index.json
		const index = {
			posts: indexPosts,
			updatedAt: new Date().toISOString(),
			totalPosts: indexPosts.length,
		};

		await put("blog/index.json", JSON.stringify(index, null, 2), {
			access: "public",
			contentType: "application/json",
			addRandomSuffix: false,
			allowOverwrite: true,
		});

		console.log("Content sync completed");

		return NextResponse.json({
			success: true,
			results: syncResults,
			totalPosts: posts.length,
			syncedAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Sync error:", error);
		return NextResponse.json(
			{
				success: false,
				error: (error as Error).message,
			},
			{ status: 500 },
		);
	}
}

// Also support GET for easier testing
export async function GET(
	request: NextRequest,
): Promise<NextResponse<SyncResponse>> {
	return POST(request);
}
