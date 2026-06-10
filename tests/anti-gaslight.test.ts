// Contract tests: /api/anti-gaslight/violations (Task B).
// Seeds violations through the real route handlers in a throwaway /tmp DB and
// asserts the rules detect (and clear) them.

import { describe, it, expect, beforeAll } from 'vitest';
import { authHeaders, makeReq, ctx } from './helpers';
import { GET as violationsGet } from '@/app/api/anti-gaslight/violations/route';
import { POST as projectsPost } from '@/app/api/projects/route';
import { POST as featuresPost } from '@/app/api/projects/[slug]/features/route';
import { PATCH as featurePatch } from '@/app/api/projects/[slug]/features/[id]/route';
import { POST as claimsPost } from '@/app/api/feature-claims/route';
import { POST as deploysPost } from '@/app/api/deploy-artifacts/route';
import { POST as testRunsPost } from '@/app/api/test-runs/route';

const SLUG = 'ws3-gaslight-proj';
const FEAT = 'feat-ws3-done-unclaimed';

interface Rule {
  rule: string;
  severity: string;
  count: number;
  items: Array<Record<string, unknown>>;
  note?: string;
}
interface Payload {
  generated_at: string;
  project_slug: string | null;
  violations: Rule[];
}

async function getViolations(query = ''): Promise<Payload> {
  const res = await violationsGet(makeReq('GET', `/api/anti-gaslight/violations${query}`));
  expect(res.status).toBe(200);
  return (await res.json()) as Payload;
}

function ruleOf(json: Payload, rule: string): Rule {
  const found = json.violations.find((v) => v.rule === rule);
  expect(found, `rule ${rule} missing from payload`).toBeDefined();
  return found as Rule;
}

beforeAll(async () => {
  // feature_claims / deploy_artifacts / test_runs (0008 DDL) are applied to
  // the throwaway DB by tests/setup.ts, mirroring the manually-migrated prod DB.
  const res = await projectsPost(
    makeReq('POST', '/api/projects', { slug: SLUG, display_name: 'WS3 Gaslight' }, authHeaders()),
  );
  expect(res.status).toBe(201);
});

describe('/api/anti-gaslight/violations', () => {
  it('returns all 5 rules with zero violations on a clean DB', async () => {
    const json = await getViolations();
    expect(json.violations).toHaveLength(5);
    expect(json.violations.map((v) => v.rule).sort()).toEqual([
      'missing-acceptance',
      'silent-drops',
      'stale-verification',
      'unclaimed-done',
      'untested-deploys',
    ]);
    for (const v of json.violations) expect(v.count).toBe(0);
    expect(typeof json.generated_at).toBe('string');
  });

  it('R1 + R3: a done feature with no claim and no ACs is flagged by both rules', async () => {
    const create = await featuresPost(
      makeReq(
        'POST',
        `/api/projects/${SLUG}/features`,
        { id: FEAT, title: 'Done but unclaimed' },
        authHeaders(),
      ),
      ctx({ slug: SLUG }),
    );
    expect(create.status).toBe(201);
    const patch = await featurePatch(
      makeReq('PATCH', `/api/projects/${SLUG}/features/${FEAT}`, { status: 'done' }, authHeaders()),
      ctx({ slug: SLUG, id: FEAT }),
    );
    expect(patch.status).toBe(200);

    const json = await getViolations(`?project_slug=${SLUG}`);
    const r1 = ruleOf(json, 'unclaimed-done');
    expect(r1.count).toBe(1);
    expect(r1.items[0].id).toBe(FEAT);
    const r3 = ruleOf(json, 'missing-acceptance');
    expect(r3.count).toBe(1);
    expect(r3.items[0].id).toBe(FEAT);
  });

  it('R1 clears once a feature_claims row exists for the feature', async () => {
    const claim = await claimsPost(
      makeReq(
        'POST',
        '/api/feature-claims',
        { feature_id: FEAT, source: 'skill-auto', claimed_by_session: 'ws3-test', claim_text: 'done' },
        authHeaders(),
      ),
    );
    expect(claim.status).toBe(201);

    const json = await getViolations(`?project_slug=${SLUG}`);
    expect(ruleOf(json, 'unclaimed-done').count).toBe(0);
  });

  it('R5: a deploy with no test_run in the prior day is flagged, then clears', async () => {
    const dep = await deploysPost(
      makeReq(
        'POST',
        '/api/deploy-artifacts',
        {
          project_slug: SLUG,
          feature_ids: [FEAT],
          commit_sha: 'abc1234def',
          deploy_url: 'http://127.0.0.1:8110',
          deployed_at: new Date().toISOString(),
        },
        authHeaders(),
      ),
    );
    expect(dep.status).toBe(201);

    let json = await getViolations(`?project_slug=${SLUG}`);
    expect(ruleOf(json, 'untested-deploys').count).toBe(1);

    const tr = await testRunsPost(
      makeReq(
        'POST',
        '/api/test-runs',
        {
          project_slug: SLUG,
          commit_sha: 'abc1234def',
          result: 'passed',
          started_at: new Date(Date.now() - 60_000).toISOString(),
        },
        authHeaders(),
      ),
    );
    expect(tr.status).toBe(201);

    json = await getViolations(`?project_slug=${SLUG}`);
    expect(ruleOf(json, 'untested-deploys').count).toBe(0);
  });

  it('project_slug filter scopes every rule to that project only', async () => {
    const json = await getViolations('?project_slug=some-other-project');
    for (const v of json.violations) expect(v.count).toBe(0);
  });
});
