// scripts/capture-reels-inner.mjs — runs INSIDE the Playwright image
// (invoked by capture-reels.mjs). Records a 1920×1080 webm per project:
// load → settle → smooth scroll journey to the bottom → return to top.
// Pages that don't scroll (the 3D portfolio scene) get an idle take with
// gentle cursor drift instead, so their motion carries the clip.

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const MEDIA_ROOT = path.resolve('data', 'media');
const ARCHIVE = path.join(MEDIA_ROOT, '_replaced');

// Localhost ports from the projects table — ingest excluded (headless API, no UI).
const PROJECTS = [
  { slug: 'ottomate', url: 'http://127.0.0.1:8110/' },
  { slug: 'windfall-labs', url: 'http://127.0.0.1:8500/' },
  { slug: 'cointrail', url: 'http://127.0.0.1:8501/' },
  { slug: 'cap-a', url: 'http://127.0.0.1:8502/' },
  { slug: 'portfolio', url: 'http://127.0.0.1:8508/', settleMs: 9000 }, // WebGL scene needs to load + light up
  { slug: 'leaploop', url: 'http://127.0.0.1:8509/' },
  { slug: 'stateofus', url: 'http://127.0.0.1:8510/' },
  { slug: 'mapsofbharat', url: 'http://127.0.0.1:8610/' },
];

const only = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const targets = only.length ? PROJECTS.filter((p) => only.includes(p.slug)) : PROJECTS;

async function captureOne(browser, proj) {
  const tmpDir = path.join('/tmp', `reel-${proj.slug}`);
  await fs.rm(tmpDir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: tmpDir, size: { width: 1920, height: 1080 } },
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  try {
    await page.goto(proj.url, { waitUntil: 'load', timeout: 45_000 });
    await page.waitForTimeout(proj.settleMs ?? 3000);

    const { scrollable, span } = await page.evaluate(() => {
      const span = document.documentElement.scrollHeight - window.innerHeight;
      return { scrollable: span > 200, span };
    });

    if (scrollable) {
      // ~8s glide down in wheel steps (real wheel events → sticky/reveal
      // effects fire like they would for a person), brief hold, glide home.
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, Math.ceil(span / steps));
        await page.waitForTimeout(700);
      }
      await page.waitForTimeout(1200);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await page.waitForTimeout(1800);
    } else {
      // Non-scrolling scene: let its own motion carry the clip; drift the
      // cursor so hover states show some life.
      const drift = [[500, 400], [960, 540], [1400, 500], [1100, 700], [960, 540]];
      for (const [x, y] of drift) {
        await page.mouse.move(x, y, { steps: 24 });
        await page.waitForTimeout(1500);
      }
    }
  } finally {
    await context.close(); // finalizes the video file
  }

  const files = await fs.readdir(tmpDir);
  const vid = files.find((f) => f.endsWith('.webm'));
  if (!vid) throw new Error(`no video produced for ${proj.slug}`);

  const destDir = path.join(MEDIA_ROOT, proj.slug);
  await fs.mkdir(destDir, { recursive: true });
  await fs.mkdir(ARCHIVE, { recursive: true });

  // Archive any previous reel.* (never destructive — personal-data screenshots
  // from #165 wanted replacing, but they leave the serving dir, not the disk).
  for (const f of await fs.readdir(destDir).catch(() => [])) {
    if (/^reel\./.test(f)) {
      await fs.rename(path.join(destDir, f), path.join(ARCHIVE, `${proj.slug}-${Date.now()}-${f}`));
    }
  }
  await fs.copyFile(path.join(tmpDir, vid), path.join(destDir, 'reel.webm'));
  await fs.rm(tmpDir, { recursive: true, force: true });
  const { size } = await fs.stat(path.join(destDir, 'reel.webm'));
  return size;
}

const browser = await chromium.launch();
const results = [];
for (const proj of targets) {
  process.stdout.write(`${proj.slug} … `);
  try {
    const size = await captureOne(browser, proj);
    console.log(`OK ${(size / 1024 / 1024).toFixed(1)}MB`);
    results.push({ slug: proj.slug, ok: true, size });
  } catch (err) {
    console.log(`FAIL ${String(err).slice(0, 120)}`);
    results.push({ slug: proj.slug, ok: false, error: String(err) });
  }
}
await browser.close();

const ok = results.filter((r) => r.ok).length;
console.log(`\ncaptured ${ok}/${targets.length}`);
process.exit(ok === targets.length ? 0 : 1);
