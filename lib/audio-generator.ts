import type { AudioGenerationResult } from "@/types";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
// Grandpa Spuds Oxley - wise and approachable voice
const DEFAULT_VOICE_ID = "NOpBlnGInO9m6vDvFkFC";
const MODEL_ID = "eleven_multilingual_v2"; // Best for Czech
const MAX_CHARS_PER_REQUEST = 5000; // ElevenLabs allows up to 5000
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Split text into chunks at sentence boundaries
 */
export function chunkTextAtSentences(
	text: string,
	maxChars: number = MAX_CHARS_PER_REQUEST,
): string[] {
	if (!text || text.length <= maxChars) {
		return text ? [text] : [];
	}

	const chunks: string[] = [];
	let remainingText = text;

	while (remainingText.length > 0) {
		if (remainingText.length <= maxChars) {
			chunks.push(remainingText);
			break;
		}

		// Find a good break point
		let breakPoint = maxChars;

		// Try to find a sentence boundary (. ! ?)
		const sentenceEnders = [". ", "! ", "? ", ".\n", "!\n", "?\n"];
		let bestBreak = -1;

		for (const ender of sentenceEnders) {
			const lastIndex = remainingText.lastIndexOf(ender, maxChars);
			if (lastIndex > bestBreak && lastIndex > maxChars * 0.5) {
				bestBreak = lastIndex + ender.length - 1;
			}
		}

		if (bestBreak > 0) {
			breakPoint = bestBreak;
		} else {
			// Try comma or other punctuation
			const lastComma = remainingText.lastIndexOf(", ", maxChars);
			const lastSemicolon = remainingText.lastIndexOf("; ", maxChars);
			const lastColon = remainingText.lastIndexOf(": ", maxChars);

			breakPoint = Math.max(lastComma, lastSemicolon, lastColon);

			if (breakPoint < maxChars * 0.5) {
				// Try word boundary
				const lastSpace = remainingText.lastIndexOf(" ", maxChars);
				if (lastSpace > maxChars * 0.5) {
					breakPoint = lastSpace;
				} else {
					// Force break at maxChars
					breakPoint = maxChars;
				}
			}
		}

		chunks.push(remainingText.slice(0, breakPoint + 1).trim());
		remainingText = remainingText.slice(breakPoint + 1).trim();
	}

	return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Generate audio for a single text chunk with retry logic using ElevenLabs
 */
async function generateAudioChunk(
	text: string,
	attempt: number = 1,
): Promise<Buffer> {
	try {
		const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

		const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
			method: "POST",
			headers: {
				"xi-api-key": process.env.ELEVENLABS_API_KEY || "",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text: text,
				model_id: MODEL_ID,
				voice_settings: {
					stability: 0.5,
					similarity_boost: 0.75,
					style: 0.0,
					use_speaker_boost: true,
				},
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`ElevenLabs API error (${response.status}): ${errorText}`,
			);
		}

		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	} catch (error) {
		if (attempt >= MAX_RETRIES) {
			throw new Error(
				`Failed to generate audio after ${MAX_RETRIES} attempts: ${(error as Error).message}`,
			);
		}

		// Exponential backoff
		const delay = INITIAL_RETRY_DELAY * 2 ** (attempt - 1);
		console.log(
			`Audio generation attempt ${attempt} failed, retrying in ${delay}ms...`,
		);
		await sleep(delay);

		return generateAudioChunk(text, attempt + 1);
	}
}

/**
 * Generate audio from text using ElevenLabs TTS
 */
export async function generateAudio(
	text: string,
): Promise<AudioGenerationResult> {
	if (!text || text.trim().length === 0) {
		throw new Error("No text provided for audio generation");
	}

	const chunks = chunkTextAtSentences(text);
	console.log(
		`Generating audio for ${chunks.length} chunk(s) using ElevenLabs...`,
	);

	const audioBuffers: Buffer[] = [];

	for (let i = 0; i < chunks.length; i++) {
		console.log(
			`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`,
		);
		const buffer = await generateAudioChunk(chunks[i]);
		audioBuffers.push(buffer);

		// Small delay between chunks to respect rate limits
		if (i < chunks.length - 1) {
			await sleep(200);
		}
	}

	// Concatenate all audio buffers
	const combinedBuffer = Buffer.concat(audioBuffers);

	// Estimate duration (rough estimate: ~150 words per minute, ~5 chars per word)
	const wordCount = text.split(/\s+/).length;
	const estimatedDuration = Math.round((wordCount / 150) * 60);

	return {
		buffer: combinedBuffer,
		duration: estimatedDuration,
	};
}

/**
 * Check if ElevenLabs API key is configured
 */
export function isAudioGenerationEnabled(): boolean {
	return !!process.env.ELEVENLABS_API_KEY;
}
