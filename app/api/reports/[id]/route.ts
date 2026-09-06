// /api/reports/[id] — GET (report + its comments) and DELETE (report + comments + screenshots).
// GET is read-only (no auth): the sole way to independently re-read a report's stored comment
// text/paths via API — used by the Task-3 feature verifier's DB-via-API system-state assertion
// (ONE DOOR, adr-018) and by any debugging of a visual-qa batch. DELETE (Task 1) cascades
// report_comments (FK ON DELETE CASCADE), nulls iteration/bug back-refs so the delete isn't
// FK-restricted, and removes any visual-qa screenshots on disk. DELETE auth via bearer.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, readAuthBody, parseIntId } from '@/lib/api';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return notFound('Report not found');
  const db = await getDb();
  const report = db.select().from(schema.reports).where(eq(schema.reports.id, idNum)).get();
  if (!report) return notFound(`Report ${idNum} not found`);
  const comments = db
    .select()
    .from(schema.report_comments)
    .where(eq(schema.report_comments.report_id, idNum))
    .orderBy(asc(schema.report_comments.id))
    .all();
  return NextResponse.json({ report, comments, count: comments.length });
}

const DeleteBody = z.object({ reason: z.string().max(500).optional() });

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await readAuthBody(req, DeleteBody);
  if (!result.ok) return result.res;

  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return notFound('Report not found');

  const db = await getDb();
  const report = db.select().from(schema.reports).where(eq(schema.reports.id, idNum)).get();
  if (!report) return notFound(`Report ${idNum} not found`);

  // Break FK back-references, then delete the report (report_comments cascade via FK).
  db.update(schema.iterations).set({ raw_text_id: null }).where(eq(schema.iterations.raw_text_id, idNum)).run();
  db.update(schema.bugs).set({ original_report_id: null }).where(eq(schema.bugs.original_report_id, idNum)).run();
  db.delete(schema.reports).where(eq(schema.reports.id, idNum)).run();

  // Best-effort: remove this report's visual-qa screenshots.
  try {
    await fs.rm(path.join('/asset-library/visual-qa', String(idNum)), { recursive: true, force: true });
  } catch {
    // no screenshots for this report — fine
  }

  return NextResponse.json({ deleted: idNum, source: report.source });
}

// PATCH - #773: /api/inbox was GET-only, so a fully actioned visual-QA report stayed "pending" forever
// with nothing distinguishing it from an untouched one. Same shape as PATCH /api/todos/[id].
const PatchBody = z.object({
  status: z.enum(['pending', 'classified', 'failed', 'ignored']),
  classified_by_session: z.string().max(120).optional(),
});
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await readAuthBody(req, PatchBody);
  if (!result.ok) return result.res;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const report = db.select().from(schema.reports).where(eq(schema.reports.id, idNum)).get();
  if (!report) return notFound(`Report ${idNum} not found`);
  const updates: Partial<typeof schema.reports.$inferInsert> = { status: result.data.status };
  if (result.data.status === 'classified' && !report.classified_at) updates.classified_at = new Date();
  if (result.data.classified_by_session) updates.classified_by_session = result.data.classified_by_session;
  db.update(schema.reports).set(updates).where(eq(schema.reports.id, idNum)).run();
  const updated = db.select().from(schema.reports).where(eq(schema.reports.id, idNum)).get();
  return NextResponse.json({ report: updated });
}
