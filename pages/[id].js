import Head from "next/head";
import Link from "next/link";
import { Fragment } from "react";
import AudioPlayer from "../components/AudioPlayer";
import { getBlocks, getDatabase, getPage } from "../lib/notion";
import { databaseId } from "./index.js";
import styles from "./post.module.css";

const BLOB_URL = process.env.NEXT_PUBLIC_BLOB_URL;

export const Text = ({ text }) => {
	if (!text) {
		return null;
	}
	return text.map((value) => {
		const {
			annotations: { bold, code, color, italic, strikethrough, underline },
			text,
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
				key={text.content}
			>
				{text.link ? <a href={text.link.url}>{text.content}</a> : text.content}
			</span>
		);
	});
};

const renderNestedList = (block) => {
	const { type } = block;
	const value = block[type];
	if (!value) return null;

	const isNumberedList = value.children[0].type === "numbered_list_item";

	if (isNumberedList) {
		return <ol>{value.children.map((block) => renderBlock(block))}</ol>;
	}
	return <ul>{value.children.map((block) => renderBlock(block))}</ul>;
};

const renderBlock = (block) => {
	const { type, id } = block;
	const value = block[type];

	switch (type) {
		case "paragraph":
			return (
				<p>
					<Text text={value.rich_text} />
				</p>
			);
		case "heading_1":
			return (
				<h1>
					<Text text={value.rich_text} />
				</h1>
			);
		case "heading_2":
			return (
				<h2>
					<Text text={value.rich_text} />
				</h2>
			);
		case "heading_3":
			return (
				<h3>
					<Text text={value.rich_text} />
				</h3>
			);
		case "bulleted_list": {
			return <ul>{value.children.map((child) => renderBlock(child))}</ul>;
		}
		case "numbered_list": {
			return <ol>{value.children.map((child) => renderBlock(child))}</ol>;
		}
		case "bulleted_list_item":
		case "numbered_list_item":
			return (
				<li key={block.id}>
					<Text text={value.rich_text} />
					{!!value.children && renderNestedList(block)}
				</li>
			);
		case "to_do":
			return (
				<div>
					<label htmlFor={id}>
						<input type="checkbox" id={id} defaultChecked={value.checked} />{" "}
						<Text text={value.rich_text} />
					</label>
				</div>
			);
		case "toggle":
			return (
				<details>
					<summary>
						<Text text={value.rich_text} />
					</summary>
					{block.children?.map((child) => (
						<Fragment key={child.id}>{renderBlock(child)}</Fragment>
					))}
				</details>
			);
		case "child_page":
			return (
				<div className={styles.childPage}>
					<strong>{value.title}</strong>
					{block.children.map((child) => renderBlock(child))}
				</div>
			);
		case "image": {
			const src =
				value.type === "external" ? value.external.url : value.file.url;
			const caption = value.caption ? value.caption[0]?.plain_text : "";
			return (
				<figure>
					<img src={src} alt={caption} />
					{caption && <figcaption>{caption}</figcaption>}
				</figure>
			);
		}
		case "divider":
			return <hr key={id} />;
		case "quote":
			return <blockquote key={id}>{value.rich_text[0].plain_text}</blockquote>;
		case "code":
			return (
				<pre className={styles.pre}>
					<code className={styles.code_block} key={id}>
						{value.rich_text[0].plain_text}
					</code>
				</pre>
			);
		case "file": {
			const src_file =
				value.type === "external" ? value.external.url : value.file.url;
			const splitSourceArray = src_file.split("/");
			const lastElementInArray = splitSourceArray[splitSourceArray.length - 1];
			const caption_file = value.caption ? value.caption[0]?.plain_text : "";
			return (
				<figure>
					<div className={styles.file}>
						📎{" "}
						<Link href={src_file} passHref>
							{lastElementInArray.split("?")[0]}
						</Link>
					</div>
					{caption_file && <figcaption>{caption_file}</figcaption>}
				</figure>
			);
		}
		case "bookmark": {
			const href = value.url;
			return (
				<a href={href} target="_brank" className={styles.bookmark}>
					{href}
				</a>
			);
		}
		case "table": {
			return (
				<table className={styles.table}>
					<tbody>
						{block.children?.map((child, i) => {
							const RowElement =
								value.has_column_header && i === 0 ? "th" : "td";
							return (
								<tr key={child.id}>
									{child.table_row?.cells?.map((cell, i) => {
										return (
											<RowElement key={`${cell.plain_text}-${i}`}>
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
				<div className={styles.row}>
					{block.children.map((block) => renderBlock(block))}
				</div>
			);
		}
		case "column": {
			return <div>{block.children.map((child) => renderBlock(child))}</div>;
		}
		default:
			return `❌ Unsupported block (${
				type === "unsupported" ? "unsupported by Notion API" : type
			})`;
	}
};

export default function Post({ page, blocks, audioUrl, audioDuration }) {
	const year = new Date().getFullYear();

	if (!page || !blocks) {
		return (
			<div>
				<Head>
					<title>Martin Kučera</title>
					<link rel="icon" href="/favicon.ico" />
				</Head>
				<main className="max-w-2xl mx-auto px-4">
					<Link
						href="/"
						className="w-max flex items-center my-6 md:my-12 md:mt-16 relative text-gray-400"
					>
						<div className="relative mr-8 hover:underline transition">
							← Zpět na seznam
						</div>
						<h1 className="text-xl hover:underline">Martin Kučera</h1>
					</Link>
					<div>Článek nenalezen. Byl buď přejmenován neb odstraněn.</div>
				</main>
			</div>
		);
	}

	return (
		<div>
			<Head>
				<title>Martin Kučera: {page.properties.Name.title[0].plain_text}</title>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<main className="max-w-2xl mx-auto px-4">
				<Link
					href="/"
					className="w-max flex items-center my-6 md:my-12 md:mt-16 relative text-gray-400"
				>
					<div className="relative mr-8 hover:underline transition">← Zpět</div>
					<h1 className="text-xl hover:underline">Martin Kučera</h1>
				</Link>

				<article className="article">
					<h1 className="text-xl !my-8 font-medium">
						<Text text={page.properties.Name.title} />
					</h1>
					{audioUrl && (
						<AudioPlayer audioUrl={audioUrl} audioDuration={audioDuration} />
					)}
					<section className="">
						{blocks.map((block) => (
							<Fragment key={block.id}>{renderBlock(block)}</Fragment>
						))}
					</section>
				</article>
				<div>
					<footer className="my-8 text-gray-400 text-sm">&copy; {year}</footer>
				</div>
			</main>
		</div>
	);
}

export const getStaticPaths = async () => {
	const database = await getDatabase(databaseId);
	return {
		paths: [
			...database.map((page) => ({ params: { id: page.id } })),
			...database.map((page) => ({ params: { id: getPageSlug(page) } })),
		],
		fallback: true,
	};
};

export function getPageSlug(page) {
	const title = page.properties.Name.title[0].plain_text;
	const convertedString = title
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s/g, "-");
	return convertedString;
}

export const getStaticProps = async (context) => {
	try {
		const { id } = context.params;
		let page = null;
		let blocks = null;
		let audioUrl = null;
		let audioDuration = null;

		// Try fetching from Blob storage first
		if (BLOB_URL) {
			try {
				const [contentRes, metaRes] = await Promise.all([
					fetch(`${BLOB_URL}/blog/posts/${id}/content.json`),
					fetch(`${BLOB_URL}/blog/posts/${id}/meta.json`),
				]);

				if (contentRes.ok) {
					const content = await contentRes.json();
					page = content.page;
					blocks = content.blocks;
				}

				if (metaRes.ok) {
					const meta = await metaRes.json();
					if (meta.audioStatus === "ready" && meta.audioUrl) {
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
			const database = await getDatabase(databaseId);

			const foundPostSlug = database.find((page) => {
				return getPageSlug(page) === id;
			});

			let pageId = id;
			if (foundPostSlug) pageId = foundPostSlug.id;
			page = await getPage(pageId);
			blocks = await getBlocks(pageId);
		}

		return {
			props: {
				page,
				blocks,
				audioUrl,
				audioDuration,
			},
			revalidate: 60,
		};
	} catch {
		return {
			props: {
				page: null,
				blocks: null,
				audioUrl: null,
				audioDuration: null,
			},
			revalidate: 60,
		};
	}
};
