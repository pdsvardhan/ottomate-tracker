// /api/iterations/[id]/status — GET: skill polls; returns iteration + per-item summary.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId } from '@/lib/api';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const iteration = db.select().from(schema.iterations).where(eq(schema.iterations.id, idNum)).get();
  if (!iteration) return notFound(`Iteration ${idNum} not found`);
  const items = db.select({
    id: schema.iteration_items.id,
    title: schema.iteration_items.title,
    status: schema.iteration_items.status,
    item_type: schema.iteration_items.item_type,
    target_kind: schema.iteration_items.target_kind,
    target_id: schema.iteration_items.target_id,
  }).from(schema.iteration_items)
    .where(eq(schema.iteration_items.iteration_id, idNum)).all();
  return NextResponse.json({
    status: iteration.status,
    iteration_number: iteration.iteration_number,
    locked_at: iteration.locked_at,
    integrated_at: iteration.integrated_at,
    items,
  });
}
