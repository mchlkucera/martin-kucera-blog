import Link from "next/link";
import { Fragment } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import { getBlocks, getDatabase, getPage } from "@/lib/notion";
import { BLOB_URL, databaseId, getPageSlug } from "@/lib/utils";
import type {
	ArticleNavLink,
	NotionBlock,
	NotionPage,
	NotionRichTextItem,
	PostContent,
	PostMeta,
} from "@/types";
import styles from "./post.module.css";

// Revalidate every 60 seconds
export const revalidate = 60;

// Generate static params for all posts
export async function generateStaticParams() {
	const database = await getDatabase(databaseId);
	return [
		...database.map((page) => ({ slug: page.id })),
		...database.map((page) => ({ slug: getPageSlug(page) })),
	];
}

function Text({ text }: { text: NotionRichTextItem[] | null | undefined }) {
	if (!text) {
		return null;
	}
	return (
		<>
			{text.map((value) => {
				const {
					annotations: { bold, code, color, italic, strikethrough, underline },
					text: textContent,
				} = value;
				return (
					<span
						className={[
							bold ? styles.bold : "",
							code ? styles.code : "",
							italic ? styles.italic : "",
							strikethrough ? styles.strikethrough : "",
							underline ? styles.underline : "",
						].join(" ")}
						style={color !== "default" ? { color } : {}}
						key={textContent.content}
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

function renderNestedList(block: NotionBlock): React.ReactNode {
	const { type } = block;
	const value = block[type] as { children?: NotionBlock[] } | undefined;
	if (!value?.children) return null;

	const isNumberedList = value.children[0]?.type === "numbered_list_item";

	if (isNumberedList) {
		return <ol>{value.children.map((child) => renderBlock(child))}</ol>;
	}
	return <ul>{value.children.map((child) => renderBlock(child))}</ul>;
}

function renderBlock(block: NotionBlock): React.ReactNode {
	const { type, id } = block;
	const value = block[type] as Record<string, unknown> | undefined;

	switch (type) {
		case "paragraph":
			return (
				<p key={id}>
					<Text
						text={(value as { rich_text?: NotionRichTextItem[] })?.rich_text}
					/>
				</p>
			);
		case "heading_1":
			return (
				<h1 key={id}>
					<Text
						text={(value as { rich_text?: NotionRichTextItem[] })?.rich_text}
					/>
				</h1>
			);
		case "heading_2":
			return (
				<h2 key={id}>
					<Text
						text={(value as { rich_text?: NotionRichTextItem[] })?.rich_text}
					/>
				</h2>
			);
		case "heading_3":
			return (
				<h3 key={id}>
					<Text
						text={(value as { rich_text?: NotionRichTextItem[] })?.rich_text}
					/>
				</h3>
			);
		case "bulleted_list": {
			const listValue = value as { children?: NotionBlock[] } | undefined;
			return (
				<ul key={id}>
					{listValue?.children?.map((child) => renderBlock(child))}
				</ul>
			);
		}
		case "numbered_list": {
			const listValue = value as { children?: NotionBlock[] } | undefined;
			return (
				<ol key={id}>
					{listValue?.children?.map((child) => renderBlock(child))}
				</ol>
			);
		}
		case "bulleted_list_item":
		case "numbered_list_item": {
			const itemValue = value as {
				rich_text?: NotionRichTextItem[];
				children?: NotionBlock[];
			};
			return (
				<li key={id}>
					<Text text={itemValue?.rich_text} />
					{itemValue?.children && renderNestedList(block)}
				</li>
			);
		}
		case "to_do": {
			const todoValue = value as {
				rich_text?: NotionRichTextItem[];
				checked?: boolean;
			};
			return (
				<div key={id}>
					<label htmlFor={id}>
						<input
							type="checkbox"
							id={id}
							defaultChecked={todoValue?.checked}
						/>{" "}
						<Text text={todoValue?.rich_text} />
					</label>
				</div>
			);
		}
		case "toggle": {
			const toggleValue = value as { rich_text?: NotionRichTextItem[] };
			return (
				<details key={id}>
					<summary>
						<Text text={toggleValue?.rich_text} />
					</summary>
					{block.children?.map((child) => (
						<Fragment key={child.id}>{renderBlock(child)}</Fragment>
					))}
				</details>
			);
		}
		case "child_page": {
			const childPageValue = value as { title?: string };
			return (
				<div key={id} className={styles.childPage}>
					<strong>{childPageValue?.title}</strong>
					{block.children?.map((child) => renderBlock(child))}
				</div>
			);
		}
		case "image": {
			const imageValue = value as {
				type: "external" | "file";
				external?: { url: string };
				file?: { url: string };
				caption?: NotionRichTextItem[];
			};
			const src =
				imageValue?.type === "external"
					? imageValue.external?.url
					: imageValue?.file?.url;
			const caption = imageValue?.caption?.[0]?.plain_text || "";
			return (
				<figure key={id}>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={src} alt={caption} />
					{caption && <figcaption>{caption}</figcaption>}
				</figure>
			);
		}
		case "divider":
			return <hr key={id} />;
		case "quote": {
			const quoteValue = value as { rich_text?: NotionRichTextItem[] };
			return (
				<blockquote key={id}>
					{quoteValue?.rich_text?.[0]?.plain_text}
				</blockquote>
			);
		}
		case "code": {
			const codeValue = value as { rich_text?: NotionRichTextItem[] };
			return (
				<pre key={id} className={styles.pre}>
					<code className={styles.code_block}>
						{codeValue?.rich_text?.[0]?.plain_text}
					</code>
				</pre>
			);
		}
		case "file": {
			const fileValue = value as {
				type: "external" | "file";
				external?: { url: string };
				file?: { url: string };
				caption?: NotionRichTextItem[];
			};
			const srcFile =
				fileValue?.type === "external"
					? fileValue.external?.url
					: fileValue?.file?.url;
			const splitSourceArray = srcFile?.split("/") || [];
			const lastElementInArray =
				splitSourceArray[splitSourceArray.length - 1] || "";
			const captionFile = fileValue?.caption?.[0]?.plain_text || "";
			return (
				<figure key={id}>
					<div className={styles.file}>
						{/* File icon */}
						<Link href={srcFile || "#"} passHref>
							{lastElementInArray.split("?")[0]}
						</Link>
					</div>
					{captionFile && <figcaption>{captionFile}</figcaption>}
				</figure>
			);
		}
		case "bookmark": {
			const bookmarkValue = value as { url?: string };
			const href = bookmarkValue?.url;
			return (
				<a
					key={id}
					href={href}
					target="_blank"
					className={styles.bookmark}
					rel="noreferrer"
				>
					{href}
				</a>
			);
		}
		case "table": {
			const tableValue = value as { has_column_header?: boolean };
			return (
				<table key={id} className={styles.table}>
					<tbody>
						{block.children?.map((child, i) => {
							const RowElement =
								tableValue?.has_column_header && i === 0 ? "th" : "td";
							return (
								<tr key={child.id}>
									{child.table_row?.cells?.map((cell, cellIndex) => {
										return (
											<RowElement key={`${child.id}-cell-${cellIndex}`}>
												<Text text={cell} />
											</RowElement>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			);
		}
		case "column_list": {
			return (
				<div key={id} className={styles.row}>
					{block.children?.map((child) => renderBlock(child))}
				</div>
			);
		}
		case "column": {
			return (
				<div key={id}>{block.children?.map((child) => renderBlock(child))}</div>
			);
		}
		default:
			return (
				<span key={id}>
					Unsupported block (
					{type === "unsupported" ? "unsupported by Notion API" : type})
				</span>
			);
	}
}

interface PostData {
	page: NotionPage | null;
	blocks: NotionBlock[] | null;
	audioUrl: string | null;
	audioDuration: number | null;
	previousArticle: ArticleNavLink | null;
	nextArticle: ArticleNavLink | null;
}

async function getPostData(slug: string): Promise<PostData> {
	let page: NotionPage | null = null;
	let blocks: NotionBlock[] | null = null;
	let audioUrl: string | null = null;
	let audioDuration: number | null = null;
	let previousArticle: ArticleNavLink | null = null;
	let nextArticle: ArticleNavLink | null = null;

	try {
		// Get database for navigation (needed for both blob and Notion paths)
		const database = await getDatabase(databaseId);

		// Find current article index
		const currentIndex = database.findIndex((p) => {
			return p.id === slug || getPageSlug(p) === slug;
		});

		// Set previous and next articles
		if (currentIndex > 0) {
			const prev = database[currentIndex - 1];
			previousArticle = {
				slug: getPageSlug(prev),
				title: prev.properties.Name.title[0]?.plain_text || "",
			};
		}
		if (currentIndex !== -1 && currentIndex < database.length - 1) {
			const next = database[currentIndex + 1];
			nextArticle = {
				slug: getPageSlug(next),
				title: next.properties.Name.title[0]?.plain_text || "",
			};
		}

		// Try fetching from Blob storage first
		if (BLOB_URL) {
			try {
				const [contentRes, metaRes] = await Promise.all([
					fetch(`${BLOB_URL}/blog/posts/${slug}/content.json`, {
						next: { revalidate: 60 },
					}),
					fetch(`${BLOB_URL}/blog/posts/${slug}/meta.json`, {
						next: { revalidate: 60 },
					}),
				]);

				if (contentRes.ok) {
					const content: PostContent = await contentRes.json();
					page = content.page;
					blocks = content.blocks;
				}

				if (metaRes.ok) {
					const meta: PostMeta = await metaRes.json();
					// Show audio if URL exists, regardless of status (e.g., "failed" regeneration but old audio still works)
				if (meta.audioUrl) {
						audioUrl = meta.audioUrl;
						audioDuration = meta.audioDuration;
					}
				}
			} catch {
				// Blob fetch failed, falling back to Notion
			}
		}

		// Fallback to direct Notion API call
		if (!page || !blocks) {
			const foundPostSlug = database.find((p) => {
				return getPageSlug(p) === slug;
			});

			let pageId = slug;
			if (foundPostSlug) pageId = foundPostSlug.id;
			page = await getPage(pageId);
			blocks = await getBlocks(pageId);
		}
	} catch {
		// Return null values on error
	}

	return {
		page,
		blocks,
		audioUrl,
		audioDuration,
		previousArticle,
		nextArticle,
	};
}

export default async function Post({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const {
		page,
		blocks,
		audioUrl,
		audioDuration,
		previousArticle,
		nextArticle,
	} = await getPostData(slug);
	const year = new Date().getFullYear();

	if (!page || !blocks) {
		return (
			<div>
				<main className="max-w-2xl mx-auto px-4">
					<Link
						href="/"
						className="w-max flex items-center my-6 md:my-12 md:mt-16 relative text-gray-400"
					>
						<div className="relative mr-8 hover:underline transition">
							&larr; Zpet na seznam
						</div>
						<h1 className="text-xl hover:underline">Martin Kucera</h1>
					</Link>
					<div>Clanek nenalezen. Byl bud prejmenovan nebo odstranen.</div>
				</main>
			</div>
		);
	}

	return (
		<div>
			<main className="max-w-2xl mx-auto px-4">
				<Link
					href="/"
					className="w-max flex items-center my-6 md:my-12 md:mt-16 relative text-gray-400"
				>
					<div className="relative mr-8 hover:underline transition">
						&larr; Zpet
					</div>
					<h1 className="text-xl hover:underline">Martin Kucera</h1>
				</Link>

				<article className="article">
					<h1 className="text-xl !my-8 font-medium">
						<Text text={page.properties.Name.title} />
					</h1>
					{audioUrl && (
						<AudioPlayer
							audioUrl={audioUrl}
							audioDuration={audioDuration ?? undefined}
						/>
					)}
					<section>
						{blocks.map((block) => (
							<Fragment key={block.id}>{renderBlock(block)}</Fragment>
						))}
					</section>
				</article>

				{/* Article Navigation */}
				{(previousArticle || nextArticle) && (
					<nav className="flex justify-between items-stretch gap-4 my-8 pt-8 border-t border-gray-200">
						{previousArticle ? (
							<Link
								href={`/${previousArticle.slug}`}
								className="flex-1 p-4 rounded border border-gray-200 hover:bg-gray-100 transition text-left"
							>
								<span className="text-xs text-gray-400 block mb-1">
									Predchozi
								</span>
								<span className="text-gray-700">{previousArticle.title}</span>
							</Link>
						) : (
							<div className="flex-1" />
						)}
						{nextArticle ? (
							<Link
								href={`/${nextArticle.slug}`}
								className="flex-1 p-4 rounded border border-gray-200 hover:bg-gray-100 transition text-right"
							>
								<span className="text-xs text-gray-400 block mb-1">Dalsi</span>
								<span className="text-gray-700">{nextArticle.title}</span>
							</Link>
						) : (
							<div className="flex-1" />
						)}
					</nav>
				)}

				<div>
					<footer className="my-8 text-gray-400 text-sm">&copy; {year}</footer>
				</div>
			</main>
		</div>
	);
}
