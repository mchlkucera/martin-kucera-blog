// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Article Page", () => {
	test("page loads from home page navigation", async ({ page }) => {
		// Start from home page
		await page.goto("/");

		// Click on first article
		const firstArticle = page.locator("main > div > a").first();
		await expect(firstArticle).toBeVisible();

		// Get the href for later verification
		const articleHref = await firstArticle.getAttribute("href");

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Verify we're on the article page
		await expect(page).toHaveURL(articleHref);

		// Verify page title contains "Martin Kučera"
		const pageTitle = await page.title();
		expect(pageTitle).toContain("Martin Kučera");
	});

	test('back link "Zpět" works and returns to home', async ({ page }) => {
		// Navigate to an article first
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Find and click the back link
		const backLink = page.locator('a:has-text("Zpět")');
		await expect(backLink).toBeVisible();

		// Click back and wait for navigation
		await Promise.all([page.waitForURL("/"), backLink.click()]);

		// Verify we're back on home page
		await expect(page).toHaveURL("/");
	});

	test("article title is displayed", async ({ page }) => {
		// Navigate to an article
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Verify article title is visible (h1 inside article)
		const articleTitle = page.locator("article h1");
		await expect(articleTitle).toBeVisible();

		const titleText = await articleTitle.textContent();
		expect(titleText.length).toBeGreaterThan(0);
	});

	test("article content is rendered", async ({ page }) => {
		// Navigate to an article
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Verify article section exists
		const articleSection = page.locator("article section");
		await expect(articleSection).toBeVisible();
	});

	test('header link "Martin Kučera" navigates back to home', async ({
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

		// Find and click the Martin Kučera header link
		const headerLink = page.locator('a:has-text("Martin Kučera")');
		await expect(headerLink).toBeVisible();

		// Click and wait for navigation
		await Promise.all([page.waitForURL("/"), headerLink.click()]);

		// Verify we're back on home page
		await expect(page).toHaveURL("/");
	});

	test("article page has footer with copyright", async ({ page }) => {
		// Navigate to an article
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Verify footer is visible
		const footer = page.locator("footer");
		await expect(footer).toBeVisible();

		// Check for copyright symbol and current year
		const currentYear = new Date().getFullYear().toString();
		await expect(footer).toContainText(currentYear);
	});

	test("article page has correct page structure", async ({ page }) => {
		// Navigate to an article
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Verify main container
		const main = page.locator("main");
		await expect(main).toBeVisible();
		await expect(main).toHaveClass(/max-w-2xl/);

		// Verify article element exists
		const article = page.locator("article");
		await expect(article).toBeVisible();
	});
});
