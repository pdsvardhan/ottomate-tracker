// /api/iterations/[id]/items — POST: add user-authored item before lock.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, conflict, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { UserAuthoredItemSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, UserAuthoredItemSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const iteration = db.select().from(schema.iterations).where(eq(schema.iterations.id, idNum)).get();
  if (!iteration) return notFound(`Iteration ${idNum} not found`);
  if (!['awaiting-lock', 'pending_user_review'].includes(iteration.status ?? '')) {
    return conflict(`Iteration ${idNum} status '${iteration.status}' is not editable`);
  }
  const inserted = db.insert(schema.iteration_items).values({
    ...result.data,
    iteration_id: idNum,
    user_edited: true,
    confidence: 1,
    status: 'pending-review',
    proposed_change: result.data.proposed_change as Record<string, unknown> | null | undefined,
  }).returning().get();
  return NextResponse.json({ item: inserted }, { status: 201 });
}
