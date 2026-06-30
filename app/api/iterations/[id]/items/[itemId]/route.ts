// /api/iterations/[id]/items/[itemId] — PATCH (edit before lock) + DELETE (reject) + POST (defer-with-reason, post-lock)

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, conflict, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { ItemPatchSchema, DeferItemSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string; itemId: string }>; }

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, ItemPatchSchema);
  if (!result.ok) return result.res;
  const { id, itemId } = await params;
  const itrId = parseIntId(id);
  const itmId = parseIntId(itemId);
  if (itrId === null || itmId === null) return badRequest('Invalid id');
  const db = await getDb();
  const iteration = db.select({ status: schema.iterations.status }).from(schema.iterations)
    .where(eq(schema.iterations.id, itrId)).get();
  if (!iteration) return notFound(`Iteration ${itrId} not found`);
  if (!['awaiting-lock', 'pending_user_review'].includes(iteration.status ?? '')) {
    return conflict(`Iteration ${itrId} status '${iteration.status}' is not editable`);
  }
  const existing = db.select({ id: schema.iteration_items.id }).from(schema.iteration_items)
    .where(and(eq(schema.iteration_items.id, itmId), eq(schema.iteration_items.iteration_id, itrId))).get();
  if (!existing) return notFound(`Item ${itmId} not in iteration ${itrId}`);
  db.update(schema.iteration_items).set({
    ...result.data,
    user_edited: true,
    proposed_change: result.data.proposed_change as Record<string, unknown> | null | undefined,
  }).where(eq(schema.iteration_items.id, itmId)).run();
  const updated = db.select().from(schema.iteration_items).where(eq(schema.iteration_items.id, itmId)).get();
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id, itemId } = await params;
  const itrId = parseIntId(id);
  const itmId = parseIntId(itemId);
  if (itrId === null || itmId === null) return badRequest('Invalid id');
  const db = await getDb();
  const iteration = db.select({ status: schema.iterations.status }).from(schema.iterations)
    .where(eq(schema.iterations.id, itrId)).get();
  if (!iteration) return notFound(`Iteration ${itrId} not found`);
  if (!['awaiting-lock', 'pending_user_review'].includes(iteration.status ?? '')) {
    return conflict(`Iteration ${itrId} is locked; cannot delete item (use POST defer-with-reason post-lock)`);
  }
  // "Reject" rather than hard-delete — preserves trace report (Codex P1 #10 spirit)
  db.update(schema.iteration_items)
    .set({ status: 'rejected' })
    .where(and(eq(schema.iteration_items.id, itmId), eq(schema.iteration_items.iteration_id, itrId)))
    .run();
  const after = db.select().from(schema.iteration_items).where(eq(schema.iteration_items.id, itmId)).get();
  return NextResponse.json({ item: after });
}

// POST — defer-with-reason. Closes a LOCKED item post-lock so integrate is reachable
// without faking a build failure. Enforces drop-with-reason (bedrock rule 7): a reason
// is mandatory and is preserved in notes + the item status becomes 'deferred'.
export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, DeferItemSchema);
  if (!result.ok) return result.res;
  const { id, itemId } = await params;
  const itrId = parseIntId(id);
  const itmId = parseIntId(itemId);
  if (itrId === null || itmId === null) return badRequest('Invalid id');
  const db = await getDb();
  const iteration = db.select({ status: schema.iterations.status }).from(schema.iterations)
    .where(eq(schema.iterations.id, itrId)).get();
  if (!iteration) return notFound(`Iteration ${itrId} not found`);
  const item = db.select().from(schema.iteration_items)
    .where(and(eq(schema.iteration_items.id, itmId), eq(schema.iteration_items.iteration_id, itrId))).get();
  if (!item) return notFound(`Item ${itmId} not in iteration ${itrId}`);
  if (['integrated', 'deferred'].includes(item.status ?? '')) {
    return conflict(`Item ${itmId} status '${item.status}' cannot be deferred`);
  }
  const stamp = `[deferred] ${result.data.reason}`;
  db.update(schema.iteration_items).set({
    status: 'deferred',
    notes: item.notes ? `${item.notes}\n${stamp}` : stamp,
  }).where(eq(schema.iteration_items.id, itmId)).run();
  const after = db.select().from(schema.iteration_items).where(eq(schema.iteration_items.id, itmId)).get();
  return NextResponse.json({ item: after });
}
