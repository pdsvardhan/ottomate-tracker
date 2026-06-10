// Contract tests: /api/projects, /api/projects/[slug], flows + adr-index children.
// Runs sequentially within this file against one fresh throwaway DB.

import { describe, it, expect } from 'vitest';
import { authHeaders, makeReq, ctx } from './helpers';
import { GET as projectsGet, POST as projectsPost } from '@/app/api/projects/route';
import { GET as projectGet } from '@/app/api/projects/[slug]/route';
import { POST as flowsPost } from '@/app/api/projects/[slug]/flows/route';
import { POST as adrPost } from '@/app/api/projects/[slug]/adr-index/route';

const SLUG = 'ws3-test-project';

describe('/api/projects', () => {
  it('GET on a fresh DB returns an empty list', async () => {
    const res = await projectsGet();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ projects: [] });
  });

  it('POST without auth returns 401', async () => {
    const res = await projectsPost(
      makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'X' }),
    );
    expect(res.status).toBe(401);
  });

  it('POST with the wrong token returns 403', async () => {
    const res = await projectsPost(
      makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'X' }, authHeaders('wrong-token')),
    );
    expect(res.status).toBe(403);
  });

  it('POST with auth + valid body returns 201', async () => {
    const res = await projectsPost(
      makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'WS3 Test Project' }, authHeaders()),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.project.slug).toBe(SLUG);
  });

  it('POST with a duplicate slug returns 409', async () => {
    const res = await projectsPost(
      makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'Dup' }, authHeaders()),
    );
    expect(res.status).toBe(409);
  });
});

describe('/api/projects/[slug]', () => {
  it('GET unknown slug returns 404', async () => {
    const res = await projectGet(
      makeReq('GET', '/api/projects/no-such-project'),
      ctx({ slug: 'no-such-project' }),
    );
    expect(res.status).toBe(404);
  });

  it('GET created slug returns 200 with project + child arrays', async () => {
    const res = await projectGet(makeReq('GET', `/api/projects/${SLUG}`), ctx({ slug: SLUG }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.project.display_name).toBe('WS3 Test Project');
    expect(Array.isArray(json.non_goals)).toBe(true);
    expect(Array.isArray(json.success_criteria)).toBe(true);
  });
});

describe('/api/projects/[slug]/flows', () => {
  it('POST with auth creates a flow (201)', async () => {
    const res = await flowsPost(
      makeReq(
        'POST',
        `/api/projects/${SLUG}/flows`,
        { id: 'flow-ws3-smoke', title: 'WS3 smoke flow' },
        authHeaders(),
      ),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.flow.id).toBe('flow-ws3-smoke');
  });
});

describe('/api/projects/[slug]/adr-index', () => {
  it('POST with malformed id "adr-001" is rejected by the regex (422)', async () => {
    const res = await adrPost(
      makeReq(
        'POST',
        `/api/projects/${SLUG}/adr-index`,
        { id: 'adr-001', title: 'Bad id', date: '2026-06-10', body_path: 'decisions/adr-001.md' },
        authHeaders(),
      ),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(422);
  });

  it('POST with a valid adr-NNN-slug id returns 201', async () => {
    const res = await adrPost(
      makeReq(
        'POST',
        `/api/projects/${SLUG}/adr-index`,
        {
          id: 'adr-001-test-thing',
          title: 'WS3 test ADR',
          date: '2026-06-10',
          body_path: 'decisions/adr-001-test-thing.md',
        },
        authHeaders(),
      ),
      ctx({ slug: SLUG }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.decision.id).toBe('adr-001-test-thing');
  });
});
