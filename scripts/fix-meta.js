#!/usr/bin/env node
/**
 * Script to fix meta.json for posts where audio exists but meta is incorrect
 * Usage: BLOB_READ_WRITE_TOKEN=xxx node scripts/fix-meta.js <slug>
 */

import { put } from "@vercel/blob";

const BLOB_URL = process.env.NEXT_PUBLIC_BLOB_URL;

async function fetchMeta(slug) {
	const response = await fetch(
		`${BLOB_URL}/blog/posts/${slug}/meta.json?t=${Date.now()}`,
		{
			cache: "no-store",
		},
	);
	if (!response.ok) {
		throw new Error(`Failed to fetch meta for ${slug}: ${response.status}`);
	}
	return response.json();
}

async function checkAudioExists(slug) {
	const audioUrl = `${BLOB_URL}/blog/posts/${slug}/audio.mp3`;
	const response = await fetch(audioUrl, { method: "HEAD" });
	return {
		exists: response.ok,
		url: audioUrl,
	};
}

async function fixMeta(slug) {
	console.log(`Checking ${slug}...`);

	// Check if audio exists
	const audioCheck = await checkAudioExists(slug);
	if (!audioCheck.exists) {
		console.log(`  Audio does not exist for ${slug}, skipping`);
		return;
	}

	console.log(`  Audio exists at ${audioCheck.url}`);

	// Fetch current meta
	const meta = await fetchMeta(slug);
	console.log(
		`  Current status: ${meta.audioStatus}, audioUrl: ${meta.audioUrl || "null"}`,
	);

	// Check if fix needed
	if (meta.audioStatus === "ready" && meta.audioUrl) {
		console.log(`  Meta already correct, skipping`);
		return;
	}

	// Update meta
	const updatedMeta = {
		...meta,
		audioStatus: "ready",
		audioUrl: audioCheck.url,
		audioError: undefined,
		updatedAt: new Date().toISOString(),
	};

	// Remove undefined keys
	delete updatedMeta.audioError;

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

	console.log(`  Fixed! audioStatus: ready, audioUrl: ${audioCheck.url}`);
}

async function main() {
	const slug = process.argv[2];

	if (!slug) {
		console.error("Usage: node scripts/fix-meta.js <slug>");
		console.error("Example: node scripts/fix-meta.js nadeje-i");
		process.exit(1);
	}

	if (!BLOB_URL) {
		console.error("NEXT_PUBLIC_BLOB_URL environment variable is required");
		process.exit(1);
	}

	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		console.error("BLOB_READ_WRITE_TOKEN environment variable is required");
		process.exit(1);
	}

	try {
		await fixMeta(slug);
		console.log("Done!");
	} catch (error) {
		console.error("Error:", error.message);
		process.exit(1);
	}
}

main();
