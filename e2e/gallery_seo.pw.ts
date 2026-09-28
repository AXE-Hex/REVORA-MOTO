import { expect, test } from '@playwright/test';

test('motorcycle showroom opens with accessible controls and restores focus', async ({
  page,
}) => {
  await page.goto('/en/motorcycles/bmw-s1000rr-2026');
  const opener = page.getByRole('button', { name: 'Open gallery' });
  await opener.focus();
  await opener.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Motorcycle gallery' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Zoom in' })).toHaveCount(2);
  await dialog.getByRole('button', { name: 'Zoom in' }).first().click();
  await expect(
    dialog.getByRole('button', { name: 'Zoom out' }).first(),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    dialog.getByRole('button', { name: 'Next image' }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('demo details expose breadcrumbs but no merchandise offers in JSON-LD', async ({
  page,
}) => {
  for (const path of [
    '/en/motorcycles/bmw-s1000rr-2026',
    '/en/shop/ap-jacket-air',
  ]) {
    await page.goto(path);
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(scripts.length).toBeGreaterThan(0);
    const graphs = scripts.map((script) => JSON.parse(script));
    expect(
      graphs.some((graph) =>
        graph['@graph']?.some(
          (node: { '@type'?: string }) => node['@type'] === 'BreadcrumbList',
        ),
      ),
    ).toBe(true);
    expect(
      graphs.some((graph) =>
        graph['@graph']?.some((node: { offers?: unknown }) => node.offers),
      ),
    ).toBe(false);
  }
});
