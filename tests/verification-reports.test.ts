import { describe, it, expect, beforeAll } from 'vitest';
import { authHeaders, makeReq } from './helpers';

import { POST as createProject } from '@/app/api/projects/route';
import { POST as createFeature } from '@/app/api/projects/[slug]/features/route';
import { GET as listReports, POST as createReport } from '@/app/api/verification-reports/route';
import { ctx } from './helpers';

const SLUG = 'vr-test-proj';
// Second project for the cross-project echo case (#869): the old read-back matched on
// target_id alone, so a row in another project could win the tie and be echoed back.
const SLUG2 = 'vr-test-proj-b';

// 40-hex fixtures for the commit-target cases (#817). Any 40 hex chars will do —
// the route validates shape, never existence.
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);
const SHA_D = 'd'.repeat(40);
const SHA_E = 'e'.repeat(40);

beforeAll(async () => {
  await createProject(makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'VR Test' }, authHeaders()));
  await createFeature(
    makeReq('POST', `/api/projects/${SLUG}/features`, { id: 'feat-vr', title: 'VR feature', type: 'automated', status: 'planned' }, authHeaders()),
    ctx({ slug: SLUG }),
  );
  await createProject(makeReq('POST', '/api/projects', { slug: SLUG2, display_name: 'VR Test B' }, authHeaders()));
});

describe('/api/verification-reports', () => {
  it('rejects unauthenticated POST', async () => {
    const res = await createReport(
      makeReq('POST', '/api/verification-reports', { project_slug: SLUG, target_id: 'feat-vr', verifier_session_id: 's1', recommendation_overall: 'APPROVE' }),
    );
    expect(res.status).toBe(401);
  });

  it('404s for an unknown feature', async () => {
    const res = await createReport(
      makeReq('POST', '/api/verification-reports', { project_slug: SLUG, target_id: 'feat-nope', verifier_session_id: 's1', recommendation_overall: 'APPROVE' }, authHeaders()),
    );
    expect(res.status).toBe(404);
  });

  it('persists an APPROVE report and lists it', async () => {
    const res = await createReport(
      makeReq('POST', '/api/verification-reports', {
        project_slug: SLUG,
        target_kind: 'stage-3-feature',
        target_id: 'feat-vr',
        verifier_session_id: 'verifier-abc',
        pass_a_code_reality: 'code exists at x.ts:1',
        pass_d_acceptance_criteria: 'AC-1 pass',
        recommendation_overall: 'APPROVE',
        recommendation_reason: 'all ACs backed by code',
        full_report: { per_ac: [{ ac: 'AC-1', verdict: 'pass' }] },
      }, authHeaders()),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.report.recommendation_overall).toBe('APPROVE');
    expect(body.report.target_id).toBe('feat-vr');

    const list = await listReports(makeReq('GET', `/api/verification-reports?project_slug=${SLUG}&target_id=feat-vr`));
    const lb = await list.json();
    expect(lb.count).toBeGreaterThanOrEqual(1);
    expect(lb.reports[0].verifier_session_id).toBe('verifier-abc');
  });

  it('rejects an invalid recommendation value', async () => {
    const res = await createReport(
      makeReq('POST', '/api/verification-reports', { project_slug: SLUG, target_id: 'feat-vr', verifier_session_id: 's1', recommendation_overall: 'MAYBE' }, authHeaders()),
    );
    expect(res.status).toBe(422);
  });

  // ── commit / commit-range targets (#817) ────────────────────────────────────
  // A verification covering a commit used to 404 as a missing feature and vanish.

  it('persists a commit-targeted BLOCK and reads it back', async () => {
    const res = await createReport(
      makeReq('POST', '/api/verification-reports', {
        project_slug: SLUG,
        target_kind: 'commit',
        target_id: SHA_A,
        verifier_session_id: 'verifier-commit',
        pass_a_code_reality: 'diff touches 3 files, none of them the claimed one',
        recommendation_overall: 'BLOCK',
        recommendation_reason: 'ship claim not supported by the diff',
      }, authHeaders()),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.report.target_kind).toBe('commit');
    expect(body.report.target_id).toBe(SHA_A);

    const list = await listReports(makeReq('GET', `/api/verification-reports?project_slug=${SLUG}&target_id=${SHA_A}`));
    const lb = await list.json();
    expect(lb.count).toBe(1);
    expect(lb.reports[0].recommendation_overall).toBe('BLOCK');
    expect(lb.reports[0].verifier_session_id).toBe('verifier-commit');
  });

  it('canonicalises a commit sha to lowercase so the exact-match read finds it', async () => {
    const res = await createReport(
      makeReq('POST', '/api/verification-reports', {
        project_slug: SLUG,
        target_kind: 'commit',
        target_id: `  ${SHA_B.toUpperCase()}  `,
        verifier_session_id: 'verifier-case',
        recommendation_overall: 'APPROVE',
      }, authHeaders()),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.report.target_id).toBe(SHA_B);
  });

  it('persists a commit-range target', async () => {
    const range = `${SHA_A}..${SHA_B}`;
    const res = await createReport(
      makeReq('POST', '/api/verification-reports', {
        project_slug: SLUG,
        target_kind: 'commit-range',
        target_id: range,
        verifier_session_id: 'verifier-range',
        recommendation_overall: 'ITERATE',
      }, authHeaders()),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.report.target_kind).toBe('commit-range');
    expect(body.report.target_id).toBe(range);
  });

  it('rejects a short sha, a non-hex sha and a bare word as a commit target', async () => {
    for (const bad of ['5aa9efc', 'zzzz'.repeat(10), 'HEAD', `${SHA_A}..`, '']) {
      const res = await createReport(
        makeReq('POST', '/api/verification-reports', {
          project_slug: SLUG,
          target_kind: 'commit',
          target_id: bad,
          verifier_session_id: 's1',
          recommendation_overall: 'APPROVE',
        }, authHeaders()),
      );
      expect(res.status, `target_id '${bad}' must be refused`).toBe(422);
    }
  });

  it('rejects a single sha sent as a commit-range', async () => {
    const res = await createReport(
      makeReq('POST', '/api/verification-reports', {
        project_slug: SLUG,
        target_kind: 'commit-range',
        target_id: SHA_A,
        verifier_session_id: 's1',
        recommendation_overall: 'APPROVE',
      }, authHeaders()),
    );
    expect(res.status).toBe(422);
  });

  it('does not resolve a commit target against features (no FK check)', async () => {
    // The feature path still 404s on an unknown id; the commit path must not
    // borrow that check — a sha is never a feature.
    const res = await createReport(
      makeReq('POST', '/api/verification-reports', {
        project_slug: 'no-such-project',
        target_kind: 'commit',
        target_id: SHA_A,
        verifier_session_id: 's1',
        recommendation_overall: 'APPROVE',
      }, authHeaders()),
    );
    expect(res.status).toBe(404); // project must still exist
  });
});

