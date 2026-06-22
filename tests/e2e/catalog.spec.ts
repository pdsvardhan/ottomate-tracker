import { test, expect } from '@playwright/test';

// Tier 3 — the catalog + dashboards. Guards the iter-8 component-preview fix
// (no "Could not find dependency" crash regression), the inspirations board,
// and the coverage dashboard.

test('flow-components-grid — catalog renders grouped components', async ({ page }) => {
  await page.goto('/components-browser');
  await expect(page.getByRole('heading', { name: 'Components', level: 1 })).toBeVisible();
  await expect(page.getByText('central asset library')).toBeVisible();
  // At least one component card links into a detail page.
  await expect(page.locator('a[href^="/components-browser/mc-"]').first()).toBeVisible();
});

test('flow-component-detail-preview — detail shows preview/source tabs + admin, no crash', async ({ page }) => {
  await page.goto('/components-browser/mc-3d-card-effect');
  await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Source/ })).toBeVisible();
  // iter-8 #55 edit/delete UI is present.
  await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  // iter-8 #62 regression guard: the preview pane must not surface a hard
  // Sandpack dependency error for a self-contained component.
  await expect(page.getByText('Could not find dependency')).toHaveCount(0);
});

test('flow-inspirations-grid — board renders cards with self-hosted thumbnails', async ({ page }) => {
  await page.goto('/inspirations');
  await expect(page.getByRole('heading', { name: 'Inspirations', level: 1 })).toBeVisible();
  // 9 dribbble references, each linking to a detail page.
  await expect(page.locator('a[href^="/inspirations/insp-"]')).toHaveCount(9);
  // Thumbnails are served from the asset-library volume.
  const thumb = page.locator('img[src*="/thumbnail"]').first();
  await expect(thumb).toBeVisible();
  await expect
    .poll(async () => thumb.evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 15_000 })
    .toBeGreaterThan(0);
});

test('flow-inspirations-detail — a reference detail page renders', async ({ page }) => {
  await page.goto('/inspirations/insp-d1-task-management');
  await expect(page.getByRole('heading', { name: /Task Management/i }).first()).toBeVisible();
  // matched-components machinery was dropped in iter-8 — no such section.
  await expect(page.getByText('Matched components')).toHaveCount(0);
});

test('flow-coverage — coverage dashboard renders', async ({ page }) => {
  await page.goto('/coverage');
  await expect(page.locator('h1, h2').first()).toBeVisible();
});
