// Contract tests: anti-gaslight rule 3 enforcement on the features routes
// (status='building' requires >=1 acceptance criterion).

import { describe, it, expect, beforeAll } from 'vitest';
import { authHeaders, makeReq, ctx } from './helpers';
import { POST as projectsPost } from '@/app/api/projects/route';
import { POST as featuresPost } from '@/app/api/projects/[slug]/features/route';
import { PATCH as featurePatch } from '@/app/api/projects/[slug]/features/[id]/route';
import { POST as acPost } from '@/app/api/projects/[slug]/features/[id]/acceptance-criteria/route';

const SLUG = 'ws3-feature-proj';
const FEAT = 'feat-ws3-gate';

beforeAll(async () => {
  const res = await projectsPost(
    makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'WS3 Feature Gate' }, authHeaders()),
  );
  expect(res.status).toBe(201);
});

describe('anti-gaslight rule 3 gate on features', () => {
  it('POST with status=building is rejected (422 anti_gaslight_rule_3_violation)', async () => {
    const res = await featuresPost(
      makeReq(
        'POST',
        `/api/projects/${SLUG}/features`,
        { id: FEAT, title: 'Gated feature', status: 'building' },
        authHeaders(),
      ),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('anti_gaslight_rule_3_violation');
  });

  it('POST with status=planned creates the feature (201)', async () => {
    const res = await featuresPost(
      makeReq(
        'POST',
        `/api/projects/${SLUG}/features`,
        { id: FEAT, title: 'Gated feature', status: 'planned' },
        authHeaders(),
      ),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(201);
  });

  it('PATCH to building with 0 acceptance criteria is rejected (422)', async () => {
    const res = await featurePatch(
      makeReq('PATCH', `/api/projects/${SLUG}/features/${FEAT}`, { status: 'building' }, authHeaders()),
      ctx({ slug: SLUG, id: FEAT }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('anti_gaslight_rule_3_violation');
  });

  it('after POSTing 1 acceptance criterion, PATCH to building succeeds (200)', async () => {
    const acRes = await acPost(
      makeReq(
        'POST',
        `/api/projects/${SLUG}/features/${FEAT}/acceptance-criteria`,
        { content: 'Renders without error on first load' },
        authHeaders(),
      ),
      ctx({ slug: SLUG, id: FEAT }),
    );
    expect(acRes.status).toBe(201);

    const res = await featurePatch(
      makeReq('PATCH', `/api/projects/${SLUG}/features/${FEAT}`, { status: 'building' }, authHeaders()),
      ctx({ slug: SLUG, id: FEAT }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.feature.status).toBe('building');
  });
});
