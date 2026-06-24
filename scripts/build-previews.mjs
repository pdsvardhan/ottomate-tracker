// build:previews (iter-77) — one-shot, self-hosted inline-preview build pipeline.
//
// For every master_component: bundle it independently with esbuild (real npm
// deps from preview-sandbox/node_modules, @/ shims, demo fixtures), render it
// headlessly in the Playwright docker image to measure painted-coverage, capture
// a screenshot, and publish per-component index.html + shot.png + a render-status
// manifest to the asset-library previews dir the app serves.
//
// Run from repo root:  node scripts/build-previews.mjs
// Requires: node, docker (Playwright image), and the asset library volume.
import { promises as fs } from 'node:fs';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import esbuild from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const SANDBOX = path.join(REPO, 'preview-sandbox');
const BUILD = path.join(SANDBOX, 'build');
const SHIMS = path.join(SANDBOX, 'shims');
const NM = path.join(SANDBOX, 'node_modules');
const FIXTURES = path.join(SANDBOX, 'fixtures.tsx');
const PROVIDERS = path.join(SANDBOX, 'fixtures', 'providers.tsx');
const PROVIDER_IDS = new Set(['mc-tooltip-shadcn','mc-sidebar-shadcn','mc-form-autosave','mc-elastic-slider','mc-file-tree','mc-meteors','mc-border-beam','mc-glowing-effect','mc-animated-beam','mc-scroll-progress','mc-command-palette']);

const COMP_ROOT = process.env.COMP_ROOT || '/mnt/storage/ottomate/assets/components';
const PUBLISH = process.env.PREVIEW_PUBLISH || '/mnt/storage/ottomate/assets/previews';
const API = process.env.TRACKER_API_BASE || 'http://127.0.0.1:8110';
const PW_IMAGE = process.env.PW_IMAGE || 'mcr.microsoft.com/playwright:v1.60.0-jammy';

