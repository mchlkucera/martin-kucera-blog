import type { NotionPage } from "@/types";

/**
 * Generate a URL-friendly slug from a Notion page
 */
export function getPageSlug(page: NotionPage): string {
	const title = page.properties.Name.title[0]?.plain_text || "";
	const convertedString = title
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s/g, "-");
	return convertedString;
}

export const databaseId = process.env.NOTION_DATABASE_ID;
// R2 public URL for serving files (replaces Vercel Blob)
export const BLOB_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
