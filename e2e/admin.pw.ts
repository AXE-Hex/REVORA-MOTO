import { createClient } from '@supabase/supabase-js';
import { test, expect } from '@playwright/test';

test('admin catalog has a usable responsive list and editor', async ({
  page,
}) => {
  const email = `revora-admin-e2e-${Date.now()}@example.test`;
  const password = 'RevoraAdminTest!2026';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Local E2E Supabase service credentials are required.');
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Admin' },
  });
  expect(error).toBeNull();
  expect(data.user).not.toBeNull();
  const { error: roleError } = await admin.from('staff_roles').insert({
    user_id: data.user!.id,
    role_id: 'owner',
  });
  expect(roleError).toBeNull();

  await page.goto('/en/auth');
  await page.getByLabel('EMAIL').fill(email);
  await page.getByLabel('PASSWORD').fill(password);
  await page.getByRole('button', { name: /^SIGN IN$/ }).click();
  await expect(page).toHaveURL(/\/en\/account/);
  await page.goto('/en/admin/products');
  await expect(
    page.getByRole('heading', { name: 'PRODUCT MANAGEMENT' }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  const cards = page.locator('.admin-product-mobile-card');
  await expect(cards.first()).toBeVisible();
  await cards.first().getByRole('link', { name: 'Edit product' }).click();
  await expect(
    page.getByRole('heading', { name: 'EDIT PRODUCT' }),
  ).toBeVisible();
  const arabicName = page.getByLabel('Arabic name');
  await expect(arabicName).toBeVisible();
  await expect(page.getByLabel('English name')).toBeVisible();
  await expect(page.getByText('No unsaved changes')).toBeVisible();
  await arabicName.fill('Changed but discarded');
  await expect(page.getByText('Unsaved changes')).toBeVisible();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByText('No unsaved changes')).toBeVisible();

  await page.goto('/en/admin/inventory');
  await expect(
    page.getByRole('heading', { name: 'INVENTORY & LOCATIONS' }),
  ).toBeVisible();
  await expect(
    page.locator('.admin-inventory-mobile-card').first(),
  ).toBeVisible();

  await page.goto('/en/admin');
  await expect(
    page.getByRole('heading', { name: 'OPERATIONS DASHBOARD' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'NEEDS ATTENTION' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'TOP SELLING PRODUCTS' }),
  ).toBeVisible();

  const ranges = page.getByRole('group', { name: 'Time range' });
  await page.route('**/api/admin/analytics?range=7d', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.continue();
  });
  const sevenDayResponse = page.waitForResponse((response) =>
    response.url().includes('/api/admin/analytics?range=7d'),
  );
  await ranges.getByRole('button', { name: '7D' }).click();
  await expect(page.locator('.admin-analytics-skeleton')).toBeVisible();
  const sevenDay = await sevenDayResponse;
  expect(sevenDay.ok()).toBeTruthy();
  expect(await sevenDay.json()).toHaveLength(7);
  await page.unroute('**/api/admin/analytics?range=7d');
  await expect(ranges.getByRole('button', { name: '7D' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const twelveMonthResponse = page.waitForResponse((response) =>
    response.url().includes('/api/admin/analytics?range=12m'),
  );
  await ranges.getByRole('button', { name: '12M' }).click();
  const twelveMonth = await twelveMonthResponse;
  expect(twelveMonth.ok()).toBeTruthy();
  expect(await twelveMonth.json()).toHaveLength(12);
  await expect(
    page.locator('.admin-analytics-empty, .admin-analytics-chart svg').first(),
  ).toBeVisible();

  await page.goto('/en/admin/suppliers');
  await expect(
    page.locator('.admin-supplier-mobile-cards').first(),
  ).toBeVisible();
  await page.goto('/en/admin/inventory');
  await expect(page.locator('.admin-inventory-movement-cards')).toBeVisible();

  await page.goto('/en/admin/promotions');
  await expect(page.locator('.admin-promotion-usage-cards')).toBeVisible();
  await expect(page.locator('.admin-promotion-usage-table')).toBeHidden();

  await page.goto('/en/admin/settings');
  await expect(
    page.getByRole('heading', { name: 'SITE SETTINGS' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'SAVE SETTINGS' }),
  ).toBeDisabled();
  await page.goto('/en/admin');
  for (const width of [390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
  await page.goto('/ar/admin');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const rtlDimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(rtlDimensions.content).toBeLessThanOrEqual(rtlDimensions.viewport + 1);

  const salesEmail = `revora-sales-e2e-${Date.now()}@example.test`;
  const { data: salesData, error: salesError } =
    await admin.auth.admin.createUser({
      email: salesEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Sales' },
    });
  expect(salesError).toBeNull();
  expect(salesData.user).not.toBeNull();
  const { error: salesRoleError } = await admin.from('staff_roles').insert({
    user_id: salesData.user!.id,
    role_id: 'sales',
  });
  expect(salesRoleError).toBeNull();
  await page.context().clearCookies();
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/en/auth');
  await page.getByLabel('EMAIL').fill(salesEmail);
  await page.getByLabel('PASSWORD').fill(password);
  await page.getByRole('button', { name: /^SIGN IN$/ }).click();
  await page.goto('/en/admin');
  await expect(
    page.getByRole('heading', { name: 'OPERATIONS DASHBOARD' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'OPERATING TRENDS' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Products', exact: true }),
  ).toHaveCount(0);
  const restrictedAnalytics = await page.request.get(
    '/api/admin/analytics?range=7d',
  );
  expect(restrictedAnalytics.status()).toBe(403);
  const restrictedProducts = await page.goto('/en/admin/products');
  expect(restrictedProducts?.status()).toBe(404);
});
