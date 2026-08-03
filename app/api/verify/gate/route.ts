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
//   - a linked+tested flow with no APPROVE feature_verification_reports row at
//     commit_sha == <sha>                    → 'no-approve-at-commit'
// Keyed on target_id + APPROVE + commit_sha (never target_kind: reports in
// practice carry 'stage-3-feature' with target_id = the flow id).
//
// Bucketing by ramp: gate='block' → issues are `blocking`, ok=false if any;
// gate='warn' → issues are `warnings`, ok=true (advisory); gate='off' → issues
// are `warnings`, ok=true (advisory only).

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
  reason: 'no-flow' | 'no-test' | 'no-approve-at-commit';
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const project_slug = url.searchParams.get('project_slug');
  const commit_sha = url.searchParams.get('commit_sha');
  if (!project_slug) return NextResponse.json({ error: 'project_slug query param required' }, { status: 400 });
  if (!commit_sha) return NextResponse.json({ error: 'commit_sha query param required' }, { status: 400 });

  const sqlite = await getRawSqlite();

  const proj = sqlite
    .prepare(`SELECT slug, COALESCE(verify_gate, 'off') AS gate FROM projects WHERE slug = ?`)
    .get(project_slug) as { slug: string; gate: 'off' | 'warn' | 'block' } | undefined;
  if (!proj) return NextResponse.json({ error: `project '${project_slug}' not found` }, { status: 404 });

  const gate = proj.gate;
  const reportsExist = hasTable(sqlite, 'feature_verification_reports');

  // One row per (done ui/hybrid feature × linked flow); features with no flow
  // still appear once (LEFT JOIN → flow_id NULL).
  const approveClause = reportsExist
    ? `NOT EXISTS (SELECT 1 FROM feature_verification_reports r
                    WHERE r.target_id = ff.flow_id
                      AND r.commit_sha = @sha
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
    .all({ slug: project_slug, sha: commit_sha }) as Array<{
    feature_id: string; feature_title: string; flow_id: string | null;
    no_flow: number; no_test: number; no_approve: number;
  }>;

  const issues: GateIssue[] = [];
  for (const r of rows) {
    if (r.no_flow) issues.push({ feature_id: r.feature_id, feature_title: r.feature_title, flow_id: null, reason: 'no-flow' });
    else if (r.no_test) issues.push({ feature_id: r.feature_id, feature_title: r.feature_title, flow_id: r.flow_id, reason: 'no-test' });
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
    commit_sha,
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
