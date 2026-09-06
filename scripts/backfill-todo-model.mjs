#!/usr/bin/env node
// scripts/backfill-todo-model.mjs — derive state / kind / priority / origin / blocked_by for every existing
// to-do from the prose that used to carry them (ottomate #774 + #530, 2026-09-07).
//
// Conservative on purpose: only patterns that were actually found across the 803 rows are mapped; anything
// else stays kind=misc / state=open (done rows are already state=done from the migration) — the misc bucket
// is the drift signal, so it must not be guessed empty. Unmapped leading [tags] are preserved in body.
// Writes go through the API (ONE DOOR, adr-018). Idempotent: a row is only PATCHed with fields that change.
//
// Usage: node scripts/backfill-todo-model.mjs [--dry-run] [--project <slug>] [--base http://127.0.0.1:8110]
import fs from 'node:fs/promises';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--base', 'http://127.0.0.1:8110');
const ONLY = opt('--project', null);
const TOKEN = process.env.OTTOMATE_TOKEN || (await fs.readFile('/opt/homeserver/ottomate/.token', 'utf8')).trim();
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

const KIND_TAGS = [
  [/^(bug|fix|hotfix|regression|fv-red|data-quality)\b/i, 'bug'],
  [/^(process|convention|rule gap|rule)\b/i, 'process'],
  [/^(planner research|research intake|research|open question|deep-dive)/i, 'research'],
  [/^(docs?|doc-freshness|verifier-recipe|harness|security|housekeeping|ops|ci|infra|chore|cleanup)/i, 'chore'],
  [/^(feature|feat|task2|roadmap|ui open|ui locked|content|polish|ux|cards|hero|sms)/i, 'feature'],
];
const KIND_TEXT = [
  [/\b(bug|regression|broken|crash|fails? silently|wrong|false positive)\b/i, 'bug'],
  [/\b(research|investigate|decide|open question|proposal|design a)\b/i, 'research'],
  [/\b(backfill|consolidate|cron|rotate|scrub|cleanup|housekeeping|docs?|inventory|regenerate|sync)\b/i, 'chore'],
  [/\b(add|implement|build|ship|support|new)\b/i, 'feature'],
];

function derive(t) {
  const title = t.title;
  const head = title.slice(0, 160);
  const tags = [...head.matchAll(/\[([^\]]{1,60})\]/g)].map((m) => m[1].trim());
  const out = {};

  // ---- state ----
  if (t.done) out.state = 'done';
  else if (/\[fixed, awaiting rebuild\]|awaiting rebuild|\bbuilt\b.*\bneeds? (test|verif)/i.test(head)) out.state = 'built';
  else if (/\b(owner-deferred|owner call|OWNER:|needs one owner look|blocked on (the )?owner|owner (question|decision)s? (open|pending))\b/i.test(title)) { out.state = 'blocked'; out.blocked_on = 'owner'; }
  else if (/\[BLOCKED|\bblocked by\b/i.test(head)) { out.state = 'blocked'; out.blocked_on = /\bowner\b/i.test(head) ? 'owner' : 'dependency'; }
  else if (/\[(PARKED|DEFERRED)|\bparked\b|deferred on purpose|- LATER\]|\bLATER\b|next batch|do after the/i.test(head)) out.state = 'parked';
  else if (/\bin[- ]progress\b|\bstarted\b/i.test(head)) out.state = 'in-progress';
  else out.state = 'open';

  // ---- kind ----
  let kind = null;
  for (const tag of tags) { for (const [re, k] of KIND_TAGS) if (re.test(tag)) { kind = k; break; } if (kind) break; }
  if (!kind) for (const [re, k] of KIND_TEXT) if (re.test(head)) { kind = k; break; }
  out.kind = kind ?? 'misc';

  // ---- priority ----
  const p = head.match(/\b(P0|P1|P2|P3|URGENT|SOON)\b/);
  if (p) out.priority = { P0: 'P0', URGENT: 'P0', P1: 'P1', SOON: 'P1', P2: 'P2', P3: 'P2' }[p[1]];

  // ---- origin: where it came from ----
  const o = head.match(/\[(from [^\]]+|moved from [^\]]+|found iter[^\]]+|iter-\d+[^\]]*|screenroom adr-\d+|[a-z-]+ adr-\d+|folded->[^\]]+)\]/i)
    || title.match(/\b(Split from ottomate #\d+|from (mapsofbharat|screenroom|leaploop|cointrail|portfolio) (pack-up|#\d+)[^.;]*)/i);
  if (o) out.origin = o[1].slice(0, 200);

  // ---- blocked_by ----
  const under = [...title.matchAll(/\b[Uu]nder #(\d+)\b|\bblocked by #(\d+)\b|\bdepends on #(\d+)\b/g)].map((m) => Number(m[1] || m[2] || m[3]));
  if (under.length) { out.blocked_by = [...new Set(under)]; if (out.state === 'open') { out.state = 'blocked'; out.blocked_on = 'dependency'; } }

  // ---- unmapped tags -> preserved in body ----
  const unmapped = tags.filter((tag) => !KIND_TAGS.some(([re]) => re.test(tag)) && !/^(done|resolved|fixed|PARKED|DEFERRED|BLOCKED|from |moved from|found iter|iter-|folded->)/i.test(tag));
  if (unmapped.length && !t.body) out.body = `tags: ${unmapped.join(' · ')}`;
  return out;
}

const projects = await (await fetch(`${BASE}/api/projects`)).json();
const slugs = (Array.isArray(projects) ? projects : projects.projects || []).map((p) => p.slug).filter((s) => !ONLY || s === ONLY);
const dist = { state: {}, kind: {}, priority: {}, blocked_on: {}, origin: 0, blocked_by: 0, body: 0, rows: 0, patched: 0, failed: 0 };
const examples = [];
for (const slug of slugs) {
  const { todos } = await (await fetch(`${BASE}/api/projects/${slug}/todos`)).json();
  for (const t of todos) {
    dist.rows++;
    const d = derive(t);
    const patch = {};
    for (const [k, v] of Object.entries(d)) {
      const cur = t[k];
      const same = Array.isArray(v) ? JSON.stringify(cur ?? null) === JSON.stringify(v) : (cur ?? null) === v;
      if (!same) patch[k] = v;
    }
    for (const k of ['state', 'kind', 'priority', 'blocked_on']) if (d[k]) dist[k][d[k]] = (dist[k][d[k]] ?? 0) + 1;
    if (d.origin) dist.origin++; if (d.blocked_by) dist.blocked_by++; if (d.body) dist.body++;
    if (!Object.keys(patch).length) continue;
    if (examples.length < 8 && !t.done) examples.push({ id: t.id, slug, patch, title: t.title.slice(0, 70) });
    if (DRY) { dist.patched++; continue; }
    const r = await fetch(`${BASE}/api/todos/${t.id}`, { method: 'PATCH', headers: H, body: JSON.stringify(patch) });
    if (r.ok) dist.patched++; else { dist.failed++; if (dist.failed <= 5) console.log(`  FAIL #${t.id} -> ${r.status} ${(await r.text()).slice(0, 140)}`); }
  }
}
console.log(JSON.stringify({ mode: DRY ? 'dry-run' : 'live', ...dist }, null, 1));
for (const e of examples) console.log(`  #${e.id} ${e.slug}: ${JSON.stringify(e.patch)}  <- ${e.title}`);
