import { test, expect } from '@playwright/test';

test('product catalog pagination shows every seeded item', async ({ page }) => {
  await page.goto('/en/shop');
  await expect(page.locator('.product-grid .catalog-card')).toHaveCount(12);
  await expect(
    page.getByRole('navigation', { name: 'Product pages' }),
  ).toContainText('Page 1 / 3');
  await page.getByRole('link', { name: 'NEXT' }).click();
  await expect(page).toHaveURL(/\/en\/shop\?page=2$/);
  await expect(page.locator('.product-grid .catalog-card')).toHaveCount(12);
  await page.getByRole('link', { name: 'NEXT' }).click();
  await expect(page).toHaveURL(/\/en\/shop\?page=3$/);
  await expect(page.locator('.product-grid .catalog-card')).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'PREVIOUS' })).toBeVisible();
});
