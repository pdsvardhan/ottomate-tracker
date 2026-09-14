import { describe, it, expect, beforeAll } from 'vitest';
import { authHeaders, makeReq, ctx } from './helpers';

import { POST as createProject } from '@/app/api/projects/route';
import { POST as createFeature } from '@/app/api/projects/[slug]/features/route';
import { POST as createFlow } from '@/app/api/projects/[slug]/flows/route';
import { PUT as linkFeature } from '@/app/api/projects/[slug]/flows/[id]/links/features/[featureId]/route';
import { GET as listClaims, POST as createClaim } from '@/app/api/feature-claims/route';
import {
  GET as listReports,
  POST as createReport,
} from '@/app/api/feature-verification-reports/route';

// ── report identity (#887) ────────────────────────────────────────────────────────
// POST /api/feature-verification-reports used to name the row it had just written by
// going back and re-finding it: `WHERE target_id = ? ORDER BY ran_at DESC LIMIT 1`.
// ran_at is second-granular, so two reports for one target inside one second are
// indistinguishable to that ordering and the tie surfaced the EARLIER row. The same
// read matched on target_id alone — project_slug was absent — so the row that won the
// tie did not have to belong to the posting project either.
//
// This route is worse than the code-verifier sibling (#869, commit 9310dcc), where the
// misidentified row stopped at the response body. Here it is ALSO handed to the P3-B
// claim reconcile as `created.id`, which stamps it into feature_claims.reconciler_id —
// stored state, not an echo. Measured on the live container 2026-09-15 inside epoch
// second 1789417012: POST 2 stored id 492 / APPROVE, echoed id 491 / BLOCK, and claim
// 247 was flipped to reconciled_with='verified' citing 491 — a BLOCK report — as the
// evidence that verified it. reconcileClaimsForFlow only ever touches claims still
// marked 'unreconciled', so a later correct APPROVE never repairs that attribution.
//
// Every test below asserts the two writes actually shared a ran_at second BEFORE
// judging the outcome. A pair that straddled a second boundary would not exercise the
// ambiguous case at all and would pass whatever the route did.

const SLUG = 'fvr-test-proj';
// Second project for the cross-project case: the old read-back matched on target_id
// alone, so a row in another project could win the tie and be handed back.
const SLUG2 = 'fvr-test-proj-b';

const FLOW_ECHO = 'fvr-flow-echo';
const FEAT_ECHO = 'fvr-feat-echo';

// Iteration-item target ids are bare numbers in practice, so the same string genuinely
// does appear in unrelated projects — this is the realistic cross-project collision.
const SHARED_TARGET = 'iteration-item-777';

type ReportRow = {
  id: number;
  project_slug: string;
  target_kind: string;
  target_id: string;
  ran_at: string;
  verifier_session_id: string;
  recommendation_overall: string;
  cases_total: number;
  cases_passed: number;
  cases_failed: number;
  cases_warned: number;
  mandatory_user_review: boolean;
  case_matrix: unknown;
  full_report: unknown;
};

type Reconciled = {
  flow_id: string;
  report_id: number;
  reconciled_feature_ids: string[];
  claims_updated: number;
} | null;

type ClaimRow = {
  id: number;
  feature_id: string;
  reconciled_with: string;
  reconciled_at: string | null;
  reconciler_id: number | null;
};

async function post(body: Record<string, unknown>): Promise<{ report: ReportRow; reconciled: Reconciled }> {
  const res = await createReport(makeReq('POST', '/api/feature-verification-reports', body, authHeaders()));
  expect(res.status).toBe(201);
  return (await res.json()) as { report: ReportRow; reconciled: Reconciled };
}

async function storedRows(slug: string, target: string): Promise<ReportRow[]> {
  const res = await listReports(
    makeReq('GET', `/api/feature-verification-reports?project_slug=${slug}&target_id=${target}`),
  );
  return ((await res.json()) as { reports: ReportRow[] }).reports;
}

async function claimsFor(featureId: string): Promise<ClaimRow[]> {
  const res = await listClaims(makeReq('GET', `/api/feature-claims?feature_id=${featureId}`));
  return ((await res.json()) as { claims: ClaimRow[] }).claims;
}

