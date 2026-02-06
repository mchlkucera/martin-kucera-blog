// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Navigation Flow", () => {
	test("complete user journey: home -> article -> back to home", async ({
		page,
	}) => {
		// Step 1: Start at home page
		await page.goto("/");
		await expect(page).toHaveTitle("Martin Kučera");

		// Step 2: Verify home page content
		const header = page.locator("header");
		await expect(header).toContainText("Martin Kučera");

		// Step 3: Click on an article
		const firstArticle = page.locator("main > div > a").first();
		const articleHref = await firstArticle.getAttribute("href");

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Step 4: Verify we're on the article page
		await expect(page).toHaveURL(articleHref);

		// Step 5: Verify article page content
		const articleTitle = page.locator("article h1");
		await expect(articleTitle).toBeVisible();

		// Step 6: Navigate back using back link
		const backLink = page.locator('a:has-text("Zpět")');
		await Promise.all([page.waitForURL("/"), backLink.click()]);

		// Step 7: Verify we're back on home page
		await expect(page).toHaveURL("/");
		await expect(header).toContainText("Martin Kučera");
	});

	test("navigate to multiple articles", async ({ page }) => {
		await page.goto("/");

		// Get the number of articles
		const articleCards = page.locator("main > div > a");
		const count = await articleCards.count();

		if (count >= 2) {
			// Navigate to first article
			const firstArticle = articleCards.first();
			const firstHref = await firstArticle.getAttribute("href");

			await Promise.all([
				page.waitForURL((url) => url.pathname !== "/"),
				firstArticle.click(),
			]);
			await expect(page).toHaveURL(firstHref);

			// Go back
			await page.goto("/");

			// Navigate to second article
			const secondArticle = articleCards.nth(1);
			const secondHref = await secondArticle.getAttribute("href");

			await Promise.all([
				page.waitForURL((url) => url.pathname !== "/"),
				secondArticle.click(),
			]);
			await expect(page).toHaveURL(secondHref);
		} else {
			// Skip test if only one article
			test.skip();
		}
	});

	test("browser back button works correctly", async ({ page }) => {
		// Navigate to home
		await page.goto("/");

		// Navigate to article
		const firstArticle = page.locator("main > div > a").first();
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Use browser back button
		await page.goBack();

		// Verify we're back on home
		await expect(page).toHaveURL("/");
	});

	test("direct URL access to article works", async ({ page }) => {
		// First get a valid article URL
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();
		const articleHref = await firstArticle.getAttribute("href");

		// Navigate directly to the article URL
		await page.goto(articleHref);

		// Verify article page loads
		const articleTitle = page.locator("article h1");
		await expect(articleTitle).toBeVisible();

		const backLink = page.locator('a:has-text("Zpět")');
		await expect(backLink).toBeVisible();
	});
});

test.describe("Link Verification", () => {
	test("all article links on home page are valid", async ({ page }) => {
		await page.goto("/");

		const articleCards = page.locator("main > div > a");
		const count = await articleCards.count();

		for (let i = 0; i < count; i++) {
			const article = articleCards.nth(i);
			const href = await article.getAttribute("href");

			// Verify href is a valid internal link
			expect(href).toBeTruthy();
			expect(href).toMatch(/^\/.+/);
			expect(href).not.toContain("http"); // Should be relative
		}
	});

	test("header link on home page points to root", async ({ page }) => {
		await page.goto("/");

		const headerLink = page.locator("header a");
		await expect(headerLink).toHaveAttribute("href", "/");
	});

	test("header link on article page points to root", async ({ page }) => {
		// Navigate to an article
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Check header link
		const headerLink = page.locator('a:has-text("Martin Kučera")');
		await expect(headerLink).toHaveAttribute("href", "/");
	});

	test("back link on article page points to root", async ({ page }) => {
		// Navigate to an article
		await page.goto("/");
		const firstArticle = page.locator("main > div > a").first();

		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);

		// Check back link
		const backLink = page.locator('a:has-text("Zpět")');
		await expect(backLink).toHaveAttribute("href", "/");
	});
});
