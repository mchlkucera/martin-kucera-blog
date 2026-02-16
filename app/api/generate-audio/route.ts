import { type NextRequest, NextResponse } from "next/server";
import { generateAudio, isAudioGenerationEnabled } from "@/lib/audio-generator";
import { putObject, R2_PUBLIC_URL } from "@/lib/r2";
import { extractTextFromBlocks, extractTitle } from "@/lib/text-extractor";
import type { AudioGenerationResponse, PostContent, PostMeta } from "@/types";

// Max duration for Hobby plan is 60 seconds
export const maxDuration = 60;

/**
 * Fetch content.json from R2 storage
 */
async function fetchContent(slug: string): Promise<PostContent> {
	if (!R2_PUBLIC_URL) {
		throw new Error("NEXT_PUBLIC_R2_PUBLIC_URL not configured");
	}

	const response = await fetch(
		`${R2_PUBLIC_URL}/blog/posts/${slug}/content.json`,
	);
	if (!response.ok) {
		throw new Error(`Failed to fetch content for ${slug}: ${response.status}`);
	}

	return response.json() as Promise<PostContent>;
}

/**
 * Fetch meta.json from R2 storage
 */
async function fetchMeta(slug: string): Promise<PostMeta> {
	if (!R2_PUBLIC_URL) {
		throw new Error("NEXT_PUBLIC_R2_PUBLIC_URL not configured");
	}

	// Add cache-busting parameter to avoid CDN cache
	const cacheBuster = Date.now();
	const response = await fetch(
		`${R2_PUBLIC_URL}/blog/posts/${slug}/meta.json?t=${cacheBuster}`,
		{
			cache: "no-store",
		},
	);
	if (!response.ok) {
		throw new Error(`Failed to fetch meta for ${slug}: ${response.status}`);
	}

	return response.json() as Promise<PostMeta>;
}

/**
 * Update meta.json in R2 storage
 */
async function updateMeta(
	slug: string,
	metaUpdates: Partial<PostMeta>,
): Promise<PostMeta> {
	const existingMeta = await fetchMeta(slug);
	const updatedMeta: PostMeta = {
		...existingMeta,
		...metaUpdates,
		updatedAt: new Date().toISOString(),
	};

	await putObject(
		`blog/posts/${slug}/meta.json`,
		JSON.stringify(updatedMeta, null, 2),
		"application/json",
	);

	return updatedMeta;
}

export async function POST(
	request: NextRequest,
): Promise<NextResponse<AudioGenerationResponse>> {
	// Verify authorization
	const authHeader = request.headers.get("authorization");
	const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

	if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
		return NextResponse.json(
			{
				success: false,
				slug: "",
				audioStatus: "failed",
				error: "Unauthorized",
			},
			{ status: 401 },
		);
	}

	// Check if audio generation is enabled
	if (!isAudioGenerationEnabled()) {
		return NextResponse.json(
			{
				success: false,
				slug: "",
				audioStatus: "failed",
				error: "Audio generation not enabled (ELEVENLABS_API_KEY missing)",
			},
			{ status: 400 },
		);
	}

	const body = (await request.json()) as { slug?: string };
	const { slug } = body;

	if (!slug) {
		return NextResponse.json(
			{
				success: false,
				slug: "",
				audioStatus: "failed",
				error: "Missing slug in request body",
			},
			{ status: 400 },
		);
	}

	console.log(`Starting audio generation for ${slug}...`);

	try {
		// Fetch content
		const content = await fetchContent(slug);
		const { page, blocks } = content;

		// Extract text for TTS
		const title = extractTitle(page);
		const bodyText = extractTextFromBlocks(blocks);
		const fullText = title ? `${title}. ${bodyText}` : bodyText;

		if (!fullText || fullText.trim().length === 0) {
			await updateMeta(slug, {
				audioStatus: "none",
				audioUrl: null,
				audioDuration: null,
			});
			return NextResponse.json({
				success: true,
				slug,
				audioStatus: "none",
				message: "No text content to generate audio from",
			});
		}

		console.log(`Extracted ${fullText.length} characters for TTS`);

		// Update status to generating
		await updateMeta(slug, { audioStatus: "generating" });

		// Generate audio
		const { buffer, duration } = await generateAudio(fullText);
		console.log(
			`Generated audio: ${buffer.length} bytes, ~${duration} seconds`,
		);

		// Upload to R2 storage
		const audioResult = await putObject(
			`blog/posts/${slug}/audio.mp3`,
			buffer,
			"audio/mpeg",
		);

		// Update meta with audio info
		await updateMeta(slug, {
			audioStatus: "ready",
			audioUrl: audioResult.url,
			audioDuration: duration,
		});

		console.log(`Audio generation complete for ${slug}`);

		return NextResponse.json({
			success: true,
			slug,
			audioStatus: "ready",
			audioUrl: audioResult.url,
			audioDuration: duration,
		});
	} catch (error) {
		console.error(`Audio generation failed for ${slug}:`, error);

		// Update meta with failed status
		try {
			await updateMeta(slug, {
				audioStatus: "failed",
				audioError: (error as Error).message,
			});
		} catch (metaError) {
			console.error(`Failed to update meta for ${slug}:`, metaError);
		}

		return NextResponse.json(
			{
				success: false,
				slug,
				audioStatus: "failed",
				error: (error as Error).message,
			},
			{ status: 500 },
		);
	}
}
