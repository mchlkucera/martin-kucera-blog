import Head from "next/head";
import Link from "next/link";
import { getDatabase } from "../lib/notion";
import { getPageSlug, Text } from "./[id].js";

export const databaseId = process.env.NOTION_DATABASE_ID;
const BLOB_URL = process.env.NEXT_PUBLIC_BLOB_URL;

export default function Home({ posts }) {
	const year = new Date().getFullYear();
	const dateOptions = {
		year: "numeric",
		month: "long",
	};

	return (
		<div>
			<Head>
				<title>Martin Kučera</title>
				<link rel="icon" href="/favicon.ico" />
			</Head>

			<main className="m-auto max-w-2xl px-4">
				<header className="my-8 mt-16 text-gray-400">
					<Link className="text-xl hover:underline" href="/">
						Martin Kučera
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

export const getStaticProps = async () => {
	let posts = null;

	// Try fetching from Blob storage first
	if (BLOB_URL) {
		try {
			const response = await fetch(`${BLOB_URL}/blog/index.json`);
			if (response.ok) {
				const data = await response.json();
				// Transform blob index format to match Notion format
				posts = data.posts.map((post) => ({
					id: post.id,
					last_edited_time: post.lastEditedTime,
					created_time: post.createdTime,
					properties: post.properties,
				}));
			}
		} catch {
			// Blob fetch failed, falling back to Notion
		}
	}

	// Fallback to direct Notion API call
	if (!posts) {
		posts = await getDatabase(databaseId);
	}

	return {
		props: {
			posts,
		},
		revalidate: 60,
	};
};
