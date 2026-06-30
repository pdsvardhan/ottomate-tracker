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