// ── echo identity (#869) ──────────────────────────────────────────────────────────
// The 201 used to name the row it had just written by going back and re-finding it:
// `WHERE target_id = ? ORDER BY ran_at DESC LIMIT 1`. ran_at is second-granular, so two
// reports for one target inside one second are indistinguishable to that ordering and
// the response could carry the EARLIER row instead. Measured on the live container
// 2026-09-14: a BLOCK stored as id 1080 came back as id 1079 / APPROVE. The same read
// also matched on target_id alone, so the row that won the tie did not have to belong
// to the posting project — a BLOCK written to one project echoed another's APPROVE.
// The write was never wrong; a caller trusting the echoed verdict was reading a pass
// that did not happen, in the ledger whose whole job is to make that impossible.
//
// Each test below asserts the two writes actually shared a ran_at second BEFORE judging
// the echo. A pair that straddled a second boundary would not exercise the ambiguous
// case at all and would pass whatever the response path did.

type EchoRow = {
  id: number;
  project_slug: string;
  ran_at: string;
  verifier_session_id: string;
  recommendation_overall: string;
  mandatory_user_review: boolean;
  full_report: unknown;
};

describe('/api/verification-reports — the 201 echoes the row it wrote (#869)', () => {
  async function post(body: Record<string, unknown>): Promise<EchoRow> {
    const res = await createReport(makeReq('POST', '/api/verification-reports', body, authHeaders()));
    expect(res.status).toBe(201);
    return (await res.json()).report as EchoRow;
  }

  async function storedRows(slug: string, target: string): Promise<EchoRow[]> {
    const list = await listReports(makeReq('GET', `/api/verification-reports?project_slug=${slug}&target_id=${target}`));
    return (await list.json()).reports as EchoRow[];
  }

  /**
   * Writes two reports back to back, retrying until the pair lands inside a single
   * ran_at second — the condition under which the old read-back could not tell them
   * apart. Two in-process inserts take microseconds, so this effectively never loops.
   */
  async function tiedPair(make: (label: 'first' | 'second') => Record<string, unknown>) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const first = await post(make('first'));
      const second = await post(make('second'));
      if (first.ran_at === second.ran_at) return { first, second };
    }
    throw new Error('two inserts never shared a ran_at second — the tie case was not exercised');
  }

  it('gives each of two same-second reports on one feature its own row', async () => {
    const { first, second } = await tiedPair((label) => ({
      project_slug: SLUG,
      target_kind: 'stage-3-feature',
      target_id: 'feat-vr',
      verifier_session_id: `echo-feat-${label}`,
      recommendation_overall: label === 'first' ? 'APPROVE' : 'BLOCK',
    }));

    expect(first.ran_at).toBe(second.ran_at); // the tie the old ordering could not break
    expect(second.id).not.toBe(first.id);
    expect(first.verifier_session_id).toBe('echo-feat-first');
    expect(first.recommendation_overall).toBe('APPROVE');
    expect(second.verifier_session_id).toBe('echo-feat-second');
    expect(second.recommendation_overall).toBe('BLOCK');
  });

  it('gives each of two same-second commit reports the row that was actually stored', async () => {
    const { first, second } = await tiedPair((label) => ({
      project_slug: SLUG,
      target_kind: 'commit',
      target_id: SHA_C,
      verifier_session_id: `echo-commit-${label}`,
      recommendation_overall: label === 'first' ? 'APPROVE' : 'BLOCK',
    }));

    expect(first.ran_at).toBe(second.ran_at);
    expect(second.id).not.toBe(first.id);
    expect(second.recommendation_overall).toBe('BLOCK');

    // The echoed row must BE the stored row, not merely a plausible one.
    const stored = (await storedRows(SLUG, SHA_C)).find((r) => r.id === second.id);
    expect(stored, 'the echoed id must exist in the table').toBeDefined();
    expect(stored!.recommendation_overall).toBe('BLOCK');
    expect(stored!.verifier_session_id).toBe('echo-commit-second');
  });

  it("never echoes another project's row for the same target_id", async () => {
    const { first, second } = await tiedPair((label) => ({
      project_slug: label === 'first' ? SLUG : SLUG2,
      target_kind: 'commit',
      target_id: SHA_D,
      verifier_session_id: `echo-xproj-${label}`,
      recommendation_overall: label === 'first' ? 'APPROVE' : 'BLOCK',
    }));

    expect(first.ran_at).toBe(second.ran_at);
    expect(second.id).not.toBe(first.id);
    expect(first.project_slug).toBe(SLUG);
    expect(second.project_slug).toBe(SLUG2);
    expect(second.recommendation_overall).toBe('BLOCK');
  });

  it('echoes typed columns in the same shape a table read returns', async () => {
    // Returning the insert's own row must not change how timestamp / boolean / json
    // columns arrive — that mapping is what every caller of this 201 already parses.
    const report = await post({
      project_slug: SLUG,
      target_kind: 'commit',
      target_id: SHA_E,
      verifier_session_id: 'echo-shape',
      recommendation_overall: 'ITERATE',
      mandatory_user_review: true,
      full_report: { per_ac: [{ ac: 'AC-1', verdict: 'pass' }] },
    });

    expect(typeof report.ran_at).toBe('string'); // mapped timestamp, not a raw epoch int
    expect(Number.isNaN(Date.parse(report.ran_at))).toBe(false);
    expect(report.mandatory_user_review).toBe(true);
    expect(report.full_report).toEqual({ per_ac: [{ ac: 'AC-1', verdict: 'pass' }] });

    const stored = (await storedRows(SLUG, SHA_E)).find((r) => r.id === report.id);
    expect(stored).toBeDefined();
    expect(stored!.ran_at).toBe(report.ran_at);
    expect(stored!.mandatory_user_review).toBe(report.mandatory_user_review);
    expect(stored!.full_report).toEqual(report.full_report);
  });
});
