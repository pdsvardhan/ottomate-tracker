import { promises as fs } from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PREV = process.env.PREVIEW_PUBLISH || '/work/previews';
const want = process.argv[2] || 'live';
const out = process.argv[3] || 'montage.png';
const m = JSON.parse(await fs.readFile(path.join(PREV, 'previews-manifest.json'), 'utf8')).components;
const ids = Object.entries(m).filter(([id, v]) => v.status === want && existsSync(path.join(PREV, id, 'shot.png'))).map(([id]) => id);
const sample = ids.slice(0, 28);
const cells = await Promise.all(sample.map(async (id) => {
  const b64 = (await fs.readFile(path.join(PREV, id, 'shot.png'))).toString('base64');
  return `<figure><img src="data:image/png;base64,${b64}"/><figcaption>${id}</figcaption></figure>`;
}));
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;background:#0a0a0f;font-family:system-ui}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px}
figure{margin:0;background:#111;border:1px solid #27272a;border-radius:10px;overflow:hidden}
img{width:100%;height:140px;object-fit:cover;display:block;background:#0a0a0f}
figcaption{font-size:11px;color:#a1a1aa;padding:6px 8px;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
h1{color:#e4e4e7;font-size:15px;margin:14px}</style></head><body>
<h1>${want} — ${sample.length} of ${ids.length}</h1><div class="grid">${cells.join('')}</div></body></html>`;
await fs.writeFile('/tmp/sheet.html', html);
const b = await chromium.launch({ args: ['--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 1180, height: 1200 } });
await page.goto('file:///tmp/sheet.html', { waitUntil: 'load' });
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: true });
await b.close();
console.log('montage', out, sample.length, 'of', ids.length, want);
