import { put } from "@vercel/blob";
import {
	generateAudio,
	isAudioGenerationEnabled,
} from "../../lib/audio-generator";
import { extractTextFromBlocks, extractTitle } from "../../lib/text-extractor";

// Allow up to 5 minutes for long articles
export const config = {
	maxDuration: 300,
};

/**
 * Fetch content.json from Blob storage
 * @param {string} slug - Post slug
 * @returns {Object|null} - Content object or null
 */
async function fetchContent(slug) {
	const blobUrl = process.env.NEXT_PUBLIC_BLOB_URL;
	if (!blobUrl) {
		throw new Error("NEXT_PUBLIC_BLOB_URL not configured");
	}

	const response = await fetch(`${blobUrl}/blog/posts/${slug}/content.json`);
	if (!response.ok) {
		throw new Error(`Failed to fetch content for ${slug}: ${response.status}`);
	}

	return response.json();
}

/**
 * Fetch meta.json from Blob storage
 * @param {string} slug - Post slug
 * @returns {Object|null} - Meta object or null
 */
async function fetchMeta(slug) {
	const blobUrl = process.env.NEXT_PUBLIC_BLOB_URL;
	if (!blobUrl) {
		throw new Error("NEXT_PUBLIC_BLOB_URL not configured");
	}

	// Add cache-busting parameter to avoid CDN cache
	const cacheBuster = Date.now();
	const response = await fetch(
		`${blobUrl}/blog/posts/${slug}/meta.json?t=${cacheBuster}`,
		{
			cache: "no-store",
		},
	);
	if (!response.ok) {
		throw new Error(`Failed to fetch meta for ${slug}: ${response.status}`);
	}

	return response.json();
}

/**
 * Update meta.json in Blob storage
 * @param {string} slug - Post slug
 * @param {Object} metaUpdates - Fields to update
 */
async function updateMeta(slug, metaUpdates) {
	const existingMeta = await fetchMeta(slug);
	const updatedMeta = {
		...existingMeta,
		...metaUpdates,
		updatedAt: new Date().toISOString(),
	};

	await put(
		`blog/posts/${slug}/meta.json`,
		JSON.stringify(updatedMeta, null, 2),
		{
			access: "public",
			contentType: "application/json",
			addRandomSuffix: false,
			allowOverwrite: true,
		},
	);

	return updatedMeta;
}

export default async function handler(req, res) {
	// Only allow POST
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	// Verify authorization
	const authHeader = req.headers.authorization;
	const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

	if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	// Check if audio generation is enabled
	if (!isAudioGenerationEnabled()) {
		return res.status(400).json({
			error: "Audio generation not enabled (ELEVENLABS_API_KEY missing)",
		});
	}

	const { slug } = req.body;

	if (!slug) {
		return res.status(400).json({ error: "Missing slug in request body" });
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
			return res.status(200).json({
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

		// Upload to Blob storage
		const audioBlob = await put(`blog/posts/${slug}/audio.mp3`, buffer, {
			access: "public",
			contentType: "audio/mpeg",
			addRandomSuffix: false,
			allowOverwrite: true,
		});

		// Update meta with audio info
		await updateMeta(slug, {
			audioStatus: "ready",
			audioUrl: audioBlob.url,
			audioDuration: duration,
		});

		console.log(`Audio generation complete for ${slug}`);

		return res.status(200).json({
			success: true,
			slug,
			audioStatus: "ready",
			audioUrl: audioBlob.url,
			audioDuration: duration,
		});
	} catch (error) {
		console.error(`Audio generation failed for ${slug}:`, error);

		// Update meta with failed status
		try {
			await updateMeta(slug, {
				audioStatus: "failed",
				audioError: error.message,
			});
		} catch (metaError) {
			console.error(`Failed to update meta for ${slug}:`, metaError);
		}

		return res.status(500).json({
			success: false,
			slug,
			audioStatus: "failed",
			error: error.message,
		});
	}
}
