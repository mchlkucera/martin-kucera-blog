import Link from "next/link";
import { getDatabase } from "@/lib/notion";
import { BLOB_URL, databaseId, getPageSlug } from "@/lib/utils";
import type { NotionPage, NotionRichTextItem } from "@/types";

// Revalidate every 60 seconds
export const revalidate = 60;

interface BlobPost {
	id: string;
	lastEditedTime: string;
	createdTime: string;
	properties: NotionPage["properties"];
}

interface BlobIndex {
	posts: BlobPost[];
}

function Text({ text }: { text: NotionRichTextItem[] | null | undefined }) {
	if (!text) {
		return null;
	}
	return (
		<>
			{text.map((value, index) => {
				const {
					annotations: { bold, code, italic, strikethrough, underline },
					text: textContent,
				} = value;
				return (
					<span
						className={[
							bold ? "font-bold" : "",
							code ? "font-mono bg-gray-100 px-1 rounded" : "",
							italic ? "italic" : "",
							strikethrough ? "line-through" : "",
							underline ? "underline" : "",
						]
							.filter(Boolean)
							.join(" ")}
						key={`${textContent.content}-${index}`}
					>
						{textContent.link ? (
							<a href={textContent.link.url}>{textContent.content}</a>
						) : (
							textContent.content
						)}
					</span>
				);
			})}
		</>
	);
}

async function getPosts(): Promise<NotionPage[]> {
	// Try fetching from Blob storage first
	if (BLOB_URL) {
		try {
			const response = await fetch(`${BLOB_URL}/blog/index.json`, {
				next: { revalidate: 60 },
			});
			if (response.ok) {
				const data: BlobIndex = await response.json();
				// Transform blob index format to match Notion format
				return data.posts.map((post) => ({
					id: post.id,
					last_edited_time: post.lastEditedTime,
					created_time: post.createdTime,
					properties: post.properties,
				})) as NotionPage[];
			}
		} catch {
			// Blob fetch failed, falling back to Notion
		}
	}

	// Fallback to direct Notion API call
	return await getDatabase(databaseId);
}

export default async function Home() {
	const posts = await getPosts();
	const year = new Date().getFullYear();
	const dateOptions: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "long",
	};

	return (
		<div>
			<main className="m-auto max-w-2xl px-4">
				<header className="my-8 mt-16 text-gray-400">
					<Link className="text-xl hover:underline" href="/">
						Martin Kucera
					</Link>
				</header>

				<div className="flex flex-col gap-2">
					{posts.map((post, index) => {
						const date = new Date(post.last_edited_time).toLocaleString(
							"cs-CZ",
							dateOptions,
						);
						const articleNumber = index + 1;
						return (
							<Link
								href={`/${getPageSlug(post)}`}
								key={post.id}
								className="rounded border border-gray-200 p-4 hover:bg-gray-100 transition flex items-center justify-between gap-4 focus:outline focus:outline-2"
							>
								<h3 className="flex items-center gap-2 flex-1 min-w-0">
									<span className="text-sm text-gray-400">
										{articleNumber}.
									</span>
									<Text text={post.properties.Name.title} />
								</h3>
								<p className="text-xs text-gray-400 flex-shrink-0 text-right">
									{date}
								</p>
							</Link>
						);
					})}
				</div>
				<footer className="my-8 text-gray-400 text-sm">&copy; {year}</footer>
			</main>
		</div>
	);
}
