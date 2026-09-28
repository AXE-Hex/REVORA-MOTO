import { test, expect } from '@playwright/test';

test('public catalog, details, comparison and product variant are visible', async ({
  page,
}) => {
  await page.goto('/ar');
  await expect(page.locator('body > div[dir="rtl"]')).toHaveAttribute(
    'lang',
    'ar',
  );
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.goto('/en/motorcycles/bmw-s1000rr-2026');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('BMW');
  await page.goto('/en/compare');
  const choices = page.locator('.compare-option input');
  await expect(choices).toHaveCount(6);
  await choices.nth(0).check();
  await choices.nth(1).check();
  await page.getByRole('button', { name: /COMPARE SELECTED/ }).click();
  await expect(page.locator('.compare-table thead th')).toHaveCount(3);

  await page.goto('/en/shop/ap-jacket-air');
  await expect(page.getByLabel('SIZE / OPTION')).toBeVisible();
  await expect(page.getByLabel('SIZE / OPTION').locator('option')).toHaveCount(
    3,
  );
});

test('customer signs up, saves an address, buys a variant and views a pending order', async ({
  page,
}) => {
  const email = `revora-e2e-${Date.now()}@example.test`;
  const password = 'RevoraTest!2026';
  await page.goto('/en/auth');
  await page.getByRole('button', { name: /New here\? Create account/ }).click();
  await page.getByLabel('FULL NAME').fill('E2E Rider');
  await page.getByLabel('EMAIL').fill(email);
  await page.getByLabel('PASSWORD').fill(password);
  await page.getByRole('button', { name: /CREATE ACCOUNT/ }).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
  await page
    .getByRole('button', { name: /Already have an account\? Sign in/ })
    .click();
  await page.getByLabel('EMAIL').fill(email);
  await page.getByLabel('PASSWORD').fill(password);
  await page.getByRole('button', { name: /^SIGN IN$/ }).click();
  await expect(page).toHaveURL(/\/en\/account/);

  await page.goto('/en/account/addresses');
  await page.getByLabel('NAME').fill('Home');
  await page.getByLabel('ADDRESS').fill('12 Test Street');
  await page.getByLabel('CITY').fill('Cairo');
  await page.getByLabel('GOVERNORATE').fill('Cairo');
  await page.getByLabel('PHONE').fill('01000000000');
  await page.getByRole('button', { name: /SAVE ADDRESS/ }).click();
  await expect(page.getByText('12 Test Street')).toBeVisible();

  await page.goto('/en/shop/ap-jacket-air');
  await page.getByLabel('SIZE / OPTION').selectOption({ index: 0 });
  await page.getByRole('button', { name: /ADD TO CART/ }).click();
  await expect(page.getByRole('status')).toContainText('Added to cart');
  await page.goto('/en/cart');
  await expect(page.getByRole('table')).toContainText('GEAR-001-L');
  await page.getByRole('link', { name: /CHECKOUT/ }).click();
  await page.getByRole('button', { name: /PLACE ORDER/ }).click();
  await expect(page).toHaveURL(/\/en\/orders\/[0-9a-f-]{36}/);
  await expect(page.locator('p.status')).toHaveText('pending_payment');
  await expect(page.getByText('GEAR-001-L')).toBeVisible();

  await page.goto('/en/motorcycles/bmw-s1000rr-2026');
  await page.getByRole('link', { name: /RESERVE MOTORCYCLE/ }).click();
  await page.getByRole('button', { name: /CONFIRM RESERVATION/ }).click();
  await expect(page).toHaveURL(/\/en\/reservations\/[0-9a-f-]{36}/);
  await expect(page.getByText('awaiting_payment').first()).toBeVisible();

  await page.goto('/en/fitment');
  await page.getByLabel('BRAND').selectOption({ label: 'BMW' });
  await page.getByLabel('MODEL').selectOption({ label: 'S 1000 RR' });
  await page.getByLabel('VARIANT').selectOption({ label: 'M Package' });
  await page.getByLabel('YEAR').fill('2026');
  await page.getByRole('button', { name: /FIND COMPATIBLE PARTS/ }).click();
  await expect(page.getByText('PARTS THAT FIT')).toBeVisible();
  await page.getByRole('button', { name: /ADD TO MY GARAGE/ }).click();
  await expect(page.getByRole('heading', { name: 'MY GARAGE' })).toBeVisible();
  await page.getByRole('button', { name: /SET ACTIVE/ }).click();
  await expect(page).toHaveURL(/\/en\/shop\?compatible=1/);
  await expect(page.locator('.fitment-tag.compatible').first()).toBeVisible();
});
