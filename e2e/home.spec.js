// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Home Page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("page loads successfully with correct title", async ({ page }) => {
		await expect(page).toHaveTitle("Martin Kučera");
	});

	test('header "Martin Kučera" is visible', async ({ page }) => {
		const header = page.locator("header");
		await expect(header).toBeVisible();
		await expect(header).toContainText("Martin Kučera");
	});

	test("header link navigates to home page", async ({ page }) => {
		const headerLink = page.locator("header a");
		await expect(headerLink).toHaveAttribute("href", "/");
		await headerLink.click();
		await expect(page).toHaveURL("/");
	});

	test("article list renders with at least one article", async ({ page }) => {
		// Get all article cards (links that are not the header link)
		const articleCards = page.locator("main > div > a");
		await expect(articleCards.first()).toBeVisible();

		const count = await articleCards.count();
		expect(count).toBeGreaterThan(0);
	});

	test("article cards have title and date", async ({ page }) => {
		// Get the first article card
		const firstArticle = page.locator("main > div > a").first();
		await expect(firstArticle).toBeVisible();

		// Check for article title (h3 element)
		const title = firstArticle.locator("h3");
		await expect(title).toBeVisible();
		const titleText = await title.textContent();
		expect(titleText.length).toBeGreaterThan(0);

		// Check for date (p element with text-gray-400)
		const date = firstArticle.locator("p");
		await expect(date).toBeVisible();
		const dateText = await date.textContent();
		expect(dateText.length).toBeGreaterThan(0);
	});

	test("article cards have article numbers", async ({ page }) => {
		// Get the first article card
		const firstArticle = page.locator("main > div > a").first();
		await expect(firstArticle).toBeVisible();

		// Check for article number (span with number followed by period)
		const numberSpan = firstArticle.locator("h3 span").first();
		await expect(numberSpan).toBeVisible();
		const numberText = await numberSpan.textContent();
		expect(numberText).toMatch(/^\d+\.$/);
	});

	test("article links are clickable and navigate correctly", async ({
		page,
	}) => {
		// Get the first article card
		const firstArticle = page.locator("main > div > a").first();
		await expect(firstArticle).toBeVisible();

		// Get the href attribute
		const href = await firstArticle.getAttribute("href");
		expect(href).toBeTruthy();
		expect(href).toMatch(/^\/.+/);

		// Click and wait for navigation
		await Promise.all([
			page.waitForURL((url) => url.pathname !== "/"),
			firstArticle.click(),
		]);
		await expect(page).toHaveURL(href);
	});

	test("footer with copyright is visible", async ({ page }) => {
		const footer = page.locator("footer");
		await expect(footer).toBeVisible();

		// Check for copyright symbol and current year
		const currentYear = new Date().getFullYear().toString();
		await expect(footer).toContainText(currentYear);
	});

	test("main content area has correct max-width styling", async ({ page }) => {
		const main = page.locator("main");
		await expect(main).toBeVisible();
		await expect(main).toHaveClass(/max-w-2xl/);
	});
});
