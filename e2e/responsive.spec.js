// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Responsive Design - Mobile (375px)", () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test("home page renders correctly on mobile", async ({ page }) => {
		await page.goto("/");

		// Verify header is visible
		const header = page.locator("header");
		await expect(header).toBeVisible();
		await expect(header).toContainText("Martin Kučera");

		// Verify articles are visible
		const firstArticle = page.locator("main > div > a").first();
		await expect(firstArticle).toBeVisible();

		// Verify footer is visible
		const footer = page.locator("footer");
		await expect(footer).toBeVisible();

		// Verify main content has horizontal padding on mobile
		const main = page.locator("main");
		await expect(main).toHaveClass(/px-4/);
	});

	test("article cards are properly sized on mobile", async ({ page }) => {
		await page.goto("/");

		const firstArticle = page.locator("main > div > a").first();
		await expect(firstArticle).toBeVisible();

		// Get the bounding box of the article card
		const boundingBox = await firstArticle.boundingBox();
		expect(boundingBox).toBeTruthy();

		// Article card should fit within the viewport (with some padding)
		expect(boundingBox.width).toBeLessThanOrEqual(375 - 32); // Account for px-4 (16px each side)
	});

	test("article page renders correctly on mobile", async ({ page }) => {
		// Navigate to an article
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Verify article elements are visible
		const backLink = page.locator('a:has-text("Zpět")');
		await expect(backLink).toBeVisible();

		const articleTitle = page.locator("article h1");
		await expect(articleTitle).toBeVisible();

		const articleSection = page.locator("article section");
		await expect(articleSection).toBeVisible();
	});

	test("navigation is usable on mobile", async ({ page }) => {
		// Navigate to home
		await page.goto("/");

		// Click on article
		const firstArticle = page.locator("main > div > a").first();
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Navigate back using back link
		const backLink = page.locator('a:has-text("Zpět")');
		await Promise.all([page.waitForURL("/"), backLink.click()]);

		// Verify we're back on home
		await expect(page).toHaveURL("/");
	});
});

test.describe("Responsive Design - Desktop (1280px)", () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test("home page renders correctly on desktop", async ({ page }) => {
		await page.goto("/");

		// Verify header is visible
		const header = page.locator("header");
		await expect(header).toBeVisible();
		await expect(header).toContainText("Martin Kučera");

		// Verify articles are visible
		const firstArticle = page.locator("main > div > a").first();
		await expect(firstArticle).toBeVisible();

		// Verify footer is visible
		const footer = page.locator("footer");
		await expect(footer).toBeVisible();

		// Verify main content has max-width constraint
		const main = page.locator("main");
		await expect(main).toHaveClass(/max-w-2xl/);
	});

	test("main content is centered on desktop", async ({ page }) => {
		await page.goto("/");

		const main = page.locator("main");
		await expect(main).toBeVisible();

		// Verify auto margins for centering
		await expect(main).toHaveClass(/m-auto/);
	});

	test("article cards maintain proper layout on desktop", async ({ page }) => {
		await page.goto("/");

		const articleContainer = page.locator("main > div").first();
		await expect(articleContainer).toBeVisible();

		// Verify flex layout
		await expect(articleContainer).toHaveClass(/flex/);
		await expect(articleContainer).toHaveClass(/flex-col/);
	});

	test("article page renders correctly on desktop", async ({ page }) => {
		// Navigate to an article
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Verify article elements are visible
		const backLink = page.locator('a:has-text("Zpět")');
		await expect(backLink).toBeVisible();

		const articleTitle = page.locator("article h1");
		await expect(articleTitle).toBeVisible();

		const articleSection = page.locator("article section");
		await expect(articleSection).toBeVisible();

		// Verify main content has max-width
		const main = page.locator("main");
		await expect(main).toHaveClass(/max-w-2xl/);
	});

	test("article page content is readable width on desktop", async ({
		page,
	}) => {
		// Navigate to an article
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Get main container bounding box
		const main = page.locator("main");
		const boundingBox = await main.boundingBox();
		expect(boundingBox).toBeTruthy();

		// max-w-2xl is 672px (42rem), so content should not exceed that
		expect(boundingBox.width).toBeLessThanOrEqual(672);
	});
});

test.describe("Responsive Design - Tablet (768px)", () => {
	test.use({ viewport: { width: 768, height: 1024 } });

	test("home page renders correctly on tablet", async ({ page }) => {
		await page.goto("/");

		// Verify all main elements are visible
		const header = page.locator("header");
		await expect(header).toBeVisible();

		const firstArticle = page.locator("main > div > a").first();
		await expect(firstArticle).toBeVisible();

		const footer = page.locator("footer");
		await expect(footer).toBeVisible();
	});

	test("article page renders correctly on tablet", async ({ page }) => {
		// Navigate to an article
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Verify all main elements are visible
		const backLink = page.locator('a:has-text("Zpět")');
		await expect(backLink).toBeVisible();

		const articleTitle = page.locator("article h1");
		await expect(articleTitle).toBeVisible();

		const articleSection = page.locator("article section");
		await expect(articleSection).toBeVisible();
	});
});
