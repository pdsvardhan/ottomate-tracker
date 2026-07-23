// Feature-verify harness — the case×outcome matrix, the verdict, and the three POSTs (Task 3).
// The rich report goes to the feature verifier's OWN sink; per-critical-flow pass/fail is
// mirrored to flow_test_runs (what the Stage-3 deploy gate reads); the CI subset to test_runs.

import type { APIRequestContext } from '@playwright/test';
import type { FeatureVerifyConfig } from './config';

export type Outcome = 'pass' | 'fail' | 'warn' | 'skipped';

export interface CaseResult {
  case: string;
  variant?: string;              // happy | edge | error | data
  axis?: string;                 // the decision/input this case isolates
  inputs?: unknown;
  action_log?: unknown;
  system_state?: unknown;        // the asserted real effect (fs/DB/downstream values)
  outcome: Outcome;
  evidence?: Record<string, string>; // { trace, video, screenshot, network, console, bytes }
  judge_verdict?: unknown;       // advisory AI-judge cell + the evidence it saw
}

export interface Verdict {
  recommendation_overall: 'APPROVE' | 'BLOCK' | 'ITERATE';
  mandatory_user_review: boolean;
  reason: string;
}

/** Collects case results and computes the gate verdict. Fail-closed: a skipped case is never a
 *  clean pass, and any deterministic fail blocks (or warns, per risk policy). */
export class Matrix {
  readonly results: CaseResult[] = [];

  record(r: CaseResult): void {
    this.results.push(r);
  }

  counts() {
    const c = { total: this.results.length, pass: 0, fail: 0, warn: 0, skipped: 0 };
    for (const r of this.results) c[r.outcome]++;
    return c;
  }

  verdict(riskPolicy: 'block' | 'warn'): Verdict {
    const c = this.counts();
    if (c.fail > 0) {
      return {
        recommendation_overall: 'BLOCK',
        mandatory_user_review: riskPolicy === 'block',
        reason: `${c.fail}/${c.total} case(s) failed` + (riskPolicy === 'warn' ? ' (personal → warn-recorded, not blocking)' : ''),
      };
    }
    if (c.skipped > 0) {
      return {
        recommendation_overall: 'ITERATE',
        mandatory_user_review: false,
        reason: `${c.skipped}/${c.total} case(s) could not be verified (skipped) — not a clean pass`,
      };
    }
    if (c.warn > 0) {
      return {
        recommendation_overall: 'ITERATE',
        mandatory_user_review: false,
        reason: `${c.warn}/${c.total} case(s) warned (advisory) — proceed with warnings recorded`,
      };
    }
    return { recommendation_overall: 'APPROVE', mandatory_user_review: false, reason: `all ${c.total} case(s) passed` };
  }

  /** A compact human-readable case×outcome table for summary.md + the chat. */
  renderTable(): string {
    const icon: Record<Outcome, string> = { pass: 'PASS', fail: 'FAIL', warn: 'WARN', skipped: 'SKIP' };
    const rows = this.results.map((r) => {
      const proof = r.evidence ? Object.values(r.evidence)[0] ?? '' : '';
      return `| ${icon[r.outcome]} | ${r.case}${r.variant ? ` (${r.variant})` : ''} | ${proof} |`;
    });
    return ['| outcome | case | proof |', '|---|---|---|', ...rows].join('\n');
  }
}

function authHeaders(cfg: FeatureVerifyConfig): Record<string, string> {
  return { Authorization: `Bearer ${cfg.bearerToken}`, 'Content-Type': 'application/json' };
}

/** POST the rich report to the feature verifier's sink. Returns the created row's id. */
export async function postReport(
  request: APIRequestContext,
  cfg: FeatureVerifyConfig,
  args: {
    target_kind: 'stage-3-feature' | 'stage-4-iteration-item' | 'flow';
    target_id: string;
    matrix: Matrix;
    verdict: Verdict;
    full_report?: unknown;
  },
): Promise<number | null> {
  const res = await request.post(`${cfg.trackerBase}/api/feature-verification-reports`, {
    headers: authHeaders(cfg),
    data: {
      project_slug: cfg.projectSlug,
      target_kind: args.target_kind,
      target_id: args.target_id,
      verifier_session_id: cfg.verifierSessionId,
      commit_sha: cfg.commitSha,
      recommendation_overall: args.verdict.recommendation_overall,
      recommendation_reason: args.verdict.reason,
      risk_policy: cfg.riskPolicy,
      mandatory_user_review: args.verdict.mandatory_user_review,
      case_matrix: args.matrix.results,
      evidence_root: cfg.evidenceRoot,
      full_report: args.full_report ?? null,
    },
  });
  if (!res.ok()) throw new Error(`postReport → ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { report?: { id?: number } };
  return body.report?.id ?? null;
}

/** Mirror per-critical-flow pass/fail into flow_test_runs — what the deploy gate reads.
 *  Targets trackerBase, NOT instanceUrl: flow_test_runs lives in the Ottomate tracker, while
 *  instanceUrl is the app under test. (Fixed 2026-07-23 — using instanceUrl worked only because
 *  Ottomate dogfoods itself and the two happened to be the same origin; on any other project it
 *  would POST to the target app, which has no such endpoint.) */
export async function postFlowTestRun(
  request: APIRequestContext,
  cfg: FeatureVerifyConfig,
  flowId: string,
  status: 'passing' | 'failing' | 'not-tested',
  notes?: string,
): Promise<void> {
  const res = await request.post(`${cfg.trackerBase}/api/flows/${encodeURIComponent(flowId)}/test`, {
    headers: authHeaders(cfg),
    data: { status, ran_by: 'automated', notes: notes ?? null },
  });
  if (!res.ok()) throw new Error(`postFlowTestRun(${flowId}) → ${res.status()} ${await res.text()}`);
}

/** Record the run in test_runs — the CI/nightly substrate (anti-gaslight Rule 4).
 *  Referenced by the method + prompt as the nightly-subset sink; this is that helper. */
export async function postTestRun(
  request: APIRequestContext,
  cfg: FeatureVerifyConfig,
  args: {
    matrix: Matrix;
    commit_sha: string;
    branch?: string;
    triggered_by?: 'push' | 'schedule' | 'manual' | 'iteration';
    notes?: string;
  },
): Promise<void> {
  const c = args.matrix.counts();
  const res = await request.post(`${cfg.trackerBase}/api/test-runs`, {
    headers: authHeaders(cfg),
    data: {
      project_slug: cfg.projectSlug,
      commit_sha: args.commit_sha,
      branch: args.branch,
      result: c.fail > 0 ? 'failed' : c.skipped > 0 ? 'partial' : 'passed',
      total: c.total,
      passed: c.pass,
      failed: c.fail,
      skipped: c.skipped,
      per_test_results: args.matrix.results,
      triggered_by: args.triggered_by ?? 'schedule',
      notes: args.notes ?? null,
    },
  });
  if (!res.ok()) throw new Error(`postTestRun → ${res.status()} ${await res.text()}`);
}
