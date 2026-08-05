/**
 * Generate TTS audio for one article and upload it to R2.
 *
 * Run manually after publishing a new article in Notion:
 *
 *   vercel env pull .env.audio --environment=production
 *   npx tsx --env-file=.env.audio scripts/generate-audio.ts <slug>
 *   rm .env.audio
 *
 * The site shows the audio player automatically once
 * blog/posts/<slug>/audio.mp3 exists in R2 (within ~10 min via ISR).
 */
import { generateAudio } from "../lib/audio-generator";
import { getBlocks, getDatabase } from "../lib/notion";
import { objectExists, putObject } from "../lib/r2";
import { extractTextFromBlocks } from "../lib/text-extractor";
import { getPageSlug } from "../lib/utils";

const slug = process.argv[2];
if (!slug) {
	console.error("Usage: npx tsx scripts/generate-audio.ts <slug>");
	process.exit(1);
}

const database = await getDatabase(process.env.NOTION_DATABASE_ID);
const post = database.find((p) => getPageSlug(p) === slug);
if (!post) {
	console.error(`No article with slug "${slug}". Available slugs:`);
	for (const p of database) console.error(`  ${getPageSlug(p)}`);
	process.exit(1);
}

const key = `blog/posts/${slug}/audio.mp3`;
if (await objectExists(key)) {
	console.log(`Audio already exists at ${key} — it will be overwritten.`);
}

const title = post.properties.Name.title[0]?.plain_text || "";
const blocks = await getBlocks(post.id);
const bodyText = extractTextFromBlocks(blocks);
const fullText = title ? `${title}. ${bodyText}` : bodyText;
console.log(`Generating audio for "${title}" (${fullText.length} chars)...`);

const { buffer, duration } = await generateAudio(fullText);
console.log(`Generated ${buffer.length} bytes, ~${Math.round(duration)}s`);

const { url } = await putObject(key, buffer, "audio/mpeg");
console.log(`Uploaded: ${url}`);
