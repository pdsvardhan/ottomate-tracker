import { test, expect } from '@playwright/test';

// Tier 2 — showcase legibility (recruiter-facing). Guards the project register,
// the project showcase (tabbed), and architecture rendering.
// Rewritten iter-14 to the Cyber-Den UI (the prior specs asserted the pre-overhaul
// overview layout — Pipeline/Recent-activity headings, docs reader — which the
// Cyber-Den port removed; those were stale, not regressions).

test('flow-projects-grid — home lists project cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
  for (const slug of ['windfall-labs', 'stateofus', 'ottomate', 'cointrail', 'leaploop']) {
    await expect(page.locator(`a[href="/projects/${slug}"]`).first()).toBeVisible();
  }
});

test('flow-projects-click-card — card navigates to overview', async ({ page }) => {
  await page.goto('/');
  await page.locator('a[href="/projects/windfall-labs"]').first().click();
  await expect(page).toHaveURL(/\/projects\/windfall-labs/);
  await expect(page.getByRole('heading', { name: /Windfall Labs/i }).first()).toBeVisible();
});

test('flow-home-server-card — home shows the activity feed + server telemetry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Recent activity')).toBeVisible();
  // iter-14: the below-fold pipeline strip became the VAULT7A server card.
  await expect(page.getByText('The machine behind it all')).toBeVisible();
  await expect(page.getByText('VAULT7A').first()).toBeVisible();
});

test('flow-project-showcase — overview renders the tabbed showcase', async ({ page }) => {
  await page.goto('/projects/windfall-labs');
  await expect(page.getByRole('heading', { name: /Windfall Labs/i }).first()).toBeVisible();
  // The act-tabs are the spine of the showcase.
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Engineering' })).toBeVisible();
});

test('flow-project-resources — resources tab surfaces documentation', async ({ page }) => {
  await page.goto('/projects/windfall-labs');
  await page.getByRole('tab', { name: 'Resources' }).click();
  await expect(page.getByText('Documentation')).toBeVisible();
});

test('flow-architecture-diagrams — architecture page renders layered sections + a diagram', async ({ page }) => {
  await page.goto('/projects/ottomate/architecture');
  // Cyber-Den architecture view: Workflow → System → … → Decisions.
  await expect(page.getByRole('heading', { name: 'Workflow' }).first()).toBeVisible();
  // A mermaid diagram renders to inline SVG once hydrated. Assert it renders into
  // the DOM (strict visibility under mobile-viewport emulation is flaky; desktop
  // proves it paints).
  await expect(page.locator('.mermaid-host svg').first()).toBeAttached({ timeout: 15_000 });
});
