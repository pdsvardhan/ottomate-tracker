// /api/iterations/[id]/integrate — POST: finalize the iteration with a trace report.
// All items must be verified, rejected, or deferred. Locks the trace and stamps integrated_at.

import { NextResponse } from 'next/server';
import { and, eq, gte } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, conflict, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { IntegrateRequestSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, IntegrateRequestSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const iteration = db.select().from(schema.iterations).where(eq(schema.iterations.id, idNum)).get();
  if (!iteration) return notFound(`Iteration ${idNum} not found`);
  if (iteration.status !== 'building' && iteration.status !== 'verifying') {
    return conflict(`Iteration ${idNum} cannot be integrated from status='${iteration.status}'`);
  }
  const items = db.select().from(schema.iteration_items)
    .where(eq(schema.iteration_items.iteration_id, idNum)).all();
  // Closed states that satisfy integrate. 'deferred' = explicit drop-with-reason (bedrock rule 7).
  const closed = ['verified', 'rejected', 'integrated', 'deferred'];
  const open = items.filter((i) => !closed.includes(i.status ?? ''));
  if (open.length > 0) {
    return badRequest(
      `Cannot integrate; items still open: ` +
      open.map((i) => `#${i.id}=${i.status}`).join(', '),
    );
  }

  // D2 spec-sync gate (R-DOC-10): on a doc-gated ('block') project, a
  // BEHAVIOUR-CHANGING item cannot integrate unless it left a spec update behind
  // — the enforced form of the 4.8 "update the entry" prose, so docs stay fresh
  // for ALL change types (modifications, bug fixes, re-wires, revamps), not just
  // the *_modification ones. A feature/flow target must have updated_at >=
  // iteration.locked_at; a project-wide re_wire/revamp (no single target) must
  // have touched SOME feature/flow spec. Escape hatch for genuinely cosmetic work
  // (typo/colour/copy that changes no behaviour): mark the item
  // proposed_change.spec_impact='none' (reason expected in notes). Ramped: only
  // 'block' refuses; 'warn'/'off' skip. Pages have no updated_at → not timestamp-
  // checked (their drift is surfaced by the doc-lint / dead-capability rules).
  const proj = db
    .select({ doc_gate: schema.projects.doc_gate })
    .from(schema.projects)
    .where(eq(schema.projects.slug, iteration.project_slug))
    .get();
  if (proj?.doc_gate === 'block' && iteration.locked_at) {
    const lockedAt = iteration.locked_at;
    const lockedMs = lockedAt.getTime();
    const BEHAVIOUR_CHANGING = ['feature_modification', 'flow_modification', 'bug', 're_wire', 'revamp'];
    // Cached: did the iteration touch ANY feature/flow spec? (for project-wide re-wire/revamp.)
    let anySpecTouched: boolean | null = null;
    const specWasTouched = (): boolean => {
      if (anySpecTouched === null) {
        const f = db.select({ id: schema.features.id }).from(schema.features)
          .where(and(eq(schema.features.project_slug, iteration.project_slug), gte(schema.features.updated_at, lockedAt))).get();
        const fl = f ? undefined : db.select({ id: schema.flows.id }).from(schema.flows)
          .where(and(eq(schema.flows.project_slug, iteration.project_slug), gte(schema.flows.updated_at, lockedAt))).get();
        anySpecTouched = !!(f || fl);
      }
      return anySpecTouched;
    };
    const unsynced: string[] = [];
    for (const it of items) {
      if (!BEHAVIOUR_CHANGING.includes(it.item_type ?? '')) continue;
      // explicit cosmetic exemption (no behaviour change → no spec update needed)
      const pc = it.proposed_change as { spec_impact?: string } | null;
      if (pc?.spec_impact === 'none') continue;
      if (it.target_id && it.target_kind === 'feature') {
        const u = db.select({ u: schema.features.updated_at }).from(schema.features).where(eq(schema.features.id, it.target_id)).get()?.u ?? null;
        if (u && u.getTime() < lockedMs) unsynced.push(`#${it.id}=${it.item_type}:feature:${it.target_id}`);
      } else if (it.target_id && it.target_kind === 'flow') {
        const u = db.select({ u: schema.flows.updated_at }).from(schema.flows).where(eq(schema.flows.id, it.target_id)).get()?.u ?? null;
        if (u && u.getTime() < lockedMs) unsynced.push(`#${it.id}=${it.item_type}:flow:${it.target_id}`);
      } else if (it.item_type === 're_wire' || it.item_type === 'revamp') {
        if (!specWasTouched()) unsynced.push(`#${it.id}=${it.item_type}:no-spec-touched`);
      }
      // a bug/modification targeting a page (no updated_at) or with no feature/flow
      // target can't be timestamp-checked here → left to doc-lint / dead-capability.
    }
    if (unsynced.length > 0) {
      return badRequest(
        `Cannot integrate on a doc-gated project; behaviour-changing items left no spec update (R-DOC-10): ` +
        `${unsynced.join(', ')}. Update the target feature/flow spec (e.g. add or edit an acceptance criterion), ` +
        `or mark the item cosmetic via proposed_change.spec_impact='none' with a reason, then retry.`,
      );
    }
  }

  db.update(schema.iterations).set({
    status: 'integrated',
    integrated_at: new Date(),
    trace_report: result.data.trace_report as Record<string, unknown>,
  }).where(eq(schema.iterations.id, idNum)).run();
  for (const item of items.filter((i) => i.status === 'verified')) {
    db.update(schema.iteration_items).set({ status: 'integrated' })
      .where(eq(schema.iteration_items.id, item.id)).run();
  }
  const updated = db.select().from(schema.iterations).where(eq(schema.iterations.id, idNum)).get();
  return NextResponse.json({ iteration: updated });
}
