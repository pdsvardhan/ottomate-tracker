import { describe, it, expect, beforeAll } from 'vitest';
import { authHeaders, makeReq } from './helpers';

import { POST as createProject } from '@/app/api/projects/route';
import { POST as createFeature } from '@/app/api/projects/[slug]/features/route';
import { GET as listReports, POST as createReport } from '@/app/api/verification-reports/route';
import { ctx } from './helpers';

const SLUG = 'vr-test-proj';

// 40-hex fixtures for the commit-target cases (#817). Any 40 hex chars will do —
// the route validates shape, never existence.
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

beforeAll(async () => {
  await createProject(makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'VR Test' }, authHeaders()));
  await createFeature(
    makeReq('POST', `/api/projects/${SLUG}/features`, { id: 'feat-vr', title: 'VR feature', type: 'automated', status: 'planned' }, authHeaders()),
    ctx({ slug: SLUG }),
  );
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
