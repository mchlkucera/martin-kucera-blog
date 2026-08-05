import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { generateAudio } from "@/lib/audio-generator";
import { getBlocks, getDatabase } from "@/lib/notion";
import { objectExists, putObject } from "@/lib/r2";
import { extractTextFromBlocks } from "@/lib/text-extractor";
import { databaseId, getPageSlug } from "@/lib/utils";

export const maxDuration = 300;

// Daily cron: generate audio for any article that doesn't have one yet.
// Stateless and idempotent — the presence of audio.mp3 in R2 is the only
// state. One article per run: generation is slow (chunked TTS) and must
// fit the 300s budget; a backlog heals on following days.
const MAX_PER_RUN = 1;

export async function GET(
	request: NextRequest,
): Promise<NextResponse<{ generated: string[]; missing: string[] }>> {
	const authHeader = request.headers.get("authorization");
	if (
		!process.env.CRON_SECRET ||
		authHeader !== `Bearer ${process.env.CRON_SECRET}`
	) {
		return NextResponse.json({ generated: [], missing: [] }, { status: 401 });
	}

	const generated: string[] = [];
	const missing: string[] = [];

	try {
		const database = await getDatabase(databaseId);

		for (const post of database) {
			const slug = getPageSlug(post);
			if (!slug) continue;
			if (!(await objectExists(`blog/posts/${slug}/audio.mp3`))) {
				missing.push(slug);
			}
		}

		// Dead-man's switch, sent before the slow part: it answers "is the
		// cron alive", while generation failures surface via captureException.
		Sentry.captureCheckIn(
			{ monitorSlug: "generate-missing-audio", status: "ok" },
			{
				schedule: { type: "interval", value: 1, unit: "day" },
				checkinMargin: 720,
				maxRuntime: 10,
			},
		);

		for (const slug of missing.slice(0, MAX_PER_RUN)) {
			const post = database.find((p) => getPageSlug(p) === slug);
			if (!post) continue;

			console.log(`Generating audio for ${slug}...`);
			const title = post.properties.Name.title[0]?.plain_text || "";
			const blocks = await getBlocks(post.id);
			const bodyText = extractTextFromBlocks(blocks);
			const fullText = title ? `${title}. ${bodyText}` : bodyText;
			if (!fullText.trim()) continue;

			const { buffer } = await generateAudio(fullText);
			await putObject(`blog/posts/${slug}/audio.mp3`, buffer, "audio/mpeg");
			generated.push(slug);
			console.log(`Audio ready for ${slug} (${buffer.length} bytes)`);
		}

		return NextResponse.json({ generated, missing });
	} catch (error) {
		console.error("Audio generation run failed:", error);
		Sentry.captureException(error, {
			tags: { route: "generate-missing-audio" },
		});
		return NextResponse.json({ generated, missing }, { status: 500 });
	}
}
