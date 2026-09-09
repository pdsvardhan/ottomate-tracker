// Contract tests: GET /api/projects/[slug]/features include= handling (#826).
//
// Before this, `?include=acceptance_criteria` was silently ignored — the route
// never read the query string. Two verifiers on 2026-09-04 read the AC-less
// response as proof that city-wars features had no acceptance criteria and
// returned false BLOCKs. Silence is the bug; either answer it or refuse it.

import { describe, it, expect, beforeAll } from 'vitest';
import { authHeaders, makeReq, ctx } from './helpers';
import { POST as projectsPost } from '@/app/api/projects/route';
import { GET as featuresGet, POST as featuresPost } from '@/app/api/projects/[slug]/features/route';
import { POST as acPost } from '@/app/api/projects/[slug]/features/[id]/acceptance-criteria/route';

const SLUG = 'ws3-include-proj';
const FEAT = 'feat-include-ac';
const BARE = 'feat-include-none';

beforeAll(async () => {
  await projectsPost(
    makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'WS3 Include' }, authHeaders()),
  );
  for (const id of [FEAT, BARE]) {
    await featuresPost(
      makeReq('POST', `/api/projects/${SLUG}/features`, { id, title: id, status: 'planned' }, authHeaders()),
      ctx({ slug: SLUG }),
    );
  }
  for (const content of ['Renders on first load', 'Handles an empty result set']) {
    const res = await acPost(
      makeReq('POST', `/api/projects/${SLUG}/features/${FEAT}/acceptance-criteria`, { content }, authHeaders()),
      ctx({ slug: SLUG, id: FEAT }),
    );
    expect(res.status).toBe(201);
  }
});

describe('GET features — include=acceptance_criteria (#826)', () => {
  it('bare GET is unchanged: no acceptance_criteria key', async () => {
    const res = await featuresGet(makeReq('GET', `/api/projects/${SLUG}/features`), ctx({ slug: SLUG }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.features.length).toBe(2);
    expect(json.features[0]).not.toHaveProperty('acceptance_criteria');
  });

  it('include=acceptance_criteria attaches them', async () => {
    const res = await featuresGet(
      makeReq('GET', `/api/projects/${SLUG}/features?include=acceptance_criteria`),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    const withAcs = json.features.find((f: { id: string }) => f.id === FEAT);
    expect(withAcs.acceptance_criteria).toHaveLength(2);
    expect(withAcs.acceptance_criteria[0].content).toBe('Renders on first load');
  });

  it('a feature with no criteria gets [], not a missing key', async () => {
    const res = await featuresGet(
      makeReq('GET', `/api/projects/${SLUG}/features?include=acceptance_criteria`),
      ctx({ slug: SLUG }),
    );
    const json = await res.json();
    const bare = json.features.find((f: { id: string }) => f.id === BARE);
    expect(bare.acceptance_criteria).toEqual([]);
  });

  it('an unknown include key is a 400, never a silent shrug', async () => {
    const res = await featuresGet(
      makeReq('GET', `/api/projects/${SLUG}/features?include=acceptance_critera`),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('acceptance_critera');
  });
});
