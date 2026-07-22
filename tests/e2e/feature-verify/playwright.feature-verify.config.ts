import { defineConfig, devices } from '@playwright/test';

// Feature-verify Playwright config (Task 3) — the DETERMINISTIC GATE.
// Evidence is ALWAYS on; single worker + retries:0 so the gate can't flake-pass (fix flake at
// the source per §5E: freeze time/animations with the Clock API in specs, stable fonts, isolated
// dirs/seeds — NOT retries). Drives FV_INSTANCE_URL (the real running app).
//
// Run:  FV_* env set (see harness/config.ts) then
//   npx playwright test -c scripts/feature-verify/playwright.feature-verify.config.ts

const EVID = process.env.FV_EVIDENCE_ROOT ?? '/tmp/feature-verify';
const baseURL = process.env.FV_INSTANCE_URL ?? 'http://127.0.0.1:8110';

export default defineConfig({
  testDir: process.env.FV_TEST_DIR ?? '.',
  testMatch: /.*\.feature-verify\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  outputDir: `${EVID}/artifacts`,
  reporter: [['list'], ['json', { outputFile: `${EVID}/playwright-report.json` }]],
  use: {
    baseURL,
    trace: 'on',        // trace / video / screenshot ALWAYS on — every case carries its proof
    video: 'on',
    screenshot: 'on',
    actionTimeout: 15_000,
  },
  projects: [{ name: 'feature-verify', use: { ...devices['Desktop Chrome'] } }],
});
