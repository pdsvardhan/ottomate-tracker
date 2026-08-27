// GET /api/verify/gate?project_slug=<slug>&commit_sha=<sha>
//
// The COMMIT-SPECIFIC deploy gate (Phase 3, P3-C) — makes SKILL.md:55 ("feature
// verifier APPROVE on every user-facing feature vs the current commit") actually
// compute. Read-only, no auth (it only reads the registry). The Stage-3→deploy
// step (and 4.8 integrate) calls this with the DEPLOYING commit and refuses on
// any `blocking` entry for a gated project. Complements the standing rule R6
// (/api/anti-gaslight/violations, commit-agnostic) with a per-commit check so a
// stale APPROVE at an OLD commit does not count as shipping the new one.
//
// For each user-facing (ui/hybrid) feature at status='done' in the project:
//   - no linked flow                         → 'no-flow'
//   - a linked flow with no linked_playwright_test → 'no-test'
//   - a linked_playwright_test that does not EXIST in the repo → 'test-missing'
//     (added 2026-08-27, Plan B item B3: the gate accepted any non-empty string as proof of a
//     test and never looked. flow-music-upload declared a path belonging to a different
//     project's checkout and scored as tested. See declaredTestState below.)
//   - a linked+tested flow with no APPROVE feature_verification_reports row at
//     commit_sha == <sha>                    → 'no-approve-at-commit'
// Keyed on target_id + APPROVE + commit_sha (never target_kind: reports in
// practice carry 'stage-3-feature' with target_id = the flow id).
//
// Bucketing by ramp: gate='block' → issues are `blocking`, ok=false if any;
// gate='warn' → issues are `warnings`, ok=true (advisory); gate='off' → issues
// are `warnings`, ok=true (advisory only).

import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import type Database from 'better-sqlite3';
import { getRawSqlite } from '@/lib/db/client';

export const runtime = 'nodejs';

function hasTable(sqlite: Database.Database, name: string): boolean {
  return !!sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name);
}

interface GateIssue {
  feature_id: string;
  feature_title: string;
  flow_id: string | null;
  reason: 'no-flow' | 'no-test' | 'test-missing' | 'no-approve-at-commit';
  /** Only on 'test-missing': the path that was declared but does not exist. */
  declared_test?: string;
}

/**
 * Does a flow's declared Playwright test actually EXIST?
 *
 * The gate used to accept any non-empty string as proof a flow was tested, and never looked.
 * Measured 2026-08-27: `flow-music-upload` declared
 * `skills/ottomate/scripts/feature-verify/sandboxes/screenroom-music/music-upload.verify.mjs`,
 * a path that is not in the screenroom repo at all — the only copies on the box belong to a
 * different project's checkout — and the gate scored that flow as tested. It backs success
 * criterion 105. A check that cannot fail is not a check.
 *
 * Project repos are mounted read-only at /repos (docker-compose: /mnt/storage/websites:/repos:ro).
 *
 * Returns 'ok' | 'missing' | 'unverifiable'. **'unverifiable' is deliberately NOT 'missing'**:
 * if the repo is not mounted (a dev box, a changed mount) every flow would otherwise report a
 * missing test at once, and a gate that cries wolf on its whole input teaches people to ignore
 * it. We only assert absence when we can see the repo and the file is genuinely not in it.
 */
