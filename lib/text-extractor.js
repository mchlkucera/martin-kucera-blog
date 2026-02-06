/**
 * Extracts plain text from Notion blocks for TTS (Text-to-Speech)
 * Skips code blocks, images, dividers, and other non-textual content
 */

/**
 * Extract plain text from rich_text array
 * @param {Array} richText - Notion rich_text array
 * @returns {string} - Plain text content
 */
function extractRichText(richText) {
	if (!richText || !Array.isArray(richText)) {
		return "";
	}
	return richText.map((item) => item.plain_text || "").join("");
}

/**
 * Extract plain text from a single block
 * @param {Object} block - Notion block object
 * @returns {string} - Plain text content
 */
function extractTextFromBlock(block) {
	const { type } = block;
	const value = block[type];

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
			text = extractRichText(value?.rich_text);
			break;

		case "bulleted_list_item":
		case "numbered_list_item":
		case "to_do":
			text = extractRichText(value?.rich_text);
			break;

		case "toggle":
			text = extractRichText(value?.rich_text);
			break;

		case "bulleted_list":
		case "numbered_list":
			// These are wrapper blocks, process children
			if (value?.children) {
				text = value.children
					.map((child) => extractTextFromBlock(child))
					.filter(Boolean)
					.join(" ");
			}
			break;

		case "table":
			// Extract text from table cells
			if (block.children) {
				text = block.children
					.map((row) => {
						if (row.table_row?.cells) {
							return row.table_row.cells
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

		case "column_list":
		case "column":
			if (block.children) {
				text = block.children
					.map((child) => extractTextFromBlock(child))
					.filter(Boolean)
					.join(" ");
			}
			break;

		case "child_page":
			text = value?.title || "";
			break;

		default:
			// Try to extract rich_text if available
			if (value?.rich_text) {
				text = extractRichText(value.rich_text);
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
 * @param {Array} blocks - Array of Notion block objects
 * @returns {string} - Combined plain text content
 */
export function extractTextFromBlocks(blocks) {
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
 * @param {Object} page - Notion page object
 * @returns {string} - Page title
 */
export function extractTitle(page) {
	if (!page?.properties?.Name?.title) {
		return "";
	}
	return extractRichText(page.properties.Name.title);
}
