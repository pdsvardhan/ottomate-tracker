#!/usr/bin/env node
// scripts/register-unregistered-components.mjs — ottomate #306 (2026-09-07)
//
// 150 component dirs landed in /mnt/storage/ottomate/assets/components on 2026-05-19 — mostly single .tsx
// sources from the shadcn / kibo / ai-elements families — without a master_components row, so rule-12
// lookups ("check the library before authoring a UI primitive") could not see more than half the shelf.
// This registers every dir that has no row, honestly: a category only where the name family is
// unambiguous, provenance_debt=true because attribution/licence were never recorded at drop time, and an
// ingestion_method that says exactly what this was. Idempotent: 409 (already registered) is skipped.
//
// Usage: node scripts/register-unregistered-components.mjs [--dry-run] [--base http://127.0.0.1:8110]
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.env.MC_ASSET_ROOT || '/mnt/storage/ottomate/assets/components';
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const BASE = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://127.0.0.1:8110';
const TOKEN = process.env.OTTOMATE_TOKEN || (await fs.readFile('/opt/homeserver/ottomate/.token', 'utf8')).trim();

// name family (first dash-segment after mc-) -> category id from lib/categories.ts. Only the unambiguous ones.
const FAMILY_CATEGORY = {
  auth: 'auth-screens', login: 'auth-screens', signup: 'auth-screens', shell: 'dashboard-shells', sidebar: 'navigation',
  ai: 'ai-blocks', table: 'tables', transition: 'scroll-motion', scroll: 'scroll-motion', marquee: 'scroll-motion',
  filter: 'forms-inputs', form: 'forms-inputs', combobox: 'forms-inputs', command: 'forms-inputs', select: 'forms-inputs',
  input: 'forms-inputs', card: 'cards', floating: 'overlays', dialog: 'overlays', drawer: 'overlays', sheet: 'overlays',
  popover: 'overlays', tooltip: 'overlays', hero: 'sections', pricing: 'sections', testimonial: 'sections', faq: 'sections',
  footer: 'sections', navbar: 'navigation', nav: 'navigation', breadcrumb: 'navigation', tabs: 'navigation',
  button: 'buttons-actions', toast: 'feedback-progress', progress: 'feedback-progress', skeleton: 'feedback-progress',
  spinner: 'feedback-progress', badge: 'feedback-progress', chart: 'data-charts', gallery: 'media-galleries',
  carousel: 'media-galleries', avatar: 'media-galleries', typography: 'text-type', text: 'text-type',
  background: 'backgrounds-effects', accordion: 'layout', grid: 'layout', bento: 'layout', kanban: 'layout',
};
const LIBRARY_SUFFIX = ['shadcn', 'kibo', 'magicui', 'aceternity', 'originui', 'ai-elements', 'cult', 'motion-primitives', 'reactbits'];
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

const res = await fetch(`${BASE}/api/master-components`);
const listed = await res.json();
const rows = Array.isArray(listed) ? listed : listed.components ?? listed.master_components ?? [];
const known = new Set(rows.map((r) => r.id));
const dirs = (await fs.readdir(ROOT, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const todo = dirs.filter((d) => !known.has(d));
console.log(`dirs=${dirs.length} registered=${known.size} unregistered=${todo.length} ${DRY ? '(dry-run)' : ''}`);

const summary = { created: 0, skipped_409: 0, failed: 0, byCategory: {} };
for (const id of todo) {
  const files = (await fs.readdir(path.join(ROOT, id))).filter((f) => !f.startsWith('.'));
  const pick = (exts) => files.find((f) => exts.includes(path.extname(f)));
  const primary = pick(['.tsx']) || pick(['.html']) || pick(['.jsx', '.ts', '.js']) || pick(['.css', '.md', '.markdown']) || files[0];
  const parts = id.replace(/^mc-/, '').split('-');
  const library = LIBRARY_SUFFIX.find((l) => id.endsWith(`-${l}`)) ?? null;
  const nameParts = library ? id.replace(/^mc-/, '').replace(new RegExp(`-${library}$`), '').split('-') : parts;
  const family = parts[0];
  const category = FAMILY_CATEGORY[family] ?? null;
  const ext = primary ? path.extname(primary) : '';
  const framework_tags = ext === '.tsx' || ext === '.jsx' ? ['react', 'typescript'] : ext === '.html' ? ['html', 'css'] : [];
  const body = {
    id,
    name: nameParts.map(cap).join(' '),
    category,
    library,
    primary_file: primary ?? null,
    framework_tags,
    ingestion_method: 'disk-backfill-2026-09-07',
    provenance_debt: true,
    description: `Registered from disk on 2026-09-07 (ottomate #306): ${files.length} file(s), dropped 2026-05-19 without a registry row. Attribution and licence were not recorded at drop time - verify before shipping.`,
  };
  summary.byCategory[category ?? '(none)'] = (summary.byCategory[category ?? '(none)'] || 0) + 1;
  if (DRY) {
    if (summary.created < 6) console.log(' ', JSON.stringify({ id, name: body.name, category, library, primary }));
    summary.created++;
    continue;
  }
  const r = await fetch(`${BASE}/api/master-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  if (r.status === 409) summary.skipped_409++;
  else if (r.ok) summary.created++;
  else {
    summary.failed++;
    if (summary.failed <= 5) console.log(`  FAIL ${id} -> ${r.status} ${(await r.text()).slice(0, 160)}`);
  }
}
console.log(JSON.stringify(summary));
