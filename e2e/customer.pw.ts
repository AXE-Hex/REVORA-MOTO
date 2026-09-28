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
  await expect(
    page.getByRole('heading', { name: 'CUSTOMER REVIEWS' }),
  ).toBeVisible();
  await expect(
    page.getByText('✓ Verified purchases', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Highest rated' }).click();
  await expect(page).toHaveURL(/review_sort=highest/);
  for (const width of [390, 480, 760, 1000, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const documentWidth = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll('body *'))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            element: `${element.tagName.toLowerCase()}.${String(element.className).replaceAll(' ', '.')}`,
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            text: element.textContent?.trim().slice(0, 50),
          };
        })
        .filter(
          (element) =>
            element.width > 0 && element.right > window.innerWidth + 1,
        )
        .slice(0, 8),
    }));
    expect(
      documentWidth.content,
      `Overflow at ${width}px: ${JSON.stringify(documentWidth.offenders)}`,
    ).toBeLessThanOrEqual(documentWidth.viewport + 1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/shop');
  await page.getByRole('button', { name: /Filters/ }).click();
  const filterDrawer = page.getByRole('dialog', { name: 'Filters' });
  await expect(filterDrawer).toBeVisible();
  const drawerBounds = await filterDrawer.boundingBox();
  expect(drawerBounds).not.toBeNull();
  expect(drawerBounds!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(filterDrawer).not.toBeVisible();
  await page.getByRole('button', { name: /Filters/ }).click();
  await filterDrawer.getByLabel('Category').selectOption({ index: 1 });
  await filterDrawer.getByRole('button', { name: /Show results/ }).click();
  await expect(page).toHaveURL(/category=/);
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
  const accountNavigation = page.getByRole('navigation', {
    name: 'Account navigation',
  });
  await expect(
    accountNavigation.getByRole('link', { name: 'Overview' }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    accountNavigation.getByRole('link', { name: 'Orders' }),
  ).toBeVisible();

  await page.goto('/en/account/profile');
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await page.goto('/en/account/garage');
  await expect(
    page.getByRole('heading', { name: 'Your garage is empty' }),
  ).toBeVisible();
  await page.goto('/en/account/addresses');
  await expect(
    accountNavigation.getByRole('link', { name: 'Addresses' }),
  ).toHaveAttribute('aria-current', 'page');
  await page.getByLabel('NAME').fill('Home');
  await page.getByLabel('Address line', { exact: true }).fill('12 Test Street');
  await page.getByLabel('CITY').fill('Cairo');
  await page.getByLabel('GOVERNORATE').fill('Cairo');
  await page.getByLabel('PHONE').fill('01000000000');
  await page.getByRole('button', { name: /Add address/i }).click();
  await expect(page).toHaveURL(/saved=1/);
  await expect(page.getByLabel('Address line', { exact: true })).toHaveCount(2);
  await expect(
    page.getByLabel('Address line', { exact: true }).first(),
  ).toHaveValue('12 Test Street');

  await page.goto('/en/account/wishlist');
  await expect(
    page.getByRole('heading', { name: 'Your wishlist is empty' }),
  ).toBeVisible();
  await page.goto('/en/account/notifications');
  await expect(
    page.getByRole('heading', { name: 'Notifications' }),
  ).toBeVisible();
  await page.goto('/en/account/returns');
  await expect(page.getByRole('heading', { name: 'Returns' })).toBeVisible();
  await expect(
    page.getByText('No items from delivered orders are eligible for return.'),
  ).toBeVisible();
  await page.goto('/en/account/warranties');
  await expect(
    page.getByRole('heading', { name: 'Warranties', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'There are no products eligible for warranty registration yet.',
    ),
  ).toBeVisible();
  await page.goto('/en/account/reviews');
  await expect(
    page.getByRole('heading', { name: 'My reviews', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('No eligible products right now')).toBeVisible();

  await page.goto('/en/shop/ap-jacket-air');
  await page.getByLabel('SIZE / OPTION').selectOption({ index: 0 });
  await page.getByRole('button', { name: /ADD TO CART/ }).click();
  await expect(page.getByRole('status')).toContainText('Added to cart');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/cart');
  const mobileCartCard = page.locator('.cart-mobile-card').first();
  await expect(mobileCartCard).toBeVisible();
  await expect(mobileCartCard).toContainText('GEAR-001-L');
  await expect(page.locator('.cart-mobile-checkout')).toBeVisible();
  const cartQuantity = page.getByRole('group', { name: 'Product quantity' });
  await cartQuantity.getByRole('button', { name: 'Increase quantity' }).click();
  await expect(cartQuantity.locator('output')).toHaveText('2');
  await expect(mobileCartCard.locator('.cart-mobile-line-total')).toContainText(
    '2',
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('link', { name: /CHECKOUT/ }).click();
  await expect(page.locator('.checkout-stepper')).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Delivery' })).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
  await page.getByRole('radio', { name: /InstaPay/ }).check();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
  await expect(page.getByText(/InstaPay · Verification pending/)).toBeVisible();
  await page.getByRole('button', { name: /Confirm order/i }).click();
  await expect(page).toHaveURL(/\/en\/orders\/[0-9a-f-]{36}/);
  await expect(
    page.getByRole('navigation', { name: 'Account navigation' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Account navigation' })
      .getByRole('link', { name: 'Orders' }),
  ).toHaveAttribute('aria-current', 'page');
  await page.setViewportSize({ width: 390, height: 844 });
  const orderDocumentWidth = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    offenders: Array.from(document.querySelectorAll('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}.${String(element.className).replaceAll(' ', '.')}`,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          text: element.textContent?.trim().slice(0, 50),
        };
      })
      .filter(
        (element) => element.width > 0 && element.right > window.innerWidth + 1,
      )
      .slice(0, 8),
  }));
  expect(
    orderDocumentWidth.content,
    `Order detail overflow: ${JSON.stringify(orderDocumentWidth.offenders)}`,
  ).toBeLessThanOrEqual(orderDocumentWidth.viewport + 1);
  await expect(page.locator('.account-order-line').first()).toBeVisible();
  const awaitingPayment = page.locator(
    '.status-badge-label[data-status="pending_payment"]',
  );
  await expect(awaitingPayment).toHaveCount(2);
  await expect(awaitingPayment.first()).toHaveText('Awaiting payment');
  await expect(page.getByText('GEAR-001-L')).toBeVisible();
  await expect(page.locator('.account-order-line')).toContainText('Qty 2');
  await page.goto('/en/account/orders');
  await expect(page.locator('.account-order-card')).toHaveCount(1);
  await expect(page.locator('.account-order-card')).toContainText(
    'Awaiting payment',
  );

  await page.goto('/en/checkout');
  await expect(page.locator('.checkout-empty')).toBeVisible();
  await expect(page.locator('.checkout-empty')).toContainText(
    'Your cart is empty',
  );
  await expect(page.locator('.checkout-empty .notice.error')).toHaveCount(0);

  await page.goto('/en/motorcycles/bmw-s1000rr-2026');
  await page.getByRole('link', { name: /RESERVE MOTORCYCLE/ }).click();
  await expect(page.locator('.reservation-stepper')).toBeVisible();
  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(page.getByRole('heading', { name: 'Branch' })).toBeVisible();
  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Customer information' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(
    page.getByRole('heading', { name: /Deposit \/ payment/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
  await page.getByRole('button', { name: /Confirm reservation/i }).click();
  await expect(page).toHaveURL(/\/en\/reservations\/[0-9a-f-]{36}\?created=1/);
  await expect(
    page.getByRole('heading', { name: 'Your reservation is confirmed' }),
  ).toBeVisible();
  await expect(page.locator('.reservation-reference')).toContainText('RV-R-');
  const awaitingReservation = page.locator(
    '.status-badge-label[data-status="awaiting_payment"]',
  );
  await expect(awaitingReservation).toHaveCount(2);
  await expect(awaitingReservation.first()).toHaveText('Awaiting payment');
  await page.goto('/en/account/reservations');
  await expect(page.locator('.account-record-card')).toHaveCount(1);
  await expect(page.locator('.account-record-card')).toContainText(
    'Awaiting payment',
  );

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
  await page.goto('/en/account/garage');
  await expect(page.locator('.account-garage-card')).toHaveCount(1);
  await expect(page.locator('.account-garage-card')).toContainText('BMW');
});
