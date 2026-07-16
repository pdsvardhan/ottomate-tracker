import { test, expect, type APIRequestContext } from '@playwright/test';

// Tier-1 BEDROCK E2E — the anti-gaslighting core of the iteration pipeline:
//   classify → lock-in gate → verify → integrate → trace.
// Drives the real API + the lock-in gate UI against the disposable harness
// (throwaway DB copy). The negative "enforcement" cases are the highest-value
// assertions here: they prove the gates that stop scope-gaslighting actually hold
// (lock before build, verifier APPROVE before integrate, no silent post-lock edits,
// no double-classify, confidence floor, no coder self-certification).

const AUTH = { Authorization: 'Bearer e2e-token', 'Content-Type': 'application/json' };

// Unique per run so the spec is re-runnable against a persistent harness.
function uid(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function createProject(request: APIRequestContext): Promise<string> {
  const slug = `bedrock-e2e-${uid()}`;
  const res = await request.post('/api/projects', {
    headers: AUTH,
    data: { slug, display_name: `Bedrock E2E ${slug}` },
  });
  const body = await res.json().catch(() => ({}));
  expect(res.status(), JSON.stringify(body)).toBe(201);
  return slug;
}

async function createReport(request: APIRequestContext, slug: string): Promise<number> {
  const res = await request.post(`/api/projects/${slug}/reports`, {
    headers: AUTH,
    data: { raw_text: 'Add a CSV export button to the dashboard.', source: 'chat' },
  });
  const body = await res.json().catch(() => ({}));
  expect(res.status(), JSON.stringify(body)).toBe(201);
  return body.report.id as number;
}

function classify(request: APIRequestContext, reportId: number, confidence = 0.9) {
  return request.post(`/api/reports/${reportId}/classify`, {
    headers: AUTH,
    data: {
      classified_by_session: 'e2e-session',
      items: [{ item_type: 'new_feature_request', title: 'CSV export button', confidence }],
    },
  });
}

async function freshIteration(request: APIRequestContext, confidence = 0.9) {
  const slug = await createProject(request);
  const reportId = await createReport(request, slug);
  const res = await classify(request, reportId, confidence);
  const body = await res.json().catch(() => ({}));
  expect(res.status(), JSON.stringify(body)).toBe(201);
  return {
    slug,
    reportId,
    iterationId: body.iteration.id as number,
    itemIds: (body.items as Array<{ id: number }>).map((i) => i.id),
  };
}

test.describe('iteration bedrock — anti-gaslight enforcement (negative cases)', () => {
  test('unauthenticated mutation is rejected (401)', async ({ request }) => {
    const slug = await createProject(request);
    const res = await request.post(`/api/projects/${slug}/reports`, {
      headers: { 'Content-Type': 'application/json' },
      data: { raw_text: 'x', source: 'chat' },
    });
    expect(res.status()).toBe(401);
  });

  test('classify with zero items is rejected (422)', async ({ request }) => {
    const slug = await createProject(request);
    const reportId = await createReport(request, slug);
    const res = await request.post(`/api/reports/${reportId}/classify`, {
      headers: AUTH,
      data: { classified_by_session: 's', items: [] },
    });
    expect(res.status()).toBe(422);
  });

  test('a report cannot be classified twice (409)', async ({ request }) => {
    const { reportId } = await freshIteration(request);
    const res = await classify(request, reportId);
    expect(res.status()).toBe(409);
  });

  test('lock is blocked below the confidence floor without a user edit (400)', async ({ request }) => {
    // Relies on classified items defaulting to user_edited=false (schema default);
    // conf 0.3 < the 0.7 floor then genuinely trips the gate. If that default ever
    // flips, this test would pass without exercising the floor — keep them aligned.
    const { iterationId } = await freshIteration(request, 0.3);
    const res = await request.post(`/api/iterations/${iterationId}/lock`, { headers: AUTH, data: {} });
    const body = await res.json().catch(() => ({}));
    expect(res.status(), JSON.stringify(body)).toBe(400);
    expect(String(body.error)).toContain('confidence floor');
  });

  test('an item cannot be silently edited after lock (409)', async ({ request }) => {
    const { iterationId, itemIds } = await freshIteration(request);
    const lock = await request.post(`/api/iterations/${iterationId}/lock`, { headers: AUTH, data: {} });
    expect(lock.status()).toBe(200);
    const patch = await request.patch(`/api/iterations/${iterationId}/items/${itemIds[0]}`, {
      headers: AUTH,
      data: { title: 'sneaky post-lock rename' },
    });
    expect(patch.status()).toBe(409);
  });

  test('integrate is blocked while items are still open / unverified (400)', async ({ request }) => {
    const { iterationId } = await freshIteration(request);
    const lock = await request.post(`/api/iterations/${iterationId}/lock`, { headers: AUTH, data: {} });
    expect(lock.status()).toBe(200);
    // items are 'locked' (open) with no verifier APPROVE yet → integrate must refuse.
    const res = await request.post(`/api/iterations/${iterationId}/integrate`, {
      headers: AUTH,
      data: { trace_report: {} },
    });
    const body = await res.json().catch(() => ({}));
    expect(res.status(), JSON.stringify(body)).toBe(400);
    expect(String(body.error)).toContain('items still open');
  });

  test('re-locking an already-locked iteration is rejected (409)', async ({ request }) => {
    const { iterationId } = await freshIteration(request);
    const lock1 = await request.post(`/api/iterations/${iterationId}/lock`, { headers: AUTH, data: {} });
    expect(lock1.status()).toBe(200);
    const lock2 = await request.post(`/api/iterations/${iterationId}/lock`, { headers: AUTH, data: {} });
    expect(lock2.status()).toBe(409);
  });

  test('a coder agent cannot self-certify: build-status verified is rejected (400)', async ({ request }) => {
    const { iterationId, itemIds } = await freshIteration(request);
    const lock = await request.post(`/api/iterations/${iterationId}/lock`, { headers: AUTH, data: {} });
    expect(lock.status()).toBe(200);

    const res = await request.post(`/api/iterations/${iterationId}/items/${itemIds[0]}/build-status`, {
      headers: AUTH,
      data: { status: 'verified' },
    });
    const body = await res.json().catch(() => ({}));
    expect(res.status(), JSON.stringify(body)).toBe(400);
    expect(String(body.error)).toContain('verifier-result');

    // The item must NOT have advanced — only /verifier-result may do that.
    const after = await request.get(`/api/iterations/${iterationId}`);
    const afterBody = await after.json();
    const item = (afterBody.items as Array<{ id: number; status: string }>).find((i) => i.id === itemIds[0]);
    expect(item?.status).not.toBe('verified');

    // Progress reporting still works; verifier-pending folds into 'building'.
    const progress = await request.post(`/api/iterations/${iterationId}/items/${itemIds[0]}/build-status`, {
      headers: AUTH,
      data: { status: 'verifier-pending' },
    });
    const progressBody = await progress.json().catch(() => ({}));
    expect(progress.status(), JSON.stringify(progressBody)).toBe(200);
    expect(progressBody.item.status).toBe('building');
  });
});

test('iteration bedrock — full flow: classify → lock-in gate → verify → integrate → trace', async ({
  request,
  page,
}, testInfo) => {
  const { iterationId, itemIds } = await freshIteration(request);

  // 1. Lock-in gate UI renders the extracted items awaiting confirmation.
  await page.goto(`/iterations/${iterationId}`);
  await expect(page.getByRole('heading', { name: /Iteration \d+/ })).toBeVisible();
  await expect(page.getByText('Original report')).toBeVisible();
  await expect(page.getByText('Extracted items')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CSV export button' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lock & build/ })).toBeVisible();

  // 2. Lock the list (the button posts this same call).
  const lock = await request.post(`/api/iterations/${iterationId}/lock`, { headers: AUTH, data: {} });
  const lockBody = await lock.json().catch(() => ({}));
  expect(lock.status(), JSON.stringify(lockBody)).toBe(200);
  expect(lockBody.iteration.status).toBe('building');

  // 3. Independent verifier APPROVEs the item → it becomes 'verified'.
  const vr = await request.post(`/api/iterations/${iterationId}/items/${itemIds[0]}/verifier-result`, {
    headers: AUTH,
    data: {
      recommendation_overall: 'APPROVE',
      recommendation_reason: 'code exists and matches the acceptance criterion',
      verifier_session_id: 'e2e-verifier',
    },
  });
  const vrBody = await vr.json().catch(() => ({}));
  expect(vr.status(), JSON.stringify(vrBody)).toBe(200);
  expect(vrBody.item.status).toBe('verified');

  // 4. Integrate with a trace report.
  const integrate = await request.post(`/api/iterations/${iterationId}/integrate`, {
    headers: AUTH,
    data: { trace_report: { summary: 'e2e bedrock flow', item_ids: itemIds } },
  });
  const intBody = await integrate.json().catch(() => ({}));
  expect(integrate.status(), JSON.stringify(intBody)).toBe(200);
  expect(intBody.iteration.status).toBe('integrated');

  // 5. Trace endpoint reflects the closed-out iteration.
  const trace = await request.get(`/api/iterations/${iterationId}/trace`);
  const traceBody = await trace.json().catch(() => ({}));
  expect(trace.status(), JSON.stringify(traceBody)).toBe(200);
  expect(traceBody.iteration.status).toBe('integrated');
  expect(traceBody.items.length).toBeGreaterThanOrEqual(1);
  expect(traceBody.trace_report).toBeTruthy();

  // 6. The integrated page now renders the Trace Report panel (desktop assertion;
  //    the flow above already proved the pipeline viewport-independently).
  if (testInfo.project.name === 'desktop') {
    await page.goto(`/iterations/${iterationId}`);
    await expect(page.getByText('What you asked for')).toBeVisible();
    await expect(page.getByText('What actually got built')).toBeVisible();
  }
});
