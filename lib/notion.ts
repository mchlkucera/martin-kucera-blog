import { Client } from "@notionhq/client";
import type { NotionBlock, NotionPage } from "@/types";

const notion = new Client({
	auth: process.env.NOTION_TOKEN,
});

export const getDatabase = async (
	databaseId: string | undefined,
): Promise<NotionPage[]> => {
	if (!databaseId) {
		throw new Error("Database ID is required");
	}
	const response = await notion.databases.query({
		database_id: databaseId,
		sorts: [
			{
				property: "Created time",
				direction: "ascending",
			},
		],
	});
	return response.results as unknown as NotionPage[];
};

export const getPage = async (pageId: string): Promise<NotionPage> => {
	const response = await notion.pages.retrieve({ page_id: pageId });
	return response as unknown as NotionPage;
};

export const getBlocks = async (blockId: string): Promise<NotionBlock[]> => {
	const normalizedBlockId = blockId.replaceAll("-", "");

	const { results } = await notion.blocks.children.list({
		block_id: normalizedBlockId,
		page_size: 100,
	});

	// Fetches all child blocks recursively - be mindful of rate limits if you have large amounts of nested blocks
	// See https://developers.notion.com/docs/working-with-page-content#reading-nested-blocks
	const childBlocks = results.map(async (block) => {
		const typedBlock = block as NotionBlock;
		if (typedBlock.has_children) {
			const children = await getBlocks(typedBlock.id);
			return { ...typedBlock, children };
		}
		return typedBlock;
	});

	return await Promise.all(childBlocks).then((blocks) => {
		return blocks.reduce<NotionBlock[]>((acc, curr) => {
			if (curr.type === "bulleted_list_item") {
				if (acc[acc.length - 1]?.type === "bulleted_list") {
					const lastBlock = acc[acc.length - 1];
					const listData = lastBlock[lastBlock.type] as {
						children: NotionBlock[];
					};
					listData.children?.push(curr);
				} else {
					acc.push({
						id: getRandomInt(10 ** 99, 10 ** 100).toString(),
						type: "bulleted_list",
						has_children: true,
						bulleted_list: { children: [curr] },
					} as NotionBlock);
				}
			} else if (curr.type === "numbered_list_item") {
				if (acc[acc.length - 1]?.type === "numbered_list") {
					const lastBlock = acc[acc.length - 1];
					const listData = lastBlock[lastBlock.type] as {
						children: NotionBlock[];
					};
					listData.children?.push(curr);
				} else {
					acc.push({
						id: getRandomInt(10 ** 99, 10 ** 100).toString(),
						type: "numbered_list",
						has_children: true,
						numbered_list: { children: [curr] },
					} as NotionBlock);
				}
			} else {
				acc.push(curr);
			}
			return acc;
		}, []);
	});
};

function getRandomInt(min: number, max: number): number {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
