# Umami Analytics Setup Guide

This guide explains how to set up Umami Analytics for the blog with a shareable dashboard for external clients.

## Why Umami?

- **Free tier**: 100,000 events/month, up to 3 websites
- **Privacy-first**: GDPR and CCPA compliant, no cookies required
- **Shareable dashboards**: Generate public links without requiring login
- **Lightweight**: ~1KB script, no impact on page performance

## Option A: Umami Cloud (Recommended)

The easiest approach - no server maintenance required.

### Step 1: Create Account

1. Go to [Umami Cloud Signup](https://cloud.umami.is/signup)
2. Create a free account
3. Verify your email

### Step 2: Add Your Website

1. Log into [Umami Cloud Dashboard](https://cloud.umami.is)
2. Click **Websites** in the sidebar
3. Click **Add website**
4. Enter:
   - **Name**: Martin Kucera Blog (or your preferred name)
   - **Domain**: your-domain.com (without https://)
5. Click **Save**

### Step 3: Get Tracking Code

1. Click **Edit** on your website
2. Go to **Tracking code** section
3. Copy the **Website ID** (UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Step 4: Configure Environment Variables

Add to your `.env.local` file:

```bash
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id-here
```

For Vercel deployment, add this in:
- Vercel Dashboard > Your Project > Settings > Environment Variables

### Step 5: Deploy

The tracking script is already configured in `/pages/_app.js`. Just deploy your changes:

```bash
git add .
git commit -m "feat: add Umami analytics"
git push
```

## Option B: Self-Hosted (Advanced)

For complete data ownership, you can self-host Umami on Vercel with a free PostgreSQL database.

### Prerequisites

- GitHub account
- Vercel account
- Free PostgreSQL database (Supabase or Neon recommended)

### Step 1: Set Up Database

**Using Supabase (Recommended):**

1. Go to [Supabase](https://supabase.com) and create account
2. Create a new project
3. Go to **Settings > Database**
4. Copy the **Connection string** (URI format)
5. Replace `[YOUR-PASSWORD]` with your database password

**Using Neon:**

1. Go to [Neon](https://neon.tech) and create account
2. Create a new project
3. Copy the connection string from the dashboard

### Step 2: Deploy Umami to Vercel

1. Go to [Umami GitHub Repository](https://github.com/umami-software/umami)
2. Click **Fork** to create your own copy
3. Go to [Vercel](https://vercel.com) and click **Add New Project**
4. Import your forked Umami repository
5. Add environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
6. Click **Deploy**

### Step 3: Initial Setup

1. Visit your deployed Umami instance: `https://your-umami.vercel.app`
2. Click **Sign Up** to create admin account
3. Go to **Settings > Account** and change default credentials
4. Add your website and get the tracking code

### Step 4: Update Blog Configuration

```bash
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://your-umami.vercel.app/script.js
```

## Enabling Shareable Dashboard

This is the key feature for sharing analytics with external clients without requiring them to log in.

### Step 1: Access Share Settings

1. Log into your Umami dashboard
2. Click **Websites** in the sidebar
3. Click **Edit** on your website
4. Scroll to **Share URL** section

### Step 2: Create Share Link

1. Click **Add** in the Share URL section
2. Configure what data to share:

   **Traffic (recommended for clients):**
   - Overview
   - Events
   - Sessions
   - Realtime
   - Compare
   - Breakdown

   **Behavior:**
   - Goals
   - Funnels
   - Journeys
   - Retention

   **Growth:**
   - UTM
   - Revenue
   - Attribution

3. Click **Save**
4. Copy the generated Share URL

### Step 3: Share with Clients

The generated URL will look like:
```
https://cloud.umami.is/share/xxxxxxxxxxxxxx/Martin-Kucera-Blog
```

Anyone with this link can view the analytics without logging in. You have full control over what data is visible.

## Vercel Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Yes | Your Umami Website ID (UUID) |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | No | Custom script URL (self-hosted only) |

## Verification

After deployment:

1. Visit your blog
2. Open Umami dashboard
3. Check **Realtime** view - you should see your visit
4. Verify the shareable link works in an incognito window

## Troubleshooting

### No data appearing?

1. Check browser console for script loading errors
2. Verify `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is set correctly
3. Ensure the domain in Umami matches your actual domain
4. Disable ad blockers temporarily to test

### Script blocked by ad blocker?

You can proxy the analytics script through your own domain. Add to `next.config.js`:

```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/stats/:path*',
        destination: 'https://cloud.umami.is/:path*',
      },
    ];
  },
};
```

Then update your script URL:
```bash
NEXT_PUBLIC_UMAMI_SCRIPT_URL=/stats/script.js
```

## Resources

- [Umami Documentation](https://umami.is/docs)
- [Umami Cloud](https://cloud.umami.is)
- [Umami GitHub](https://github.com/umami-software/umami)
- [Next.js Script Component](https://nextjs.org/docs/app/api-reference/components/script)

## Cost Summary

| Option | Cost | Limits |
|--------|------|--------|
| Umami Cloud Free | $0 | 100k events/month, 3 websites, 6 months retention |
| Self-Hosted (Vercel + Supabase) | $0 | Unlimited events, limited by free tier storage |
| Umami Cloud Pro | $20/month | 1M events/month, unlimited websites |
