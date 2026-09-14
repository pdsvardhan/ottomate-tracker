#!/usr/bin/env node
/**
 * adr-parity.mjs — do the ADR FILES in each repo and the ADR INDEX in the tracker agree?
 *
 * WHY THIS EXISTS (#885). The decisions sync is one-directional: `lib/sync/db-to-yaml.ts`
 * reads `adr_index` and writes `ottomate/decisions/index.yaml` out to the repo. NOTHING
 * reads decision files back in. So writing `decisions/adr-057-whatever.md` puts nothing in
 * the tracker — registering it is a separate manual POST that a session has to remember,
 * and nothing checked the two agreed.
 *
 * On 2026-09-14 that cost something concrete. Screenroom had 54 files and 52 index rows;
 * the two missing were adr-037 (role-aware request path) and adr-049 (logged-out callers
 * are bounced to login) — both accepted, both cited throughout the code and tests, both
 * absent from the tracker for roughly six weeks. The owner then ruled something that
 * directly REVERSED adr-037. The gate that is supposed to catch a ruling contradicting an
 * accepted decision reads the INDEX, not the repo, so it was blind. The conflict was found
 * only because a code comment named the ADR by number.
 *
 * A count comparison would have caught it in seconds. This is that comparison.
 *
 * MATCH ON THE NUMBER, NOT THE SLUG. The tracker strips '+' from ids, so
 * `adr-013-detail-pages-carry-real-tmdb-metadata-for-owned-+-unowned-al` on disk is
 * `...owned-unowned-al` in the index. Full-string matching reports false mismatches on at
 * least adr-013 and adr-016.
 *
 * Usage:  node scripts/adr-parity.mjs [slug ...]     (default: every project with a repo)
 * Exit 1 if any project is out of parity, so it can gate a pack-up.
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const API = process.env.OTTOMATE_API ?? "http://127.0.0.1:8110";
const WEBSITES = process.env.WEBSITES_ROOT ?? "/mnt/storage/websites";

const num = (s) => (String(s).match(/^adr-(\d+)/) ?? [, null])[1];

async function projectSlugs() {
  const r = await fetch(`${API}/api/projects`);
  const d = await r.json();
  const rows = Array.isArray(d) ? d : d.projects ?? [];
  return rows.map((p) => p.slug).filter(Boolean);
}

async function repoAdrs(slug) {
  const dir = path.join(WEBSITES, slug, "decisions");
  try {
    if (!(await stat(dir)).isDirectory()) return null;
  } catch {
    return null; // no decisions/ dir — not a finding, just nothing to compare
  }
  const files = await readdir(dir);
  return files.filter((f) => f.endsWith(".md") && f.startsWith("adr-")).map((f) => f.slice(0, -3));
}

async function indexAdrs(slug) {
  const r = await fetch(`${API}/api/projects/${slug}/adr-index`);
  if (!r.ok) return [];
  const d = await r.json();
  const rows = d.decisions ?? d.adrs ?? (Array.isArray(d) ? d : []);
  return rows.map((x) => (typeof x === "string" ? x : x.id)).filter(Boolean);
}

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : await projectSlugs();
let bad = 0;
let checked = 0;

for (const slug of slugs) {
  const files = await repoAdrs(slug);
  if (files === null) continue;
  checked += 1;
  const idx = await indexAdrs(slug);

  const fByNum = new Map(files.map((f) => [num(f), f]));
  const iByNum = new Map(idx.map((i) => [num(i), i]));

  const missingFromIndex = [...fByNum.keys()].filter((n) => n && !iByNum.has(n)).sort();
  const missingFromRepo = [...iByNum.keys()].filter((n) => n && !fByNum.has(n)).sort();

  /* TWO DIRECTIONS, ONLY ONE OF THEM IS A DEFECT.
     · a FILE the tracker does not have is the dangerous one: every gate that asks
       "does this contradict an accepted decision" reads the INDEX, so an
       unregistered ADR is a decision nothing can enforce. That is #885.
     · an INDEX ROW with no file is normal for projects that keep decision bodies
       in the tracker only and never wrote them to disk (cointrail, stateofus).
       Reported as a note, never as a failure. */
  if (!missingFromIndex.length) {
    const note = missingFromRepo.length ? `  (${missingFromRepo.length} tracker-only, no file — normal for this project)` : "";
    console.log(`  ok    ${slug.padEnd(16)} ${files.length} files, all registered${note}`);
    continue;
  }
  bad += 1;
  console.log(`  BLIND ${slug.padEnd(16)} ${missingFromIndex.length} ADR file(s) the tracker does not know about:`);
  for (const n of missingFromIndex) {
    console.log(`          ${fByNum.get(n)}`);
  }
}

console.log(
  bad === 0
    ? `\nadr-parity: ${checked} project(s) checked, all in parity`
    : `\nadr-parity: ${bad} of ${checked} project(s) OUT OF PARITY — register the missing ADRs (POST /api/projects/<slug>/adr-index) or explain the gap`,
);
process.exit(bad === 0 ? 0 : 1);
