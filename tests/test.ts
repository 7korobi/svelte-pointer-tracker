import { expect, test } from '@playwright/test';

test('root page', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveScreenshot({ fullPage: true });
});
