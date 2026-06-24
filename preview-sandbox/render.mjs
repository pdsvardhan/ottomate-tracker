// Runs INSIDE the mcr.microsoft.com/playwright image. Loads each bundled preview,
// measures painted-coverage (does it actually draw pixels?), screenshots it, and
// writes render-results.json. Invoked by scripts/build-previews.mjs via docker.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BUILD = process.env.BUILD_DIR || '/work/build';
const bundle = JSON.parse(await fs.readFile(path.join(BUILD, 'bundle-results.json'), 'utf8'));
const targets = bundle.filter((b) => b.status === 'bundled');

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });

const render = {};
let i = 0;
for (const b of targets) {
  i++;
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console:' + m.text()); });
  const res = { status: 'empty', detail: '', errors: [] };
  try {
    await page.goto('file://' + path.join(BUILD, b.id, 'index.html'), { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const root = document.getElementById('root');
      function painted(e) {
        if (!e || e === root || e === document.body || e === document.documentElement) return false;
        if (!root || !root.contains(e)) return false;
        // SVG elements report lowercase tagName (svg/path/circle) — normalize.
        const t = (e.tagName || '').toUpperCase();
        if (['IMG', 'IMAGE', 'SVG', 'CANVAS', 'VIDEO', 'PATH', 'CIRCLE', 'RECT', 'POLYGON', 'LINE', 'POLYLINE', 'ELLIPSE', 'G', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(t)) return true;
        const cs = getComputedStyle(e);
        if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') return true;
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
        if (['Top', 'Bottom', 'Left', 'Right'].some((s) => parseFloat(cs['border' + s + 'Width'] || '0') > 0)) return true;
        for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim().length > 0) return true;
        return false;
      }
      const W = window.innerWidth, H = window.innerHeight, cols = 40, rows = 28;
      let hits = 0, total = 0;
      for (let a = 1; a < cols; a++) for (let c = 1; c < rows; c++) { total++; if (painted(document.elementFromPoint((W * a) / cols, (H * c) / rows))) hits++; }
      // Grid sampling misses small controls (checkbox/switch) that fall between
      // sample points — also measure the largest painted element's area directly.
      let maxArea = 0, sumArea = 0, paintedCount = 0;
      if (root) root.querySelectorAll('*').forEach((e) => {
        if (!painted(e)) return;
        const r = e.getBoundingClientRect();
        if (r.width < 6 || r.height < 6) return;
        const area = Math.min(r.width, W) * Math.min(r.height, H);
        maxArea = Math.max(maxArea, area); sumArea += area; paintedCount++;
      });
      const txt = (root?.innerText || '').trim();
      return { coverage: total ? hits / total : 0, textLen: txt.length, maxArea, sumArea, paintedCount, renderError: window.__renderError ?? document.body.getAttribute('data-render-error'), noexport: window.__noexport === true };
    });
    const hadError = errors.some((e) => /TypeError|ReferenceError|is not|undefined|Cannot read|not a function/.test(e));
    // iter-36 #278 honest render-check: live = painted ANY real visible DOM (small controls incl.), not a coverage threshold.
    const meaningful = m.textLen >= 1 || m.maxArea >= 144 || m.paintedCount >= 1 || m.coverage >= 0.004;
    res.detail = `cov=${(m.coverage * 100).toFixed(1)}% txt=${m.textLen} maxA=${Math.round(m.maxArea)} n=${m.paintedCount || 0}`;
    if (m.renderError) { res.status = 'error'; res.detail = String(m.renderError).slice(0, 200); }
    else if (m.noexport) { res.status = 'no-export'; }
    else if (meaningful) { res.status = 'live'; }
    else if (hadError) { res.status = 'needs-props'; res.detail = (errors.find((e) => /TypeError|Cannot read|undefined|is not/.test(e)) || res.detail).slice(0, 160); }
    else { res.status = 'empty'; res.detail = 'mounted but visually empty (' + res.detail + ')'; }
    await page.screenshot({ path: path.join(BUILD, b.id, 'shot.png') }).catch(() => {});
  } catch (e) {
    res.status = 'error';
    res.detail = String((e && e.message) || e).slice(0, 200);
  }
  res.errors = errors.slice(0, 3);
  render[b.id] = res;
  await page.close();
  if (i % 25 === 0) console.log(`rendered ${i}/${targets.length}`);
}

await browser.close();
await fs.writeFile(path.join(BUILD, 'render-results.json'), JSON.stringify(render, null, 2));
const by = {};
for (const v of Object.values(render)) by[v.status] = (by[v.status] || 0) + 1;
console.log('render status counts:', JSON.stringify(by));
