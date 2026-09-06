// /api/iterations/[id]/cancel — POST: abort an iteration.
// Allowed only before integrate. Records reason in trace_report for audit.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, conflict, notFound, parseIntId, readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const CancelSchema = z.object({
  reason: z.string().min(1).max(2000),
});

interface Ctx { params: Promise<{ id: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, CancelSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const iteration = db.select().from(schema.iterations).where(eq(schema.iterations.id, idNum)).get();
  if (!iteration) return notFound(`Iteration ${idNum} not found`);
  if (iteration.status === 'integrated' || iteration.status === 'cancelled') {
    return conflict(`Iteration ${idNum} already finished (status='${iteration.status}')`);
  }
  db.update(schema.iterations).set({
    status: 'cancelled',
    trace_report: {
      cancelled_at: new Date().toISOString(),
      reason: result.data.reason,
      cancelled_from_status: iteration.status,
    },
  }).where(eq(schema.iterations.id, idNum)).run();
  // #724: a cancelled iteration is frozen, so any item still open could never be closed (item PATCH 409s
  // by design). Close them here with the cancel reason - drop-with-reason (bedrock rule 7), never a silent loss.
  const closed = ['verified', 'rejected', 'integrated', 'deferred'];
  const stranded = db.select().from(schema.iteration_items)
    .where(eq(schema.iteration_items.iteration_id, idNum)).all()
    .filter((i) => !closed.includes(i.status ?? ''));
  for (const it of stranded) {
    const stamp = `[deferred] iteration ${idNum} cancelled: ${result.data.reason}`;
    db.update(schema.iteration_items)
      .set({ status: 'deferred', notes: it.notes ? `${it.notes}\n${stamp}` : stamp })
      .where(eq(schema.iteration_items.id, it.id)).run();
  }
  const updated = db.select().from(schema.iterations).where(eq(schema.iterations.id, idNum)).get();
  return NextResponse.json({ iteration: updated, auto_deferred: stranded.map((i) => i.id) });
}
