// tests/verification-reports-order.test.ts — GET /api/verification-reports has ONE deterministic
// order: ran_at, then id, both newest first (iter-208). ran_at is second-granular and verifiers file
// in batches, so with ran_at alone a same-second tie was left to SQLite and "the last N" could
// differ between this endpoint and the showcase's send-back tile (19 vs 20 of the last 200 on
// 2026-11-04). The tile (app/projects/[slug]/page.tsx) uses exactly this order.
import { beforeAll, describe, expect, it } from 'vitest';
import { authHeaders, makeReq } from './helpers';
import { POST as createProject } from '@/app/api/projects/route';
import { GET as listReports, POST as createReport } from '@/app/api/verification-reports/route';

const SLUG = 'vr-order-proj';
const SHA = 'f'.repeat(40);

beforeAll(async () => {
  await createProject(makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'VR Order' }, authHeaders()));
});

async function post(verdict: 'APPROVE' | 'ITERATE' | 'BLOCK', session: string) {
  const res = await createReport(makeReq('POST', '/api/verification-reports', {
    project_slug: SLUG, target_kind: 'commit', target_id: SHA, verifier_session_id: session, recommendation_overall: verdict,
  }, authHeaders()));
  expect(res.status).toBe(201);
  return (await res.json()).report as { id: number; ran_at: string };
}

describe('GET /api/verification-reports order', () => {
  it('same-second reports come back newest id first, every time', async () => {
    // A batch of five filed inside one second (retry until they share the second).
    let batch: { id: number; ran_at: string }[] = [];
    for (let attempt = 0; attempt < 8; attempt++) {
      batch = [];
      for (const [i, v] of (['ITERATE', 'APPROVE', 'BLOCK', 'APPROVE', 'ITERATE'] as const).entries()) {
        batch.push(await post(v, `order-${attempt}-${i}`));
      }
      if (new Set(batch.map((r) => r.ran_at)).size === 1) break;
    }
    expect(new Set(batch.map((r) => r.ran_at)).size).toBe(1); // the tie case was really exercised

    const res = await listReports(makeReq('GET', `/api/verification-reports?project_slug=${SLUG}&limit=200`));
    const { reports } = (await res.json()) as { reports: { id: number; ran_at: string }[] };
    const tied = reports.filter((r) => r.ran_at === batch[0]!.ran_at).map((r) => r.id);
    const want = [...batch.map((r) => r.id)].sort((a, b) => b - a);
    expect(tied.slice(0, want.length)).toEqual(want);

    // A window that cuts INTO the tied batch keeps the newest ids, not whatever the DB returned.
    const cut = await listReports(makeReq('GET', `/api/verification-reports?project_slug=${SLUG}&limit=2`));
    const top2 = ((await cut.json()) as { reports: { id: number }[] }).reports.map((r) => r.id);
    expect(top2).toEqual(want.slice(0, 2));
  });

  it('is globally sorted: ran_at descending, then id descending', async () => {
    const res = await listReports(makeReq('GET', `/api/verification-reports?project_slug=${SLUG}&limit=200`));
    const { reports } = (await res.json()) as { reports: { id: number; ran_at: string }[] };
    for (let i = 1; i < reports.length; i++) {
      const a = reports[i - 1]!;
      const b = reports[i]!;
      const ok = a.ran_at > b.ran_at || (a.ran_at === b.ran_at && a.id > b.id);
      expect(ok, `${a.id}@${a.ran_at} before ${b.id}@${b.ran_at}`).toBe(true);
    }
  });
});