function declaredTestState(slug: string, relPath: string): 'ok' | 'missing' | 'unverifiable' {
  const repoRoot = path.resolve('/repos', slug);
  if (!fs.existsSync(repoRoot)) return 'unverifiable';

  /* #679: a declared test must be a FILE.
   *
   * Measured on the real /repos mount: `linked_playwright_test: '.'` passed. It resolved to the
   * repo root, the old `abs !== repoRoot` guard let the root through as "inside its own repo",
   * and `existsSync` was then trivially true because the repo directory exists. So the gate
   * proved A PATH EXISTS, which is not the question — the question is whether a test exists.
   * Any project could satisfy the ship gate with a single dot.
   *
   * The repo root is now explicitly refused, and `isFile()` replaces `existsSync` so a directory
   * anywhere else in the tree ('tests/', 'tests/e2e/') cannot stand in for a test either.
   * A symlink is followed deliberately — statSync, not lstatSync — because a symlink TO a real
   * test file is a real test; it is the directory that is not. */
  const abs = path.resolve(repoRoot, relPath);
  // A declared path must stay inside its own repo — '../..' is not a test, it is an escape.
  if (!abs.startsWith(repoRoot + path.sep)) return 'missing';
  try {
    return fs.statSync(abs).isFile() ? 'ok' : 'missing';
  } catch {
    return 'missing';
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const project_slug = url.searchParams.get('project_slug');
  const commit_sha = url.searchParams.get('commit_sha');
  if (!project_slug) return NextResponse.json({ error: 'project_slug query param required' }, { status: 400 });
  if (!commit_sha) return NextResponse.json({ error: 'commit_sha query param required' }, { status: 400 });

  // 2026-08-11 — the gate used to compare commit_sha with `=`, so a caller passing a short sha
  // against full-sha rows (or the reverse) got a clean "no-approve-at-commit" that looked like
  // missing verification rather than a format mismatch. Stored rows genuinely hold both shapes.
  // Fix is two-sided: writes are pinned to 40-hex (POST /api/feature-verification-reports) and
  // reads resolve by prefix. 7 is git's own abbreviation floor; below that a prefix is ambiguous
  // enough that silently matching would be worse than refusing.
  const sha = commit_sha.trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(sha)) {
    return NextResponse.json(
      { error: `commit_sha must be 7-40 hex chars (got '${commit_sha}')` },
      { status: 400 },
    );
  }

  const sqlite = await getRawSqlite();

  const proj = sqlite
    .prepare(`SELECT slug, COALESCE(verify_gate, 'off') AS gate FROM projects WHERE slug = ?`)
    .get(project_slug) as { slug: string; gate: 'off' | 'warn' | 'block' } | undefined;
  if (!proj) return NextResponse.json({ error: `project '${project_slug}' not found` }, { status: 404 });

  const gate = proj.gate;
  const reportsExist = hasTable(sqlite, 'feature_verification_reports');

  // One row per (done ui/hybrid feature × linked flow); features with no flow
  // still appear once (LEFT JOIN → flow_id NULL).
  // Prefix-tolerant in BOTH directions: @sha may be the abbreviation of a stored full sha, or a
  // stored legacy short sha may be the abbreviation of the full @sha the caller passed. The
  // length guards stop a stray 1-char value from matching everything.
  const approveClause = reportsExist
    ? `NOT EXISTS (SELECT 1 FROM feature_verification_reports r
                    WHERE r.target_id = ff.flow_id
                      AND ( r.commit_sha = @sha
                            OR (length(@sha) >= 7 AND r.commit_sha LIKE @sha || '%')
                            OR (length(r.commit_sha) >= 7 AND @sha LIKE r.commit_sha || '%') )
                      AND r.recommendation_overall = 'APPROVE')`
    : `(@sha IS NOT NULL)`; // no reports table → nothing approved (keeps @sha bound)

  const rows = sqlite
    .prepare(
      `SELECT f.id AS feature_id, f.title AS feature_title, ff.flow_id,
              fl.linked_playwright_test AS test,
              CASE WHEN ff.flow_id IS NULL THEN 1 ELSE 0 END AS no_flow,
              CASE WHEN ff.flow_id IS NOT NULL
                    AND (fl.linked_playwright_test IS NULL OR fl.linked_playwright_test = '')
                   THEN 1 ELSE 0 END AS no_test,
              CASE WHEN ff.flow_id IS NOT NULL
                    AND fl.linked_playwright_test IS NOT NULL AND fl.linked_playwright_test != ''
                    AND ${approveClause}
                   THEN 1 ELSE 0 END AS no_approve
       FROM features f
       LEFT JOIN flow_features ff ON ff.feature_id = f.id
       LEFT JOIN flows fl ON fl.id = ff.flow_id
       WHERE f.project_slug = @slug AND f.status = 'done' AND f.type IN ('ui', 'hybrid')
       ORDER BY f.id`,
    )
    .all({ slug: project_slug, sha }) as Array<{
    feature_id: string; feature_title: string; flow_id: string | null; test: string | null;
    no_flow: number; no_test: number; no_approve: number;
  }>;

  // Cache per declared path — several features share one flow, so the same file would
  // otherwise be stat'd once per feature.
  const testState = new Map<string, 'ok' | 'missing' | 'unverifiable'>();
  const stateOf = (rel: string): 'ok' | 'missing' | 'unverifiable' => {
    let s = testState.get(rel);
    if (s === undefined) { s = declaredTestState(project_slug, rel); testState.set(rel, s); }
    return s;
  };

  const issues: GateIssue[] = [];
  for (const r of rows) {
    if (r.no_flow) issues.push({ feature_id: r.feature_id, feature_title: r.feature_title, flow_id: null, reason: 'no-flow' });
    else if (r.no_test) issues.push({ feature_id: r.feature_id, feature_title: r.feature_title, flow_id: r.flow_id, reason: 'no-test' });
    else if (r.test && stateOf(r.test) === 'missing')
      issues.push({
        feature_id: r.feature_id, feature_title: r.feature_title, flow_id: r.flow_id,
        reason: 'test-missing', declared_test: r.test,
      });
    else if (r.no_approve) issues.push({ feature_id: r.feature_id, feature_title: r.feature_title, flow_id: r.flow_id, reason: 'no-approve-at-commit' });
  }

  const checked_features = new Set(rows.map((r) => r.feature_id)).size;
  const blocking = gate === 'block' ? issues : [];
  const warnings = gate === 'block' ? [] : issues;
  const ok = gate === 'block' ? blocking.length === 0 : true;

  return NextResponse.json({
    ok,
    gate,
    project_slug,
    commit_sha: sha,
    commit_sha_matching: 'prefix',
    checked_features,
    blocking,
    warnings,
    generated_at: new Date().toISOString(),
    note:
      gate === 'off'
        ? "verify_gate='off' — advisory only, never blocks (arm with PATCH /api/projects/<slug> {verify_gate:'warn'|'block'})"
        : undefined,
  });
}
