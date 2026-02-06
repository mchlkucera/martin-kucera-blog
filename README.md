# Martin Kučera's Blog

Personal blog built with Next.js and Notion as a CMS. All content is written and managed in Notion, then automatically published to the web.

## Tech Stack

- **Next.js 13** - React framework with SSG and ISR
- **Notion API** - Content management and storage
- **Tailwind CSS** - Styling and responsive design
- **Vercel** - Hosting and deployment

## Features

- Articles automatically sorted by creation date (newest first)
- Sequential article numbering
- Responsive design optimized for mobile
- Incremental Static Regeneration (revalidates every second)
- Czech language support

## Local Development

### Prerequisites

- Node.js 20 or higher
- Notion account with API access

### Setup

1. Clone the repository
2. Create a `.env.local` file with your Notion credentials:

```bash
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id
```

To get these values, follow [Notion's getting started guide](https://developers.notion.com/docs/getting-started).

3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the blog.

## Notion Database

The blog content is managed in this Notion database:
https://www.notion.so/f30f2af70c6b4e809af31936989fab56?v=0a3b3a69341441ccbd14f8ccb403b2c4

### Database Schema

- **Name** (title) - Article title
- **Created time** (date) - Publication date (used for sorting)

## Deployment

Deployed on Vercel with automatic deployments from the `master` branch.

## Project Structure

- `pages/index.js` - Homepage with article list
- `pages/[id].js` - Individual article pages
- `lib/notion.js` - Notion API integration
- `styles/globals.css` - Global styles and article typography

## MCP Configuration

This project uses Claude Code's MCP (Model Context Protocol) for enhanced development workflow. The Notion MCP server is configured in `.mcp.json` for direct integration with the Notion API during development.
