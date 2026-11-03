import { defineConfig, devices } from '@playwright/test';

const previewUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 20 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // reporter: 'html', // Disabled report serving for CI/local runs
  use: {
    baseURL: previewUrl ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: previewUrl
    ? undefined
    : {
        command: 'vite',
        port: 5173,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
