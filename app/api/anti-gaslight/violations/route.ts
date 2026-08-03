// /api/anti-gaslight/violations — read-only violation report (GET, no auth).
// SQLite reimplementation of 5 detection rules from the skill's
// references/anti-gaslight-rules.md. The SQL in that reference is
// Postgres-dialect prose — it is NOT copied here; every query below was
// written against the real SQLite schema.
//
// Schema adjustments vs the reference prose (verified against lib/db/schema.ts
// + lib/db/migrations/audit-2026-05-13/0008 DDL, 2026-06-10):
//   R1 unclaimed-done     — features has NO current_phase column (the
//                           reference's "schema additions" were never applied);
//                           the terminal value of the real status enum is
//                           'done'. Flags status='done' features that have no
//                           feature_claims row at all.
//   R2 silent-drops       — iteration_items carries no timestamps; age is
//                           taken from the parent iterations.locked_at
//                           (unix-epoch integer, julianday(...,'unixepoch')).
//   R3 missing-acceptance — real status enum is planned/building/done/blocked/
//                           dropped ('idea' does not exist); "active" means
//                           status NOT IN ('planned','dropped').
//   R4 stale-verification — verification_reports.target_kind enum value is
//                           'stage-3-feature' (not 'feature'); updated_at and
//                           ran_at are both unix-epoch integers and compare
//                           directly. Features never verified are excluded
//                           here (R1's territory).
//   R5 untested-deploys   — deploy_artifacts.deployed_at / test_runs.started_at
//                           are ISO-8601 TEXT; a deploy is untested when no
//                           test run for the same project started within the
//                           1 day before it (julianday window [0,1]).
//
// feature_claims / deploy_artifacts / test_runs live OUTSIDE drizzle's
// migration journal (applied manually via audit-2026-05-13/0008.sql), so each
// rule checks table existence first and degrades to count=0 + note instead of
// 500ing on a fresh DB.

import { NextResponse } from 'next/server';
import type Database from 'better-sqlite3';
import { getRawSqlite } from '@/lib/db/client';

export const runtime = 'nodejs';

const MAX_ITEMS = 50;

interface RuleResult {
  rule: string;
  severity: 'HARD' | 'SOFT';
  description: string;
  count: number;
  items: unknown[];
  note?: string;
}

function hasTable(sqlite: Database.Database, name: string): boolean {
  return !!sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name);
}

function runRule(
  sqlite: Database.Database,
  base: Omit<RuleResult, 'count' | 'items'>,
  fromWhere: string,
  selectCols: string,
  orderBy: string,
  params: unknown[],
): RuleResult {
  try {
    const { n } = sqlite
      .prepare(`SELECT COUNT(*) AS n ${fromWhere}`)
      .get(...params) as { n: number };
    const items = sqlite
      .prepare(`SELECT ${selectCols} ${fromWhere} ${orderBy} LIMIT ${MAX_ITEMS}`)
      .all(...params);
    return { ...base, count: n, items };
  } catch (err) {
    return { ...base, count: 0, items: [], note: `rule query failed: ${String(err)}` };
  }
}

