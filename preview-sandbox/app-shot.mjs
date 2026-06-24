// End-to-end proof: load the real running app pages and screenshot them, so we
// see the prebuilt iframes actually rendering inside the detail page + grid.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8110';
const OUT = process.env.OUT || '/work/previews';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1200, height: 1000 } });
const shots = [
  ['/components-browser/mc-chart-bar', '_app-detail-chart.png'],
  ['/components-browser/mc-lamp', '_app-detail-lamp.png'],
  ['/components-browser', '_app-grid.png'],
];
for (const [route, file] of shots) {
  const p = await ctx.newPage();
  await p.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(2500); // let the preview iframe load its CDN + render
  await p.screenshot({ path: OUT + '/' + file, fullPage: route === '/components-browser' ? false : true });
  console.log('shot', route, '->', file);
  await p.close();
}
await b.close();
