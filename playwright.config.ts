import { defineConfig, devices } from '@playwright/test';

// WS-D E2E harness. Runs against a disposable Ottomate instance (tests/e2e-run-server.sh
// boots the prod Docker image on :3100 over a throwaway DB copy). For local authoring,
// set E2E_BASE_URL to an already-running instance to skip the managed webServer.
const PORT = 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'bash tests/e2e-run-server.sh',
        url: `http://127.0.0.1:${PORT}/api/health`,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
