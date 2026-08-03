// /api/iterations/[id]/integrate — POST: finalize the iteration with a trace report.
// All items must be verified, rejected, or deferred. Locks the trace and stamps integrated_at.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
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
  // behaviour-changing modification cannot integrate unless its target's spec
  // was actually updated this iteration (target.updated_at >= iteration.locked_at).
  // Turns the 4.8 "update the entry" prose into an enforced check. Pages have no
  // updated_at, so the timestamp check covers feature + flow modifications; other
  // drift (bugs, pages, dropped refs) is surfaced by the stale-spec / dead-
  // capability rules. Ramped: only 'block' refuses; 'warn'/'off' skip.
  const proj = db
    .select({ doc_gate: schema.projects.doc_gate })
    .from(schema.projects)
    .where(eq(schema.projects.slug, iteration.project_slug))
    .get();
  if (proj?.doc_gate === 'block' && iteration.locked_at) {
    const lockedMs = iteration.locked_at.getTime();
    const unsynced: string[] = [];
    for (const it of items) {
      if (!it.target_id) continue;
      if (it.item_type !== 'feature_modification' && it.item_type !== 'flow_modification') continue;
      let updatedAt: Date | null = null;
      if (it.target_kind === 'feature') {
        updatedAt = db.select({ u: schema.features.updated_at }).from(schema.features)
          .where(eq(schema.features.id, it.target_id)).get()?.u ?? null;
      } else if (it.target_kind === 'flow') {
        updatedAt = db.select({ u: schema.flows.updated_at }).from(schema.flows)
          .where(eq(schema.flows.id, it.target_id)).get()?.u ?? null;
      }
      if (updatedAt && updatedAt.getTime() < lockedMs) {
        unsynced.push(`#${it.id}=${it.target_kind}:${it.target_id}`);
      }
    }
    if (unsynced.length > 0) {
      return badRequest(
        `Cannot integrate on a doc-gated project; spec not updated for behaviour-changing items (R-DOC-10): ` +
        `${unsynced.join(', ')}. PATCH the target's spec/ACs in this iteration, then retry.`,
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
