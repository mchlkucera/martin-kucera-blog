import Link from "next/link";
import { getDatabase } from "@/lib/notion";
import { databaseId, getPageSlug } from "@/lib/utils";
import type { NotionRichTextItem } from "@/types";

// Revalidate every 10 minutes — content changes ~monthly
export const revalidate = 600;

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

export default async function Home() {
	const posts = await getDatabase(databaseId);
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
