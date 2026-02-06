// Notion API types
export interface NotionRichTextItem {
	type: "text";
	text: {
		content: string;
		link: { url: string } | null;
	};
	annotations: {
		bold: boolean;
		italic: boolean;
		strikethrough: boolean;
		underline: boolean;
		code: boolean;
		color: string;
	};
	plain_text: string;
	href: string | null;
}

export interface NotionPageProperties {
	Name: {
		title: NotionRichTextItem[];
	};
	[key: string]: unknown;
}

export interface NotionPage {
	id: string;
	created_time: string;
	last_edited_time: string;
	properties: NotionPageProperties;
	[key: string]: unknown;
}

export interface NotionBlock {
	id: string;
	type: string;
	has_children: boolean;
	children?: NotionBlock[];
	paragraph?: { rich_text: NotionRichTextItem[] };
	heading_1?: { rich_text: NotionRichTextItem[] };
	heading_2?: { rich_text: NotionRichTextItem[] };
	heading_3?: { rich_text: NotionRichTextItem[] };
	bulleted_list_item?: {
		rich_text: NotionRichTextItem[];
		children?: NotionBlock[];
	};
	numbered_list_item?: {
		rich_text: NotionRichTextItem[];
		children?: NotionBlock[];
	};
	bulleted_list?: { children: NotionBlock[] };
	numbered_list?: { children: NotionBlock[] };
	to_do?: { rich_text: NotionRichTextItem[]; checked: boolean };
	toggle?: { rich_text: NotionRichTextItem[] };
	child_page?: { title: string };
	image?: {
		type: "external" | "file";
		external?: { url: string };
		file?: { url: string };
		caption: NotionRichTextItem[];
	};
	quote?: { rich_text: NotionRichTextItem[] };
	code?: { rich_text: NotionRichTextItem[]; language: string };
	file?: {
		type: "external" | "file";
		external?: { url: string };
		file?: { url: string };
		caption: NotionRichTextItem[];
	};
	bookmark?: { url: string };
	table?: { has_column_header: boolean };
	table_row?: { cells: NotionRichTextItem[][] };
	column_list?: Record<string, unknown>;
	column?: Record<string, unknown>;
	callout?: { rich_text: NotionRichTextItem[] };
	divider?: Record<string, unknown>;
	[key: string]: unknown;
}

// Blog post types
export interface BlogPost {
	id: string;
	slug: string;
	title: string;
	lastEditedTime: string;
	createdTime: string;
	properties: NotionPageProperties;
}

export interface BlogIndex {
	posts: BlogPost[];
	updatedAt: string;
	totalPosts: number;
}

export interface PostMeta {
	slug: string;
	pageId: string;
	contentHash: string;
	title: string;
	lastEditedTime: string;
	createdTime: string;
	syncedAt: string;
	audioStatus: "pending" | "generating" | "ready" | "failed" | "none";
	audioUrl: string | null;
	audioDuration: number | null;
	audioError?: string;
	updatedAt?: string;
}

export interface PostContent {
	page: NotionPage;
	blocks: NotionBlock[];
	fetchedAt: string;
}

// Navigation types
export interface ArticleNavLink {
	slug: string;
	title: string;
}

// Audio types
export interface AudioGenerationResult {
	buffer: Buffer;
	duration: number;
}

// API response types
export interface SyncResult {
	slug: string;
	status: "updated" | "unchanged" | "error";
	error?: string;
}

export interface SyncResponse {
	success: boolean;
	results?: SyncResult[];
	totalPosts?: number;
	syncedAt?: string;
	error?: string;
}

export interface AudioGenerationResponse {
	success: boolean;
	slug: string;
	audioStatus: "ready" | "none" | "failed";
	audioUrl?: string;
	audioDuration?: number;
	message?: string;
	error?: string;
}

// Component props
export interface AudioPlayerProps {
	audioUrl: string;
	audioDuration?: number;
}

export interface TextProps {
	text: NotionRichTextItem[] | null | undefined;
}
