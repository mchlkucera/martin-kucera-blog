// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Error Handling", () => {
	test("invalid article slug shows error message", async ({ page }) => {
		// Navigate to a non-existent article
		await page.goto("/non-existent-article-slug-12345");

		// Wait for the error message to appear (use domcontentloaded instead of networkidle to avoid timeout)
		await page.waitForLoadState("domcontentloaded");

		// Verify error message is displayed
		const errorMessage = page.locator("text=Článek nenalezen");
		await expect(errorMessage).toBeVisible({ timeout: 15000 });
	});

	test("error page has navigation back to home", async ({ page }) => {
		// Navigate to a non-existent article
		await page.goto("/non-existent-article-slug-12345");

		// Wait for the page to load
		await page.waitForLoadState("domcontentloaded");

		// Verify back link exists
		const backLink = page.locator('a:has-text("Zpět")');
		await expect(backLink).toBeVisible({ timeout: 15000 });

		// Click back link
		await backLink.click();

		// Verify we're on home page
		await expect(page).toHaveURL("/");
	});

	test("error page has Martin Kučera header link", async ({ page }) => {
		// Navigate to a non-existent article
		await page.goto("/non-existent-article-slug-12345");

		// Wait for the page to load
		await page.waitForLoadState("domcontentloaded");

		// Verify header link exists
		const headerLink = page.locator('a:has-text("Martin Kučera")');
		await expect(headerLink).toBeVisible({ timeout: 15000 });

		// Verify it links to home
		await expect(headerLink).toHaveAttribute("href", "/");
	});

	test("error page maintains site branding", async ({ page }) => {
		// Navigate to a non-existent article
		await page.goto("/non-existent-article-slug-12345");

		// Wait for the page to load
		await page.waitForLoadState("domcontentloaded");

		// Verify page title
		await expect(page).toHaveTitle("Martin Kučera");
	});
});
