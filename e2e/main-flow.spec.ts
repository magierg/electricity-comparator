import { test, expect } from '@playwright/test';

test.describe('Electricity Plan Comparator Main Flow', () => {
  test('User uploads usage data, configures plan, and sees comparison', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/upload usage data/i)).toBeVisible();

    // Try sample data
    await page.getByText(/try sample data/i).click();
    await expect(page.getByText(/successfully parsed/i)).toBeVisible();
    await expect(page.getByText(/parsed data/i)).toBeVisible();

    // Open peak hours config
    await page.getByText(/show/i).click();
    await expect(page.getByText(/peak hours presets/i)).toBeVisible();
    await page.getByText(/evening only/i).click();

    // Check plan comparison is visible
    await expect(page.getByText(/plan comparison/i)).toBeVisible();
    await expect(page.getByText(/total cost/i)).toBeVisible();
  });
});
