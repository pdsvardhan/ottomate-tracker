// /api/iterations/[id]/lock — POST: lock items list, transition to 'building'.
// All items must have confidence>=0.7 OR user_edited=true.
// Append to lock_in_audit JSON column (Codex P2 #14).

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, conflict, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { LockRequestSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

const CONFIDENCE_FLOOR = 0.7;

interface Ctx { params: Promise<{ id: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, LockRequestSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const iteration = db.select().from(schema.iterations).where(eq(schema.iterations.id, idNum)).get();
  if (!iteration) return notFound(`Iteration ${idNum} not found`);
  if (!['awaiting-lock', 'pending_user_review'].includes(iteration.status ?? '')) {
    return conflict(`Iteration ${idNum} is not in lockable state (status='${iteration.status}')`);
  }

  const items = db.select().from(schema.iteration_items)
    .where(eq(schema.iteration_items.iteration_id, idNum)).all();
  const active = items.filter((i) => i.status !== 'rejected');
  if (active.length === 0) {
    return badRequest('Cannot lock an iteration with zero active items');
  }

  const lowConfidence = active.filter((i) => {
    const c = i.confidence ?? 0;
    return c < CONFIDENCE_FLOOR && !i.user_edited;
  });
  if (lowConfidence.length > 0) {
    return badRequest(
      `Items below confidence floor (${CONFIDENCE_FLOOR}) without user edit: ` +
      lowConfidence.map((i) => `#${i.id}`).join(', '),
    );
  }

  const lockAudit = {
    locked_at: new Date().toISOString(),
    item_count: active.length,
    rejected_count: items.length - active.length,
    items: active.map((i) => ({
      id: i.id,
      title: i.title,
      item_type: i.item_type,
      confidence: i.confidence,
      user_edited: i.user_edited,
    })),
    notes: result.data.notes ?? null,
  };

  db.update(schema.iterations).set({
    status: 'building',
    locked_at: new Date(),
    lock_in_audit: lockAudit,
  }).where(eq(schema.iterations.id, idNum)).run();

  // Idempotent lock (todo #239b). The old loop set EVERY active item to 'locked'
  // unconditionally, so a late or repeated lock demoted items that had already been built and
  // verified — forcing the verifier to re-issue a verdict and writing duplicate
  // verification_reports rows (observed: portfolio iter-89, reports 512-515).
  // Only items that have not moved past the gate are promoted; progress is never rewound.
  const promoted = active.filter((i) => (i.status ?? 'pending-review') === 'pending-review');
  for (const item of promoted) {
    db.update(schema.iteration_items).set({ status: 'locked' })
      .where(eq(schema.iteration_items.id, item.id)).run();
  }

  const updated = db.select().from(schema.iterations).where(eq(schema.iterations.id, idNum)).get();
  return NextResponse.json({
    iteration: updated,
    locked_items: promoted.length,
    // Surfaced rather than hidden: a caller re-locking an in-flight iteration should see
    // that these items kept the state they had earned.
    preserved_items: active.length - promoted.length,
  });
}
