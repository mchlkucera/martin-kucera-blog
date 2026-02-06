/**
 * Extracts plain text from Notion blocks for TTS (Text-to-Speech)
 * Skips code blocks, images, dividers, and other non-textual content
 */

import type { NotionBlock, NotionPage, NotionRichTextItem } from "@/types";

/**
 * Extract plain text from rich_text array
 */
function extractRichText(richText: NotionRichTextItem[] | undefined): string {
	if (!richText || !Array.isArray(richText)) {
		return "";
	}
	return richText.map((item) => item.plain_text || "").join("");
}

/**
 * Extract plain text from a single block
 */
function extractTextFromBlock(block: NotionBlock): string {
	const { type } = block;
	const value = block[type] as Record<string, unknown> | undefined;

	// Skip blocks that shouldn't be read aloud
	const skipTypes = [
		"code",
		"image",
		"divider",
		"file",
		"bookmark",
		"embed",
		"video",
		"audio",
		"pdf",
		"table_of_contents",
		"breadcrumb",
		"equation",
		"link_preview",
		"synced_block",
		"template",
		"link_to_page",
		"unsupported",
	];

	if (skipTypes.includes(type)) {
		return "";
	}

	let text = "";

	switch (type) {
		case "paragraph":
		case "heading_1":
		case "heading_2":
		case "heading_3":
		case "quote":
		case "callout":
			text = extractRichText(
				value?.rich_text as NotionRichTextItem[] | undefined,
			);
			break;

		case "bulleted_list_item":
		case "numbered_list_item":
		case "to_do":
			text = extractRichText(
				value?.rich_text as NotionRichTextItem[] | undefined,
			);
			break;

		case "toggle":
			text = extractRichText(
				value?.rich_text as NotionRichTextItem[] | undefined,
			);
			break;

		case "bulleted_list":
		case "numbered_list": {
			// These are wrapper blocks, process children
			const listChildren = value?.children as NotionBlock[] | undefined;
			if (listChildren) {
				text = listChildren
					.map((child) => extractTextFromBlock(child))
					.filter(Boolean)
					.join(" ");
			}
			break;
		}

		case "table": {
			// Extract text from table cells
			if (block.children) {
				text = block.children
					.map((row) => {
						const tableRow = row.table_row;
						if (tableRow?.cells) {
							return tableRow.cells
								.map((cell) => extractRichText(cell))
								.filter(Boolean)
								.join(", ");
						}
						return "";
					})
					.filter(Boolean)
					.join(". ");
			}
			break;
		}

		case "column_list":
		case "column":
			if (block.children) {
				text = block.children
					.map((child) => extractTextFromBlock(child))
					.filter(Boolean)
					.join(" ");
			}
			break;

		case "child_page": {
			const childPage = value as { title?: string } | undefined;
			text = childPage?.title || "";
			break;
		}

		default: {
			// Try to extract rich_text if available
			const defaultValue = value as
				| { rich_text?: NotionRichTextItem[] }
				| undefined;
			if (defaultValue?.rich_text) {
				text = extractRichText(defaultValue.rich_text);
			}
		}
	}

	// Recursively process nested children
	if (
		block.children &&
		![
			"bulleted_list",
			"numbered_list",
			"table",
			"column_list",
			"column",
		].includes(type)
	) {
		const childText = block.children
			.map((child) => extractTextFromBlock(child))
			.filter(Boolean)
			.join(" ");
		if (childText) {
			text = text ? `${text} ${childText}` : childText;
		}
	}

	return text.trim();
}

/**
 * Extract all plain text from an array of Notion blocks
 */
export function extractTextFromBlocks(blocks: NotionBlock[]): string {
	if (!blocks || !Array.isArray(blocks)) {
		return "";
	}

	const textParts = blocks
		.map((block) => extractTextFromBlock(block))
		.filter((text) => text && text.trim().length > 0);

	// Join with periods to ensure proper sentence separation
	let result = textParts.join(". ");

	// Clean up multiple spaces and periods
	result = result
		.replace(/\s+/g, " ")
		.replace(/\.+/g, ".")
		.replace(/\.\s*\./g, ".")
		.trim();

	// Ensure text ends with proper punctuation
	if (result && !result.match(/[.!?]$/)) {
		result += ".";
	}

	return result;
}

/**
 * Extract title from a Notion page
 */
export function extractTitle(page: NotionPage): string {
	if (!page?.properties?.Name?.title) {
		return "";
	}
	return extractRichText(page.properties.Name.title);
}
