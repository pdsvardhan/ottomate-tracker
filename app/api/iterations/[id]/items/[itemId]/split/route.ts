// /api/iterations/[id]/items/[itemId]/split — POST: split one item into many.
// User finds AI lumped two concerns together; splits to reflect intent.

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, conflict, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { SplitItemSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string; itemId: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, SplitItemSchema);
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
    return conflict(`Iteration ${itrId} is locked; cannot split items`);
  }
  const original = db.select().from(schema.iteration_items)
    .where(and(eq(schema.iteration_items.id, itmId), eq(schema.iteration_items.iteration_id, itrId))).get();
  if (!original) return notFound(`Item ${itmId} not in iteration ${itrId}`);

  const newItems = result.data.new_items.map((item) =>
    db.insert(schema.iteration_items).values({
      ...item,
      iteration_id: itrId,
      user_edited: true,
      status: 'pending-review',
      proposed_change: item.proposed_change as Record<string, unknown> | null | undefined,
      notes: `Split from item ${itmId}`,
    }).returning().get(),
  );

  if (result.data.delete_original) {
    db.update(schema.iteration_items)
      .set({ status: 'rejected', notes: `Split into ${newItems.map((i) => i.id).join(', ')}` })
      .where(eq(schema.iteration_items.id, itmId)).run();
  }
  return NextResponse.json({ original_id: itmId, new_items: newItems }, { status: 201 });
}
