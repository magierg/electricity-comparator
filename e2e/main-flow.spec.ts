import { test, expect } from '@playwright/test';

test.describe('Electricity Plan Comparator Main Flow', () => {
  test('User uploads usage data, configures plan, and sees comparison', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /upload usage data/i })).toBeVisible();

    // Try sample data
    await page.getByRole('heading', { name: /try sample data/i }).click();
    await expect(page.getByText(/successfully parsed/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /parsed data/i })).toBeVisible();

    // Open peak hours config
    await page.getByRole('button', { name: /show peak hours/i }).click();
    await expect(page.getByText(/peak hours presets/i)).toBeVisible();
    await page.getByText(/evening only/i).click();

    // Check plan comparison is visible
    await expect(page.getByRole('heading', { name: /plan comparison/i })).toBeVisible();
    await expect(page.getByText(/cost comparison/i)).toBeVisible();
  });

  test('User enters usage manually and sees cost comparison', async ({ page }) => {
    test.setTimeout(10000); // Reduce timeout to 10s for this test
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /daily usage pattern/i })).toBeVisible();

    // Switch to Custom Hours mode
    await page.getByRole('button', { name: /custom hours/i }).click();

    // Enter 1 kWh for each hour (labels are 00:00, 01:00, ... 23:00)
    for (let hour = 0; hour < 24; hour++) {
      const label = `${String(hour).padStart(2, '0')}:00`;
      const input = page.getByLabel(label);
      await input.fill('1');
    }

    // Open peak hours config in upload section (should not affect manual input)
    await page.getByRole('button', { name: /show peak hours/i }).click();
    await expect(page.getByText(/peak hours presets/i)).toBeVisible();
    await page.getByText(/evening only/i).click();

    // Check plan comparison is visible
    await expect(page.getByRole('heading', { name: /plan comparison/i })).toBeVisible();
    await expect(page.getByText(/cost comparison/i)).toBeVisible();
  });

  test('User uploads invalid CSV and sees error', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /upload usage data/i })).toBeVisible();

    // Simulate file upload with invalid content
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /upload csv file/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('not,a,valid,csv\n1,2,3,4')
    });

    await expect(page.getByText(/invalid csv format/i)).toBeVisible();
  });
});