function skipped(base: Omit<RuleResult, 'count' | 'items'>, note: string): RuleResult {
  return { ...base, count: 0, items: [], note };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const project_slug = url.searchParams.get('project_slug');
  const sqlite = await getRawSqlite();

  const slugParams = project_slug ? [project_slug] : [];
  const violations: RuleResult[] = [];

  // ── R1 unclaimed-done ────────────────────────────────────────────────────
  const r1 = {
    rule: 'unclaimed-done',
    severity: 'HARD' as const,
    description:
      "Features at status='done' with no feature_claims row — done was asserted nowhere, so it can't be reconciled with a verifier.",
  };
  if (!hasTable(sqlite, 'feature_claims')) {
    violations.push(skipped(r1, 'feature_claims table absent — ledger substrate (0008) not installed'));
  } else {
    violations.push(
      runRule(
        sqlite,
        r1,
        `FROM features f
         WHERE f.status = 'done'
           AND NOT EXISTS (SELECT 1 FROM feature_claims fc WHERE fc.feature_id = f.id)
           ${project_slug ? 'AND f.project_slug = ?' : ''}`,
        `f.id, f.title, f.status, f.project_slug`,
        'ORDER BY f.updated_at DESC',
        slugParams,
      ),
    );
  }

  // ── R2 silent-drops ──────────────────────────────────────────────────────
  violations.push(
    runRule(
      sqlite,
      {
        rule: 'silent-drops',
        severity: 'SOFT',
        description:
          'iteration_items stuck in locked/building for >7 days after the parent iteration locked, never reaching integrated/rejected. (iteration_items has no own timestamp — age comes from iterations.locked_at.)',
      },
      `FROM iteration_items ii
       JOIN iterations i ON i.id = ii.iteration_id
       WHERE ii.status IN ('locked', 'building')
         AND i.locked_at IS NOT NULL
         AND (julianday('now') - julianday(i.locked_at, 'unixepoch')) > 7
         ${project_slug ? 'AND i.project_slug = ?' : ''}`,
      `ii.id, ii.title, ii.status AS item_status, i.project_slug, i.iteration_number,
       datetime(i.locked_at, 'unixepoch') AS locked_at`,
      'ORDER BY i.locked_at ASC',
      slugParams,
    ),
  );

  // ── R3 missing-acceptance ────────────────────────────────────────────────
  violations.push(
    runRule(
      sqlite,
      {
        rule: 'missing-acceptance',
        severity: 'HARD',
        description:
          "Features past planning (status NOT IN planned/dropped) with 0 rows in feature_acceptance_criteria — nothing objective defines 'done' for them.",
      },
      `FROM features f
       WHERE f.status NOT IN ('planned', 'dropped')
         AND NOT EXISTS (
           SELECT 1 FROM feature_acceptance_criteria fac WHERE fac.feature_id = f.id
         )
         ${project_slug ? 'AND f.project_slug = ?' : ''}`,
      `f.id, f.title, f.status, f.project_slug`,
      'ORDER BY f.updated_at DESC',
      slugParams,
    ),
  );

  // ── R4 stale-verification ────────────────────────────────────────────────
  violations.push(
    runRule(
      sqlite,
      {
        rule: 'stale-verification',
        severity: 'SOFT',
        description:
          'Features edited after their latest verification_reports.ran_at (target_kind=stage-3-feature) — the last verifier verdict no longer covers current state. Never-verified features are R1 territory, not listed here.',
      },
      `FROM features f
       JOIN (
         SELECT target_id, MAX(ran_at) AS last_ran_at
         FROM verification_reports
         WHERE target_kind = 'stage-3-feature'
         GROUP BY target_id
       ) v ON v.target_id = f.id
       WHERE f.updated_at > v.last_ran_at
         ${project_slug ? 'AND f.project_slug = ?' : ''}`,
      `f.id, f.title, f.project_slug,
       datetime(f.updated_at, 'unixepoch') AS last_edited_at,
       datetime(v.last_ran_at, 'unixepoch') AS last_verified_at`,
      'ORDER BY f.updated_at DESC',
      slugParams,
    ),
  );

  // ── R5 untested-deploys ──────────────────────────────────────────────────
  const r5 = {
    rule: 'untested-deploys',
    severity: 'HARD' as const,
    description:
      'deploy_artifacts rows with no test_runs row for the same project started within the 1 day before the deploy.',
  };
  if (!hasTable(sqlite, 'deploy_artifacts')) {
    violations.push(skipped(r5, 'deploy_artifacts table absent — ledger substrate (0008) not installed'));
  } else if (!hasTable(sqlite, 'test_runs')) {
    violations.push(
      runRule(
        sqlite,
        { ...r5, description: r5.description + ' (test_runs table absent — every deploy counts as untested.)' },
        `FROM deploy_artifacts da
         WHERE 1 = 1
         ${project_slug ? 'AND da.project_slug = ?' : ''}`,
        `da.id, da.project_slug, da.commit_sha, da.deploy_url, da.deployed_at`,
        'ORDER BY da.deployed_at DESC',
        slugParams,
      ),
    );
  } else {
    violations.push(
      runRule(
        sqlite,
        r5,
        `FROM deploy_artifacts da
         WHERE NOT EXISTS (
           SELECT 1 FROM test_runs tr
           WHERE tr.project_slug = da.project_slug
             AND julianday(da.deployed_at) - julianday(tr.started_at) BETWEEN 0 AND 1
         )
         ${project_slug ? 'AND da.project_slug = ?' : ''}`,
        `da.id, da.project_slug, da.commit_sha, da.deploy_url, da.deployed_at`,
        'ORDER BY da.deployed_at DESC',
        slugParams,
      ),
    );
  }

  // ── R6 unverified-ship + R7 unreconciled-claim (Phase 3 ship-gate) ────────
  // Both only fire on projects whose verify_gate != 'off' (the ramp). Severity
  // follows the ramp: 'block' → HARD (the deploy gate refuses the transition),
  // 'warn' → SOFT (advisory). Each ITEM also carries its own severity +
  // project_slug so a whole-site call (no project_slug) stays honest when
  // projects differ; the rule-level severity is HARD iff any block-project item
  // is present (so the stage-transition gate, which refuses on any HARD, fires).
  const r6base = {
    rule: 'unverified-ship',
    severity: 'HARD' as const,
    description:
      "User-facing (ui/hybrid) features at status='done' on a gated project (verify_gate!='off') that are not verifiable: no registered flow, a linked flow with no linked_playwright_test, or a rolled-up test_status != 'passing'. HARD on a 'block' project (the deploy gate refuses), SOFT on 'warn'.",
  };
  const r7base = {
    rule: 'unreconciled-claim',
    severity: 'HARD' as const,
    description:
      "Features on a gated project (verify_gate!='off') carrying a feature_claims row still reconciled_with='unreconciled' — a 'done' assertion never reconciled against a verifier. HARD on 'block', SOFT on 'warn'. Complements unclaimed-done (R1, which catches done-with-NO-claim).",
  };

  const hasGateCol = (() => {
    try {
      return (sqlite.prepare(`PRAGMA table_info(projects)`).all() as Array<{ name: string }>)
        .some((c) => c.name === 'verify_gate');
    } catch {
      return false;
    }
  })();

  if (!hasGateCol) {
    const note = 'projects.verify_gate column absent — migration 0012 not applied';
    violations.push(skipped(r6base, note));
    violations.push(skipped(r7base, note));
  } else {
    try {
      const gateRows = sqlite
        .prepare(
          `SELECT slug, COALESCE(verify_gate, 'off') AS gate FROM projects
           WHERE COALESCE(verify_gate, 'off') != 'off' ${project_slug ? 'AND slug = ?' : ''}`,
        )
        .all(...slugParams) as Array<{ slug: string; gate: string }>;
      const gateOf = new Map(gateRows.map((r) => [r.slug, r.gate]));
      const sevOf = (slug: string): 'HARD' | 'SOFT' => (gateOf.get(slug) === 'block' ? 'HARD' : 'SOFT');

      if (gateOf.size === 0) {
        const note = project_slug
          ? `project '${project_slug}' is not gated (verify_gate='off') — advisory only`
          : 'no gated projects (all verify_gate=off) — advisory only';
        violations.push(skipped(r6base, note));
        violations.push(skipped(r7base, note));
      } else {
        const gatedSlugs = [...gateOf.keys()];
        const ph = gatedSlugs.map(() => '?').join(',');

        // R6 — each done ui/hybrid feature on a gated project, first failing reason.
        const feats = sqlite
          .prepare(
            `SELECT f.id, f.title, f.project_slug, f.test_status,
                    (SELECT COUNT(*) FROM flow_features ff WHERE ff.feature_id = f.id) AS n_flows,
                    (SELECT COUNT(*) FROM flow_features ff
                       JOIN flows fl ON fl.id = ff.flow_id
                      WHERE ff.feature_id = f.id
                        AND (fl.linked_playwright_test IS NULL OR fl.linked_playwright_test = '')) AS n_flows_no_test
             FROM features f
             WHERE f.status = 'done' AND f.type IN ('ui', 'hybrid')
               AND f.project_slug IN (${ph})`,
          )
          .all(...gatedSlugs) as Array<{
          id: string; title: string; project_slug: string; test_status: string | null;
          n_flows: number; n_flows_no_test: number;
        }>;

        const r6items = feats
          .map((f) => {
            const reason =
              f.n_flows === 0 ? 'no-flow'
              : f.n_flows_no_test > 0 ? 'no-test'
              : f.test_status !== 'passing' ? 'not-passing'
              : null;
            return reason
              ? { feature_id: f.id, title: f.title, project_slug: f.project_slug, reason, severity: sevOf(f.project_slug) }
              : null;
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);
        violations.push({
          ...r6base,
          severity: r6items.some((i) => i.severity === 'HARD') ? 'HARD' : 'SOFT',
          count: r6items.length,
          items: r6items.slice(0, MAX_ITEMS),
        });

        // R7 — unreconciled claims on gated projects.
        if (!hasTable(sqlite, 'feature_claims')) {
          violations.push(skipped(r7base, 'feature_claims table absent — ledger substrate (0008) not installed'));
        } else {
          const r7rows = sqlite
            .prepare(
              `SELECT fc.id AS claim_id, fc.feature_id, f.project_slug, f.title AS feature_title,
                      fc.claimed_at, fc.claimed_by_session, fc.source
               FROM feature_claims fc
               JOIN features f ON f.id = fc.feature_id
               WHERE fc.reconciled_with = 'unreconciled'
                 AND f.project_slug IN (${ph})
               ORDER BY fc.claimed_at DESC`,
            )
            .all(...gatedSlugs) as Array<{ project_slug: string } & Record<string, unknown>>;
          const r7items = r7rows.map((r) => ({ ...r, severity: sevOf(r.project_slug) }));
          violations.push({
            ...r7base,
            severity: r7items.some((i) => i.severity === 'HARD') ? 'HARD' : 'SOFT',
            count: r7items.length,
            items: r7items.slice(0, MAX_ITEMS),
          });
        }
      }
    } catch (err) {
      const note = `rule query failed: ${String(err)}`;
      violations.push(skipped(r6base, note));
      violations.push(skipped(r7base, note));
    }
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    project_slug,
    violations,
  });
}
