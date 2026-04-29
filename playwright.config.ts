import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: ['**/*.e2e.ts'],
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  outputDir: 'metrics/reports/playwright-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'metrics/reports/playwright', open: 'never' }],
    ['json', { outputFile: 'metrics/reports/playwright-results/results.json' }],
    ['junit', { outputFile: 'metrics/reports/playwright-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
})
