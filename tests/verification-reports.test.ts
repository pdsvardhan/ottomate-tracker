import { describe, it, expect, beforeAll } from 'vitest';
import { authHeaders, makeReq } from './helpers';

import { POST as createProject } from '@/app/api/projects/route';
import { POST as createFeature } from '@/app/api/projects/[slug]/features/route';
import { GET as listReports, POST as createReport } from '@/app/api/verification-reports/route';
import { ctx } from './helpers';

const SLUG = 'vr-test-proj';

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
});
