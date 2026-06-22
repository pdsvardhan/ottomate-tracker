import { test, expect } from '@playwright/test';

// Tier 2 — showcase legibility (recruiter-facing). Guards the project grid,
// overview pipeline + docs rail, and architecture rendering.

test('flow-projects-grid — home lists project cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
  // The 8 active projects each render a card link.
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

test('flow-project-overview-pipeline — overview shows the pipeline + key context', async ({ page }) => {
  await page.goto('/projects/windfall-labs');
  await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent activity' })).toBeVisible();
});

test('flow-project-overview-docs-rail — docs rail lists narrative docs and opens a reader', async ({ page }) => {
  await page.goto('/projects/windfall-labs');
  await expect(page.getByRole('heading', { name: 'Documentation' })).toBeVisible();
  // All four narrative doc types are surfaced.
  for (const t of ['Thesis', 'Technical Deep-Dive', 'Validation', 'Retrospective']) {
    await expect(page.getByText(t, { exact: false }).first()).toBeVisible();
  }
  // Opening the thesis renders the parsed body (frontmatter not leaked).
  await page.getByText('Thesis', { exact: false }).first().click();
  await expect(page.getByText(/Trendlyne/i).first()).toBeVisible();
  await expect(page.getByText('public: true')).toHaveCount(0);
});

test('flow-architecture-diagrams — architecture page renders for a diagrammed project', async ({ page }) => {
  await page.goto('/projects/ottomate/architecture');
  // The architecture page loads with its layered sections; a mermaid diagram
  // renders to inline SVG once hydrated.
  await expect(page.getByRole('heading', { name: /Ottomate/i }).first()).toBeVisible();
  await expect(page.locator('svg').first()).toBeVisible({ timeout: 15_000 });
});
