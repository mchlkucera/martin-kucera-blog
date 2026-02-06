import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { getBlocks, getDatabase, getPage } from "../../lib/notion";
import { getPageSlug } from "../[id]";

const databaseId = process.env.NOTION_DATABASE_ID;

/**
 * Generate a hash of content for change detection
 * @param {Object} content - Content to hash
 * @returns {string} - MD5 hash
 */
function generateContentHash(content) {
	return crypto.createHash("md5").update(JSON.stringify(content)).digest("hex");
}

/**
 * Try to fetch existing meta.json from Blob storage
 * @param {string} slug - Post slug
 * @returns {Object|null} - Meta object or null if not found
 */
async function fetchExistingMeta(slug) {
	try {
		const blobUrl = process.env.NEXT_PUBLIC_BLOB_URL;
		if (!blobUrl) return null;

		const response = await fetch(`${blobUrl}/blog/posts/${slug}/meta.json`);
		if (response.ok) {
			return await response.json();
		}
	} catch (_error) {
		console.log(`No existing meta for ${slug}`);
	}
	return null;
}

/**
 * Trigger audio generation for a post
 * @param {string} slug - Post slug
 * @param {string} baseUrl - Base URL for API calls
 */
async function triggerAudioGeneration(slug, baseUrl) {
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
			error.message,
		);
	}
}

export default async function handler(req, res) {
	// Verify authorization
	const authHeader = req.headers.authorization;
	const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

	if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		console.log("Starting content sync...");

		// Fetch all posts from Notion
		const posts = await getDatabase(databaseId);
		console.log(`Found ${posts.length} posts in Notion`);

		const syncResults = [];
		const indexPosts = [];

		// Determine base URL for triggering audio generation
		const baseUrl = process.env.VERCEL_URL
			? `https://${process.env.VERCEL_URL}`
			: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

		for (const post of posts) {
			const slug = getPageSlug(post);
			const pageId = post.id;

			try {
				// Fetch full page and blocks
				const [page, blocks] = await Promise.all([
					getPage(pageId),
					getBlocks(pageId),
				]);

				// Create content object
				const content = {
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
					const meta = {
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
						audioUrl: hasChanged ? null : existingMeta?.audioUrl,
						audioDuration: hasChanged ? null : existingMeta?.audioDuration,
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

					syncResults.push({ slug, status: "updated" });
				} else {
					console.log(`No changes for ${slug}`);
					syncResults.push({ slug, status: "unchanged" });
				}

				// Add to index
				indexPosts.push({
					id: pageId,
					slug,
					title: page.properties.Name.title[0]?.plain_text || "",
					lastEditedTime: page.last_edited_time,
					createdTime: page.created_time,
					properties: page.properties,
				});
			} catch (error) {
				console.error(`Error processing ${slug}:`, error.message);
				syncResults.push({ slug, status: "error", error: error.message });
			}
		}

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

		return res.status(200).json({
			success: true,
			results: syncResults,
			totalPosts: posts.length,
			syncedAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Sync error:", error);
		return res.status(500).json({
			success: false,
			error: error.message,
		});
	}
}