async function makeFlow(slug: string, flowId: string, featureId: string) {
  await createFeature(
    makeReq('POST', `/api/projects/${slug}/features`, { id: featureId, title: `feature ${featureId}`, type: 'ui', status: 'planned' }, authHeaders()),
    ctx({ slug }),
  );
  await createFlow(
    makeReq('POST', `/api/projects/${slug}/flows`, { id: flowId, title: `flow ${flowId}`, type: 'ui' }, authHeaders()),
    ctx({ slug }),
  );
  await linkFeature(
    makeReq('PUT', `/api/projects/${slug}/flows/${flowId}/links/features/${featureId}`, {}, authHeaders()),
    ctx({ slug, id: flowId, featureId }),
  );
}

beforeAll(async () => {
  await createProject(makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'FVR Test' }, authHeaders()));
  await createProject(makeReq('POST', '/api/projects', { slug: SLUG2, display_name: 'FVR Test B' }, authHeaders()));
  await makeFlow(SLUG, FLOW_ECHO, FEAT_ECHO);
});

/**
 * Writes two reports back to back, retrying until the pair lands inside a single ran_at
 * second — the condition under which the old read-back could not tell them apart. Two
 * in-process inserts take microseconds, so this effectively never loops.
 */
async function tiedPair(make: (label: 'first' | 'second') => Record<string, unknown>) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const first = await post(make('first'));
    const second = await post(make('second'));
    if (first.report.ran_at === second.report.ran_at) return { first, second };
  }
  throw new Error('two inserts never shared a ran_at second — the tie case was not exercised');
}

