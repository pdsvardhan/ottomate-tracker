// Auto-reconcile the feature_claims ledger when a PASSING (APPROVE) feature-
// verifier report lands for a flow. feature_claims is a RAW table outside
// drizzle's journal (audit-2026-05-13/0008), so this helper takes a raw
// better-sqlite3 handle (getRawSqlite) and both writers share one path:
//   - the report POST hook (app/api/feature-verification-reports)
//   - the POST /api/coverage/recompute backfill (reconcileAllFromApproveReports)
//
// Semantics: an APPROVE feature_verification_report targets a FLOW (target_id =
// flow id; target_kind is 'stage-3-feature' or 'flow' in practice — we key on
// target_id + APPROVE, never target_kind). For every feature linked to that flow
// (flow_features), flip that feature's LATEST still-'unreconciled' claim to
// reconciled_with='verified', stamping reconciled_at=now(ISO) and reconciler_id=
// <report id> (a loose ref — feature_claims.reconciler_id has no FK constraint).
// Already-reconciled claims are left untouched (idempotent); a feature with no
// unreconciled claim is a no-op. This complements R1/R7 (the standing rules) by
// clearing the ledger the moment a verifier actually proves the flow.

import type Database from 'better-sqlite3';

export interface ReconcileResult {
  flow_id: string;
  report_id: number;
  reconciled_feature_ids: string[];
  claims_updated: number;
}

function hasTable(sqlite: Database.Database, name: string): boolean {
  return !!sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name);
}

/**
 * Reconcile the latest unreconciled claim of every feature linked to `flowId`,
 * attributing it to `reportId`. Safe to call for any target_id: if it is not a
 * flow (no flow_features rows) it is a no-op. Returns the features touched.
 */
export function reconcileClaimsForFlow(
  sqlite: Database.Database,
  flowId: string,
  reportId: number,
): ReconcileResult {
  const empty: ReconcileResult = { flow_id: flowId, report_id: reportId, reconciled_feature_ids: [], claims_updated: 0 };
  if (!hasTable(sqlite, 'feature_claims') || !hasTable(sqlite, 'flow_features')) return empty;

  const feats = sqlite
    .prepare(`SELECT feature_id FROM flow_features WHERE flow_id = ?`)
    .all(flowId) as Array<{ feature_id: string }>;
  if (feats.length === 0) return empty;

  const now = new Date().toISOString();
  const latestUnrec = sqlite.prepare(
    `SELECT id FROM feature_claims
     WHERE feature_id = ? AND reconciled_with = 'unreconciled'
     ORDER BY claimed_at DESC, id DESC LIMIT 1`,
  );
  const upd = sqlite.prepare(
    `UPDATE feature_claims
     SET reconciled_with = 'verified', reconciled_at = ?, reconciler_id = ?
     WHERE id = ?`,
  );

  const touched: string[] = [];
  let updated = 0;
  for (const { feature_id } of feats) {
    const row = latestUnrec.get(feature_id) as { id: number } | undefined;
    if (row) {
      upd.run(now, reportId, row.id);
      updated += 1;
      touched.push(feature_id);
    }
  }
  return { flow_id: flowId, report_id: reportId, reconciled_feature_ids: touched, claims_updated: updated };
}

/**
 * Backfill: for every flow that has at least one APPROVE feature_verification_
 * report, reconcile its linked features' unreconciled claims, attributing each
 * to that flow's LATEST APPROVE report. Idempotent (only touches unreconciled
 * rows). Used by POST /api/coverage/recompute.
 */
export function reconcileAllFromApproveReports(sqlite: Database.Database): ReconcileResult[] {
  if (!hasTable(sqlite, 'feature_verification_reports')) return [];
  const approvedFlows = sqlite
    .prepare(
      `SELECT target_id, MAX(id) AS report_id
       FROM feature_verification_reports
       WHERE recommendation_overall = 'APPROVE'
       GROUP BY target_id`,
    )
    .all() as Array<{ target_id: string; report_id: number }>;
  return approvedFlows
    .map((r) => reconcileClaimsForFlow(sqlite, r.target_id, r.report_id))
    .filter((r) => r.claims_updated > 0);
}
