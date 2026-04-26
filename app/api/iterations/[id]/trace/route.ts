// /api/iterations/[id]/trace — GET: returns iteration + items + verifier results.
// "What I asked → what was built" payoff per R8.5.

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
  const verifier_reports = db.select().from(schema.verification_reports)
    .where(eq(schema.verification_reports.project_slug, iteration.project_slug))
    .all()
    .filter((vr) => vr.target_kind === 'stage-4-iteration-item' && items.some((i) => String(i.id) === vr.target_id));
  return NextResponse.json({
    iteration,
    raw_report: report,
    items,
    verifier_reports,
    locked_audit: iteration.lock_in_audit,
    trace_report: iteration.trace_report,
  });
}
