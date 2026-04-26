// /api/iterations/[id] — GET (with items)

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
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
  const items = db.select().from(schema.iteration_items)
    .where(eq(schema.iteration_items.iteration_id, idNum))
    .orderBy(asc(schema.iteration_items.id)).all();
  let report = null;
  if (iteration.raw_text_id) {
    report = db.select().from(schema.reports).where(eq(schema.reports.id, iteration.raw_text_id)).get() ?? null;
  }
  return NextResponse.json({ iteration, items, report });
}
