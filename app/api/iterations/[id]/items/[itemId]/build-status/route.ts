// /api/iterations/[id]/items/[itemId]/build-status — POST
// Coder agent updates the item's build status during execution.

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { BuildStatusSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

const STATUS_MAP: Record<string, 'building' | 'verified' | 'rejected'> = {
  building: 'building',
  'verifier-pending': 'building',
  verified: 'verified',
  failed: 'rejected',
};

interface Ctx { params: Promise<{ id: string; itemId: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, BuildStatusSchema);
  if (!result.ok) return result.res;
  const { id, itemId } = await params;
  const itrId = parseIntId(id);
  const itmId = parseIntId(itemId);
  if (itrId === null || itmId === null) return badRequest('Invalid id');
  const db = await getDb();
  const item = db.select().from(schema.iteration_items)
    .where(and(eq(schema.iteration_items.id, itmId), eq(schema.iteration_items.iteration_id, itrId))).get();
  if (!item) return notFound(`Item ${itmId} not in iteration ${itrId}`);

  const newStatus = STATUS_MAP[result.data.status];
  db.update(schema.iteration_items).set({
    status: newStatus,
    notes: result.data.notes ?? item.notes,
  }).where(eq(schema.iteration_items.id, itmId)).run();
  const updated = db.select().from(schema.iteration_items).where(eq(schema.iteration_items.id, itmId)).get();
  return NextResponse.json({ item: updated });
}
