// /api/reports/[id]/classify — POST: skill posts classified items
// (skill calls Claude for classification, then submits structured items here).
// Codex P0 #3: skill = worker, tracker = state store.

import { NextResponse } from 'next/server';
import { eq, max } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, conflict, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { ClassifyRequestSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, ClassifyRequestSchema);
  if (!result.ok) return result.res;

  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');

  const db = await getDb();
  const report = db.select().from(schema.reports).where(eq(schema.reports.id, idNum)).get();
  if (!report) return notFound(`Report ${idNum} not found`);
  if (report.status !== 'pending') {
    return conflict(`Report ${idNum} status is '${report.status}', not 'pending'`);
  }

  // Create iteration row in 'awaiting-lock' state.
  const [{ next_num }] = db
    .select({
      next_num: max(schema.iterations.iteration_number),
    })
    .from(schema.iterations)
    .where(eq(schema.iterations.project_slug, report.project_slug))
    .all();
  const iterationNumber = (next_num ?? 0) + 1;

  const iteration = db.insert(schema.iterations).values({
    project_slug: report.project_slug,
    iteration_number: iterationNumber,
    trigger_source: report.source,
    raw_text_id: idNum,
    status: 'awaiting-lock',
  }).returning().get();

  // Insert items at status='pending-review'.
  const itemsCreated = result.data.items.map((item) => {
    return db.insert(schema.iteration_items).values({
      ...item,
      iteration_id: iteration.id,
      status: 'pending-review',
      proposed_change: item.proposed_change as Record<string, unknown> | null | undefined,
    }).returning().get();
  });

  // Mark report classified.
  db.update(schema.reports).set({
    status: 'classified',
    classified_at: new Date(),
    classified_by_session: result.data.classified_by_session,
  }).where(eq(schema.reports.id, idNum)).run();

  return NextResponse.json({ iteration, items: itemsCreated }, { status: 201 });
}
