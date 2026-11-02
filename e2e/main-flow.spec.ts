import { test, expect } from '@playwright/test';

test.describe('Wellington electricity plan comparison', () => {
  test('loads sample meter data and shows ranked plans', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /wellington electricity plan comparison/i }),
    ).toBeVisible();
    await expect(page.getByText(/sample data loaded/i)).toBeVisible();
    await expect(page.getByText(/cheapest plan for your usage/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /plans ranked by annual cost/i })).toBeVisible();
    await expect(page.getByText(/best value/i).first()).toBeVisible();
    await expect(page.getByText(/gst included/i)).toBeVisible();
    await expect(page.getByText(/17 plans/i).first()).toBeVisible();
    await expect(page.getByText(/october 2026/i).first()).toBeVisible();
  });

  test('switches to an annual estimate and updates the recommendation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/sample data loaded/i)).toBeVisible();

    await page.getByRole('tab', { name: /annual estimate/i }).click();
    const annualInput = page.getByLabel(/annual usage/i);
    await annualInput.fill('5000');

    await expect(page.getByText(/5,000 kWh\/year/i)).toBeVisible();
    await expect(page.getByText(/suggested:/i)).toContainText(/low user/i);
    await expect(page.getByText(/cheapest plan for your usage/i)).toBeVisible();
  });

  test('selects a current plan and shows potential savings', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/sample data loaded/i)).toBeVisible();

    const currentPlan = page.getByLabel(/your current plan/i);
    await currentPlan.selectOption({ index: 2 });

    await expect(page.getByText(/you could save/i)).toBeVisible();
    await expect(page.getByText(/switching from/i)).toBeVisible();
  });

  test('shows an error for an invalid CSV upload', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/sample data loaded/i)).toBeVisible();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /upload meter csv/i }).click(),
    ]);

    await fileChooser.setFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('not,a,valid,csv\n1,2,3,4'),
    });

    await expect(page.getByRole('alert')).toContainText(/invalid csv format/i);
  });
});
