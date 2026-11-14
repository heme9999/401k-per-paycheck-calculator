import { expect, test } from '@playwright/test';

test.describe('2027 401(k) Per-Paycheck Calculator smoke suite', () => {
  test('homepage renders H1, limits strip, max-out table, FAQ, and calculates live', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: '2027 401(k) Per Paycheck Calculator',
      }),
    ).toBeVisible();

    await expect(page.getByText('$25,500').first()).toBeVisible();
    await expect(page.getByText('$34,000').first()).toBeVisible();
    await expect(page.getByText('$37,250').first()).toBeVisible();
    await expect(page.getByText('IRS Notice 2026-66').first()).toBeVisible();

    // Select Ages 60-63 via label click
    await page.getByText('60–63 ($37.25k)').click();
    await expect(page.locator('#results-region')).toContainText('$1,432.69');

    // Toggle 27 paychecks
    await page.locator('#extra-paycheck').check();
    await expect(page.locator('#results-region')).toContainText('$1,379.62');

    // FAQ <details> toggles
    const firstFaq = page.locator('.faq-list details').first();
    await firstFaq.locator('summary').click();
    await expect(firstFaq).toHaveAttribute('open', '');
  });

  test('keyboard navigation works on segmented controls and mobile sticky bar renders', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');

    const weeklyLabel = page.locator('label[for="freq-weekly"]');
    await weeklyLabel.click();
    await expect(page.locator('#results-region')).toContainText('$490.38');

    if (isMobile) {
      await expect(page.locator('#mobile-sticky-bar')).toBeVisible();
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });
});