const CODE_PRIMARY_EXTS = ['.tsx', '.jsx', '.ts'];
const NEEDS_CONTEXT_PKG = new Set(['@assistant-ui/react', '@ai-sdk/react', 'ai', 'server-only', 'next-auth']);
const NEEDS_CONTEXT_RE = /from\s+['"](?:next\/(?:navigation|headers|server|cache)|next-auth|server-only)['"]/;
const IMPORT_RE = /(?:from\s*|import\s*|require\(\s*)['"]([^'"\n]+)['"]/g;

function packageName(spec) {
  if (!spec || spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/') || spec.startsWith('node:')) return null;
  const parts = spec.split('/');
  if (spec.startsWith('@')) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  return parts[0];
}

// --- 0. deps -----------------------------------------------------------------
if (!existsSync(NM)) {
  console.log('installing preview-sandbox deps (one-time)…');
  execSync('npm install --legacy-peer-deps --no-audit --no-fund', { cwd: SANDBOX, stdio: 'inherit' });
}

// --- 1. shims (base from app convention + extras for common catalog aliases) -
await fs.rm(SHIMS, { recursive: true, force: true });
await esbuild.build({ entryPoints: [path.join(SANDBOX, 'base-shims.ts')], outfile: path.join(SANDBOX, 'base-shims.mjs'), format: 'esm', bundle: false, logLevel: 'silent' });
const { SANDBOX_SHIM_FILES } = await import(path.join(SANDBOX, 'base-shims.mjs') + '?t=' + Date.now());

const { EXTRA_SHIMS } = await import(path.join(SANDBOX, 'extra-shims.mjs'));
const ALL_SHIMS = { ...SANDBOX_SHIM_FILES, ...EXTRA_SHIMS };
for (const [p, content] of Object.entries(ALL_SHIMS)) {
  const fp = path.join(SHIMS, p.replace(/^\//, ''));
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, content);
}
await fs.appendFile(path.join(SHIMS, 'lib/utils.ts'), '\nexport const cx = cn;\n');

// Resolve shadcn-convention aliases to bundled shims. Covers @/… plus the
// unpublished monorepo prefixes used across the catalog (@coss/ui/…,
// @repo/shadcn-ui/…) which are really just cn / ui-primitive imports.
function resolveShimPath(spec) {
  let rel = null;
  if (spec.startsWith('@/')) rel = spec.slice(2);
  else if (spec.startsWith('@coss/ui/')) rel = spec.slice('@coss/ui/'.length);
  else if (spec.startsWith('@repo/shadcn-ui/')) rel = spec.slice('@repo/shadcn-ui/'.length);
  else return null;
  const candidates = [rel];
  // `components/<x>` and `components/ui/<x>` both map to our ui shim
  const base = rel.split('/').pop();
  if (rel.startsWith('components/')) candidates.push('components/ui/' + base);
  const exts = ['', '.ts', '.tsx', '.js', '.jsx'];
  for (const c of candidates) for (const e of exts) {
    const fp = path.join(SHIMS, c + e);
    if (existsSync(fp)) return fp;
  }
  return null;
}
const aliasPlugin = {
  name: 'shim-alias',
  setup(build) {
    build.onResolve({ filter: /^(@\/|@coss\/ui\/|@repo\/shadcn-ui\/)/ }, (args) => {
      const fp = resolveShimPath(args.path);
      return fp ? { path: fp } : { errors: [{ text: `unshimmed-alias:${args.path}` }] };
    });
  },
};
const cssInject = {
  name: 'css-inject',
  setup(build) {
    build.onResolve({ filter: /\.(css|scss|sass|less)$/ }, (args) => {
      let fp = null;
      if (args.path.startsWith('.') || args.path.startsWith('/')) {
        const cand = path.resolve(args.resolveDir, args.path);
        if (existsSync(cand)) fp = cand;
      } else {
        const cand = path.join(NM, args.path);
        if (existsSync(cand)) fp = cand;
      }
      return fp ? { path: fp, namespace: 'css-inject' } : { path: args.path, namespace: 'css-missing' };
    });
    build.onLoad({ filter: /.*/, namespace: 'css-inject' }, async (args) => {
      const css = await fs.readFile(args.path, 'utf8');
      const js = 'var s=document.createElement("style");s.textContent=' + JSON.stringify(css) + ';document.head.appendChild(s);';
      return { contents: js, loader: 'js' };
    });
    build.onLoad({ filter: /.*/, namespace: 'css-missing' }, () => ({ contents: '', loader: 'js' }));
  },
};
const LOADER = { '.svg': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.jpeg': 'dataurl', '.gif': 'dataurl', '.webp': 'dataurl', '.json': 'json' };

function htmlFor(js) {
  return `<!doctype html><html class="dark"><head><meta charset="utf-8">
<script>window.process={env:{NODE_ENV:'production'}};window.global=window;</script><script src="https://cdn.tailwindcss.com"></script>
<style>html,body{margin:0;background:#0a0a0f;color:#e4e4e7;font-family:system-ui,sans-serif}#root{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}#root>*{max-width:100%}</style>
</head><body><div id="root"></div><script>${js}</script></body></html>`;
}


// iter-36 #277 — render html/codepen components: inline local css/js + inject the
// CDN libs the JS pane assumes (codepen "external resources" aren't in the export).
function htmlCdnFor(js) {
  const c = [];
  if (/\bgsap\b|TweenMax|gsap\./.test(js)) c.push('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js');
  if (/ScrollTrigger/.test(js)) c.push('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js');
  if (/\bTHREE\b|three\./.test(js)) c.push('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
  if (/Splitting\b/.test(js)) { c.push('https://unpkg.com/splitting/dist/splitting.min.js'); }
  if (/jQuery|\$\(/.test(js)) c.push('https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js');
  return c.map((u) => `<script src="${u}" crossorigin></script>`).join('\n');
}
async function buildHtmlPreview(dir, dirFiles) {
  const htmlFile = dirFiles.find((f) => f.toLowerCase().endsWith('.html'));
  let body = await fs.readFile(path.join(dir, htmlFile), 'utf8');
  let css = '';
  for (const f of dirFiles.filter((f) => /\.css$/i.test(f))) css += '\n' + (await fs.readFile(path.join(dir, f), 'utf8'));
  let js = '';
  for (const f of dirFiles.filter((f) => /\.js$/i.test(f) && !/\.min\.js$/i.test(f))) js += '\n;' + (await fs.readFile(path.join(dir, f), 'utf8'));
  const cdns = htmlCdnFor(js);
  // drop local (non-http) <link>/<script src> refs — they will not resolve standalone
  body = body.replace(/<link\b[^>]*href=["'](?!https?:|\/\/)[^"']+["'][^>]*>/gi, '')
             .replace(/<script\b[^>]*src=["'](?!https?:|\/\/)[^"']+["'][^>]*><\/script>/gi, '');
  const headInject = `${cdns}\n<style>html,body{margin:0}\n${css}</style>`;
  const jsInject = `<script>window.addEventListener('load',function(){try{\n${js}\n}catch(e){console.error(e)}});</script>`;
  if (/<html[\s>]/i.test(body)) {
    let doc = body;
    doc = doc.includes('</head>') ? doc.replace('</head>', headInject + '</head>') : doc.replace(/<html[^>]*>/i, (mm) => mm + '<head>' + headInject + '</head>');
    doc = doc.includes('</body>') ? doc.replace('</body>', jsInject + '</body>') : doc + jsInject;
    return doc;
  }
  return `<!doctype html><html><head><meta charset="utf-8">${headInject}</head><body>${body}${jsInject}</body></html>`;
}

function pickPrimary(dir, declared) {
  if (declared && existsSync(path.join(dir, declared))) return declared;
  let files = [];
  try { files = readdirSync(dir); } catch { return null; }
  const code = files.filter((f) => CODE_PRIMARY_EXTS.includes(path.extname(f).toLowerCase()) && !/\.(test|spec|stories)\./.test(f));
  if (code.length === 0) return null;
  return code.find((f) => /^index\.(tsx|jsx|ts)$/.test(f)) || code[0];
}

// --- 2. component list -------------------------------------------------------
const apiRes = await fetch(`${API}/api/master-components?limit=1000`);
const allComponents = (await apiRes.json()).components.map((c) => ({ id: c.id, primary_file: c.primary_file, library: c.library, preview_url: c.preview_url }));
const ONLY = process.env.COMP_ONLY ? new Set(process.env.COMP_ONLY.split(',').map((x) => x.trim())) : null;
const components = ONLY ? allComponents.filter((c) => ONLY.has(c.id)) : allComponents;
console.log('components:', components.length, ONLY ? '(COMP_ONLY filtered)' : '');

await fs.rm(BUILD, { recursive: true, force: true });
await fs.mkdir(BUILD, { recursive: true });

// --- 3. bundle each component -----------------------------------------------
const results = [];
for (const c of components) {
  const dir = path.join(COMP_ROOT, c.id);
  const entry = { id: c.id, library: c.library ?? null, preview_url: c.preview_url ?? null, status: '', detail: '' };
  if (!existsSync(dir)) { entry.status = 'no-source'; entry.detail = 'dir missing'; results.push(entry); continue; }

  const dirFiles = (await fs.readdir(dir)).filter((f) => !f.startsWith('.'));
  const hasHtml = dirFiles.some((f) => f.toLowerCase().endsWith('.html'));
  const primary = pickPrimary(dir, c.primary_file);
  if (!primary) {
    if (hasHtml) {
      try {
        const doc = await buildHtmlPreview(dir, dirFiles);
        await fs.mkdir(path.join(BUILD, c.id), { recursive: true });
        await fs.writeFile(path.join(BUILD, c.id, 'index.html'), doc);
        entry.status = 'html'; entry.detail = 'html inlined';
      } catch (e) { entry.status = 'html'; entry.detail = 'html inline failed: ' + String((e && e.message) || e).slice(0, 80); }
    } else { entry.status = 'no-source'; entry.detail = 'no code/html'; }
    results.push(entry); continue;
  }

  const primaryPath = path.join(dir, primary).split(path.sep).join('/');
  const src = await fs.readFile(primaryPath, 'utf8');
  let needsContext = NEEDS_CONTEXT_RE.test(src);
  if (!needsContext) { let m; IMPORT_RE.lastIndex = 0; while ((m = IMPORT_RE.exec(src))) { if (NEEDS_CONTEXT_PKG.has(packageName(m[1]) ?? '')) { needsContext = true; break; } } }
  if (needsContext) { entry.status = 'needs-context'; entry.detail = 'providers / server runtime / auth'; results.push(entry); continue; }

  const entrySource = [
    `import React from 'react';`,
    `import { createRoot } from 'react-dom/client';`,
    `import * as Mod from ${JSON.stringify(primaryPath)};`,
    PROVIDER_IDS.has(c.id) ? `import { overrides as __PROV } from ${JSON.stringify(PROVIDERS)};` : `import { fixtureFor } from ${JSON.stringify(FIXTURES)};`,
    // A component is a plain function OR a forwardRef/memo object (has $$typeof).
    `const isComp = (v) => typeof v === 'function' || (v && typeof v === 'object' && (v.$$typeof || typeof v.render === 'function'));`,
    `const Cmp = (Mod.default && isComp(Mod.default)) ? Mod.default : ((Object.entries(Mod).find(([k,v]) => /^[A-Z]/.test(k) && isComp(v)) || [])[1] || Object.values(Mod).find(isComp));`,
    `const el = document.getElementById('root');`,
    `if (!Cmp) { window.__noexport = true; }`,
    `else { try {`,
    PROVIDER_IDS.has(c.id) ? `  const __f = (__PROV[${JSON.stringify(c.id)}] || {}); const props = __f.props || {}; const children = ('children' in __f) ? __f.children : null; const wrap = !!__f.wrap; const theme = __f.theme || 'dark'; const element = (__f.element != null) ? __f.element : null;` : `  const { props, children, wrap, theme, element } = fixtureFor(${JSON.stringify(c.id)});`,
    `  if (theme === 'light') { document.documentElement.classList.remove('dark'); document.body.style.background = '#ffffff'; document.body.style.color = '#0a0a0f'; }`,
    `  const node = (element !== null && element !== undefined) ? element : React.createElement(Cmp, props, children);`,
    `  const tree = wrap ? React.createElement('div', { style: { position: 'relative', width: 600, height: 320, overflow: 'hidden', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, node) : node;`,
    `  createRoot(el).render(tree); }`,
    `  catch (e) { window.__renderError = String((e && e.message) || e); document.body.setAttribute('data-render-error', window.__renderError); } }`,
  ].join('\n');

  try {
    const r = await esbuild.build({
      stdin: { contents: entrySource, resolveDir: SANDBOX, loader: 'ts', sourcefile: 'entry.ts' },
      bundle: true, format: 'iife', platform: 'browser', target: 'es2020',
      jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
      nodePaths: [NM], loader: LOADER, plugins: [cssInject, aliasPlugin], write: false, logLevel: 'silent',
    });
    await fs.mkdir(path.join(BUILD, c.id), { recursive: true });
    await fs.writeFile(path.join(BUILD, c.id, 'index.html'), htmlFor(r.outputFiles[0].text));
    entry.status = 'bundled';
  } catch (err) {
    const txt = (err.errors || []).map((e) => e.text).join(' | ') || ((err && err.message) || String(err));
    if (/unshimmed-alias:/.test(txt)) { entry.status = 'unresolvable-alias'; entry.detail = (txt.match(/unshimmed-alias:(\S+)/g) || []).join(','); }
    else if (/Could not resolve ["']([^"']+)["']/.test(txt)) { entry.status = 'missing-dep'; entry.detail = (txt.match(/Could not resolve ["']([^"']+)["']/g) || []).join(','); }
    else { entry.status = 'bundle-error'; entry.detail = txt.slice(0, 300); }
  }
  results.push(entry);
}
await fs.writeFile(path.join(BUILD, 'bundle-results.json'), JSON.stringify(results, null, 2));
const bc = {}; for (const r of results) bc[r.status] = (bc[r.status] || 0) + 1;
console.log('bundle:', JSON.stringify(bc));

// --- 4. headless render in the Playwright image ------------------------------
console.log('rendering in', PW_IMAGE, '…');
execSync(
  `docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e BUILD_DIR=/work/sandbox/build ` +
  `-v "${SANDBOX}":/work/sandbox -w /work/sandbox ${PW_IMAGE} node render.mjs`,
  { stdio: 'inherit' },
);
const render = JSON.parse(await fs.readFile(path.join(BUILD, 'render-results.json'), 'utf8'));

// --- 5. manifest -------------------------------------------------------------
const REASON = {
  'needs-context': 'Renders inside the app — needs providers, server runtime, or auth.',
  'unresolvable-alias': 'Imports project-internal modules not available standalone.',
  'missing-dep': 'A sidecar source file or dependency is not in the catalog entry.',
  'needs-props': 'Renders with live data in the app — no demo fixture supplied here.',
  'empty': 'Mounts but renders no default content (needs props or an open state).',
  'no-export': 'No default or named React component export was found.',
  'bundle-error': 'Could not be bundled standalone.',
  'no-source': 'No renderable source file on disk.',
};
const manifest = {};
let live = 0;
for (const r of results) {
  let status = r.status, detail = r.detail;
  if (r.status === 'bundled') { const rr = render[r.id] || { status: 'error' }; status = rr.status; detail = rr.detail; }
  else if (r.status === 'html') { const rr = render[r.id]; if (rr) { status = rr.status; detail = rr.detail; } }
  if (status === 'live' || status === 'html') live++;
  const hasShot = existsSync(path.join(BUILD, r.id, 'shot.png'));
  manifest[r.id] = {
    status,                       // live | html | needs-props | empty | needs-context | unresolvable-alias | missing-dep | no-export | bundle-error | no-source | error
    reason: REASON[status] || null,
    iframe: status === 'live',
    shot: hasShot,
    detail: detail || null,
  };
}
await fs.writeFile(path.join(BUILD, 'previews-manifest.json'), JSON.stringify({ built_at: new Date().toISOString(), live, total: results.length, components: manifest }, null, 2));

// --- 6. publish to the asset-library volume ----------------------------------
if (!ONLY) {
await fs.rm(PUBLISH, { recursive: true, force: true });
await fs.mkdir(PUBLISH, { recursive: true });
for (const r of results) {
  const idDir = path.join(BUILD, r.id);
  if (!existsSync(idDir)) continue;
  await fs.mkdir(path.join(PUBLISH, r.id), { recursive: true });
  for (const f of ['index.html', 'shot.png']) {
    if (existsSync(path.join(idDir, f))) await fs.copyFile(path.join(idDir, f), path.join(PUBLISH, r.id, f));
  }
}
await fs.copyFile(path.join(BUILD, 'previews-manifest.json'), path.join(PUBLISH, 'previews-manifest.json'));
}

console.log(`\nDONE — ${live}/${results.length} live. Published to ${PUBLISH}`);