describe('/api/feature-verification-reports — the row the POST works with is the row it wrote (#887)', () => {
  it('gives each of two same-second reports on one flow its own row', async () => {
    const { first, second } = await tiedPair((label) => ({
      project_slug: SLUG,
      target_kind: 'flow',
      target_id: FLOW_ECHO,
      verifier_session_id: `echo-flow-${label}`,
      recommendation_overall: label === 'first' ? 'BLOCK' : 'ITERATE',
    }));

    expect(first.report.ran_at).toBe(second.report.ran_at); // the tie the old ordering could not break
    expect(second.report.id).not.toBe(first.report.id);
    expect(first.report.verifier_session_id).toBe('echo-flow-first');
    expect(first.report.recommendation_overall).toBe('BLOCK');
    expect(second.report.verifier_session_id).toBe('echo-flow-second');
    expect(second.report.recommendation_overall).toBe('ITERATE');

    // The returned row must BE the stored row, not merely a plausible one.
    const stored = (await storedRows(SLUG, FLOW_ECHO)).find((r) => r.id === second.report.id);
    expect(stored, 'the returned id must exist in the table').toBeDefined();
    expect(stored!.recommendation_overall).toBe('ITERATE');
    expect(stored!.verifier_session_id).toBe('echo-flow-second');
  });

  it('attributes the P3-B claim reconcile to the report that was actually written', async () => {
    // The consumer that makes this route worse than its sibling: `created.id` is written
    // into feature_claims.reconciler_id. A misidentified row here does not stop at the
    // response — it becomes the ledger's permanent record of what verified the claim.
    //
    // Each attempt gets its own flow/feature/claim, because the first APPROVE consumes
    // the claim and a retry must not judge an already-reconciled one.
    for (let attempt = 0; attempt < 8; attempt++) {
      const flowId = `fvr-flow-recon-${attempt}`;
      const featId = `fvr-feat-recon-${attempt}`;
      await makeFlow(SLUG, flowId, featId);
      await createClaim(
        makeReq('POST', '/api/feature-claims', { feature_id: featId, source: 'skill-auto', claimed_by_session: `recon-${attempt}`, claim_text: 'done' }, authHeaders()),
      );

      const body = (label: string, verdict: string) => ({
        project_slug: SLUG,
        target_kind: 'flow',
        target_id: flowId,
        verifier_session_id: `recon-${label}`,
        recommendation_overall: verdict,
      });
      // BLOCK first, then APPROVE: only the APPROVE reconciles, and under the old
      // read-back it reconciled citing the BLOCK's id.
      const first = await post(body('first', 'BLOCK'));
      const second = await post(body('second', 'APPROVE'));
      if (first.report.ran_at !== second.report.ran_at) continue;

      expect(second.report.id).not.toBe(first.report.id);
      expect(second.report.recommendation_overall).toBe('APPROVE');
      expect(first.report.recommendation_overall).toBe('BLOCK');

      // The reconcile must cite the APPROVE that triggered it, never the BLOCK.
      expect(second.reconciled).not.toBeNull();
      expect(second.reconciled!.claims_updated).toBe(1);
      expect(second.reconciled!.report_id).toBe(second.report.id);
      expect(second.reconciled!.report_id).not.toBe(first.report.id);

      // …and that must be what the ledger actually holds, not just what was reported.
      const [claim] = await claimsFor(featId);
      expect(claim.reconciled_with).toBe('verified');
      expect(claim.reconciler_id).toBe(second.report.id);

      const cited = (await storedRows(SLUG, flowId)).find((r) => r.id === claim.reconciler_id);
      expect(cited, 'the cited report must exist').toBeDefined();
      expect(cited!.recommendation_overall, 'a claim must never cite a BLOCK as its verification').toBe('APPROVE');
      return;
    }
    throw new Error('two inserts never shared a ran_at second — the tie case was not exercised');
  });

  it("never returns another project's row for the same target_id", async () => {
    const { first, second } = await tiedPair((label) => ({
      project_slug: label === 'first' ? SLUG : SLUG2,
      target_kind: 'stage-4-iteration-item',
      target_id: SHARED_TARGET,
      verifier_session_id: `echo-xproj-${label}`,
      recommendation_overall: label === 'first' ? 'BLOCK' : 'APPROVE',
    }));

    expect(first.report.ran_at).toBe(second.report.ran_at);
    expect(second.report.id).not.toBe(first.report.id);
    expect(first.report.project_slug).toBe(SLUG);
    expect(second.report.project_slug).toBe(SLUG2);
    expect(second.report.recommendation_overall).toBe('APPROVE');
    expect(second.report.verifier_session_id).toBe('echo-xproj-second');
    // The reconcile id must not leak across the project boundary either.
    expect(second.reconciled!.report_id).toBe(second.report.id);
  });

  it('returns typed columns in the same shape a table read does', async () => {
    // Returning the insert's own row must not change how timestamp / boolean / json
    // columns arrive, nor the counts derived from the matrix — that mapping is what
    // every caller of this 201 already parses.
    const { report } = await post({
      project_slug: SLUG,
      target_kind: 'flow',
      target_id: FLOW_ECHO,
      verifier_session_id: 'echo-shape',
      recommendation_overall: 'ITERATE',
      mandatory_user_review: true,
      evidence_root: '/tmp/fvr-evidence',
      case_matrix: [
        { case: 'happy path', outcome: 'pass' },
        { case: 'empty input', outcome: 'fail' },
        { case: 'slow network', outcome: 'warn' },
      ],
      full_report: { summary: 'shape check' },
    });

    expect(typeof report.ran_at).toBe('string'); // mapped timestamp, not a raw epoch int
    expect(Number.isNaN(Date.parse(report.ran_at))).toBe(false);
    expect(report.mandatory_user_review).toBe(true);
    expect(report.case_matrix).toHaveLength(3);
    expect(report.full_report).toEqual({ summary: 'shape check' });
    // Counts are derived from the matrix at insert time, so they must come back too.
    expect(report.cases_total).toBe(3);
    expect(report.cases_passed).toBe(1);
    expect(report.cases_failed).toBe(1);
    expect(report.cases_warned).toBe(1);

    const stored = (await storedRows(SLUG, FLOW_ECHO)).find((r) => r.id === report.id);
    expect(stored).toBeDefined();
    expect(stored!.ran_at).toBe(report.ran_at);
    expect(stored!.mandatory_user_review).toBe(report.mandatory_user_review);
    expect(stored!.case_matrix).toEqual(report.case_matrix);
    expect(stored!.full_report).toEqual(report.full_report);
    expect(stored!.cases_total).toBe(report.cases_total);
  });
});
