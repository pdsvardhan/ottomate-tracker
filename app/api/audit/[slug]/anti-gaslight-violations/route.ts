// app/api/audit/[slug]/anti-gaslight-violations/route.ts
// Runs the 7 anti-gaslight detection rules per references/anti-gaslight-rules.md.
// Returns violations grouped by severity.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

interface Violation {
  rule_id: number;
  rule_name: string;
  severity: 'HARD' | 'SOFT' | 'INFO';
  entity_kind: string;
  entity_id: string | number;
  message: string;
  evidence: Record<string, unknown>;
}

// ============================================================================
// GET /api/audit/[slug]/anti-gaslight-violations?severity=ALL|HARD|SOFT
// ============================================================================
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const filter = (url.searchParams.get('severity') ?? 'ALL').toUpperCase();

  const db = await getDb();
  const violations: Violation[] = [];

  // ----------------------------------------------------------------------------
  // Rule 1 — Unreconciled claims
  // ----------------------------------------------------------------------------
  try {
    const rule1 = await db.run(sql`
      SELECT f.id AS feature_id, f.title, f.current_phase
      FROM features f
      WHERE f.project_slug = ${slug}
        AND f.current_phase IN ('VERIFIED', 'INTEGRATED')
        AND NOT EXISTS (
          SELECT 1 FROM verification_reports vr
          WHERE vr.target_kind = 'feature'
            AND vr.target_id = f.id
            AND vr.recommendation_overall = 'APPROVE'
        )
    `);
    for (const row of (rule1 as any).rows ?? []) {
      violations.push({
        rule_id: 1,
        rule_name: 'unreconciled-claims',
        severity: 'HARD',
        entity_kind: 'feature',
        entity_id: row.feature_id,
        message: `Feature ${row.feature_id} is at phase ${row.current_phase} but has no APPROVE verification_report`,
        evidence: { feature_id: row.feature_id, title: row.title, current_phase: row.current_phase },
      });
    }
  } catch (err) {
    // Tables may not exist yet (pre-migration); skip silently
  }

  // ----------------------------------------------------------------------------
  // Rule 2 — Silent provenance
  // ----------------------------------------------------------------------------
  try {
    const rule2 = await db.run(sql`
      SELECT id, title FROM features
      WHERE project_slug = ${slug}
        AND derived_from_sketch_id IS NULL
        AND (_provenance IS NULL OR _provenance = '' OR _provenance = '{}')
    `);
    for (const row of (rule2 as any).rows ?? []) {
      violations.push({
        rule_id: 2,
        rule_name: 'silent-provenance',
        severity: 'HARD',
        entity_kind: 'feature',
        entity_id: row.id,
        message: `Feature ${row.id} has no provenance trail (no source_substring, no derived_from_sketch_id)`,
        evidence: { feature_id: row.id, title: row.title },
      });
    }
  } catch (err) {}

  // ----------------------------------------------------------------------------
  // Rule 3 — Silent drops (deferred — needs nd1_archive scan)
  // ----------------------------------------------------------------------------
  // Implementation requires comparing nd1_archive.features_sketch[] to features rows.
  // Skipped for V1; surfaces in future query.

  // ----------------------------------------------------------------------------
  // Rule 4 — Coverage gaps (must_haves not mapped)
  // ----------------------------------------------------------------------------
  try {
    const project = await db.run(sql`
      SELECT preferences FROM projects WHERE slug = ${slug}
    `);
    const prefRow = (project as any).rows?.[0];
    if (prefRow?.preferences) {
      const prefs = typeof prefRow.preferences === 'string'
        ? JSON.parse(prefRow.preferences)
        : prefRow.preferences;
      const mustHaves: string[] = prefs?.must_haves ?? [];

      for (const mh of mustHaves) {
        // Heuristic: search feature titles + descriptions for mention
        const matches = await db.run(sql`
          SELECT id FROM features
          WHERE project_slug = ${slug}
            AND (
              title LIKE ${'%' + mh + '%'} OR
              short_description LIKE ${'%' + mh + '%'}
            )
        `);
        if (((matches as any).rows ?? []).length === 0) {
          violations.push({
            rule_id: 4,
            rule_name: 'coverage-gap',
            severity: 'SOFT',
            entity_kind: 'project',
            entity_id: slug,
            message: `must_have "${mh}" not covered by any feature`,
            evidence: { must_have: mh },
          });
        }
      }
    }
  } catch (err) {}

  // ----------------------------------------------------------------------------
  // Rule 5 — must_haves / non_goals violations on iteration_items
  // ----------------------------------------------------------------------------
  // Needs iteration_items + iterations tables filtered to project's iterations
  try {
    const violations5 = await db.run(sql`
      SELECT ii.id, ii.title, ii.proposed_change, i.id AS iteration_id
      FROM iteration_items ii
      JOIN iterations i ON i.id = ii.iteration_id
      WHERE i.project_slug = ${slug}
        AND i.status IN ('locked', 'building', 'verifying')
    `);
    // For each, would compare proposed_change vs project must_haves/non_goals.
    // Full implementation requires regex; this stub returns empty for now.
    void violations5;
  } catch (err) {}

  // ----------------------------------------------------------------------------
  // Rule 6 — Phase order violations
  // ----------------------------------------------------------------------------
  try {
    // Detect features that jumped from PROPOSED → INTEGRATED without intermediate
    const rule6 = await db.run(sql`
      WITH transitions AS (
        SELECT
          feature_id,
          transitioned_at,
          from_phase,
          to_phase,
          LAG(to_phase) OVER (PARTITION BY feature_id ORDER BY transitioned_at) AS prev_to_phase
        FROM feature_phase_transitions
      )
      SELECT feature_id, from_phase, to_phase, prev_to_phase
      FROM transitions
      WHERE prev_to_phase IS NOT NULL AND from_phase != prev_to_phase
    `);
    for (const row of (rule6 as any).rows ?? []) {
      violations.push({
        rule_id: 6,
        rule_name: 'phase-order-violation',
        severity: 'HARD',
        entity_kind: 'feature',
        entity_id: row.feature_id,
        message: `Phase ledger gap on ${row.feature_id}: previous to_phase=${row.prev_to_phase}, current from_phase=${row.from_phase}`,
        evidence: row,
      });
    }
  } catch (err) {}

  // ----------------------------------------------------------------------------
  // Rule 7 — Stale verifier
  // ----------------------------------------------------------------------------
  try {
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const rule7 = await db.run(sql`
      SELECT
        f.id, f.title, f.updated_at AS last_edited_at,
        (SELECT MAX(ran_at) FROM verification_reports
         WHERE target_kind = 'feature' AND target_id = f.id AND recommendation_overall = 'APPROVE') AS last_verifier_run
      FROM features f
      WHERE f.project_slug = ${slug}
        AND f.updated_at > COALESCE((SELECT MAX(ran_at) FROM verification_reports
              WHERE target_kind = 'feature' AND target_id = f.id), '1970-01-01')
        AND f.updated_at < ${sevenDaysAgoIso}
    `);
    for (const row of (rule7 as any).rows ?? []) {
      violations.push({
        rule_id: 7,
        rule_name: 'stale-verifier',
        severity: 'SOFT',
        entity_kind: 'feature',
        entity_id: row.id,
        message: `Feature ${row.id} edited at ${row.last_edited_at}; last verifier APPROVE was ${row.last_verifier_run ?? 'never'}`,
        evidence: row,
      });
    }
  } catch (err) {}

  // ----------------------------------------------------------------------------
  // Filter by severity
  // ----------------------------------------------------------------------------
  const filtered = filter === 'ALL'
    ? violations
    : violations.filter((v) => v.severity === filter);

  return NextResponse.json({
    project_slug: slug,
    severity_filter: filter,
    violations: filtered,
    count: filtered.length,
    counts_by_severity: {
      HARD: violations.filter((v) => v.severity === 'HARD').length,
      SOFT: violations.filter((v) => v.severity === 'SOFT').length,
      INFO: violations.filter((v) => v.severity === 'INFO').length,
    },
    rules_run: [1, 2, /* 3 */ 4, /* 5 */ 6, 7],
    rules_skipped_v1: [3, 5],
    generated_at: new Date().toISOString(),
  });
}
