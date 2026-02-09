import { NextRequest, NextResponse } from "next/server";

// Set max duration to 60 seconds (Vercel Hobby plan limit)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
	// Verify authorization
	const authHeader = request.headers.get("authorization");
	const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

	if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
		return NextResponse.json(
			{ success: false, error: "Unauthorized" },
			{ status: 401 },
		);
	}

	try {
		const body = await request.json();
		const { slug } = body;

		if (!slug) {
			return NextResponse.json(
				{ success: false, error: "Slug is required" },
				{ status: 400 },
			);
		}

		// Get the base URL
		const baseUrl = process.env.VERCEL_URL
			? `https://${process.env.VERCEL_URL}`
			: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

		// Trigger audio generation
		const response = await fetch(`${baseUrl}/api/generate-audio`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.CRON_SECRET}`,
			},
			body: JSON.stringify({ slug }),
		});

		const result = await response.json();

		return NextResponse.json({
			success: response.ok,
			slug,
			...result,
		});
	} catch (error) {
		console.error("Error regenerating audio:", error);
		return NextResponse.json(
			{
				success: false,
				error: (error as Error).message,
			},
			{ status: 500 },
		);
	}
}

// Also support GET for easier manual triggering via URL
export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const slug = searchParams.get("slug");

	if (!slug) {
		return NextResponse.json(
			{ success: false, error: "Slug query parameter is required" },
			{ status: 400 },
		);
	}

	// Create a new request with the slug in the body
	const postRequest = new NextRequest(request.url, {
		method: "POST",
		headers: request.headers,
		body: JSON.stringify({ slug }),
	});

	return POST(postRequest);
}
