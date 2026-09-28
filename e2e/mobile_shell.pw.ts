import { test, expect } from '@playwright/test';

test('localized mobile navigation opens within the viewport in RTL and LTR', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const locale of ['ar', 'en'] as const) {
    await page.goto(`/${locale}`);
    const trigger = page.locator('.mobile-menu > summary');
    await expect(trigger).toHaveAttribute(
      'aria-label',
      locale === 'ar' ? 'فتح القائمة' : 'Open menu',
    );
    await trigger.click();
    await expect(page.locator('.mobile-menu')).toHaveAttribute('open', '');

    const menu = page.getByRole('navigation', {
      name: locale === 'ar' ? 'روابط المتجر' : 'Store navigation',
    });
    await expect(
      menu.getByRole('link', { name: locale === 'ar' ? 'المتجر' : 'Shop' }),
    ).toBeVisible();

    const bounds = await menu.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  }
});
