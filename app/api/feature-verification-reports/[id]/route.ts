// /api/feature-verification-reports/[id] — read or prune a single feature-verifier report.
//
// GET is unauthenticated (read-only); DELETE is a bearer-gated mutation (send a JSON body,
// e.g. {}). The feature verifier reruns often (every build + per Stage-4 item) and its
// dogfood/smoke runs are disposable — DELETE lets the skill prune test/superseded runs
// (rule 9), mirroring Task 1's DELETE /api/reports/[id]. Real audit runs are left in place.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { notFound, badRequest, readAuthBody, parseIntId } from '@/lib/api';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const n = parseIntId(id);
  if (n === null) return badRequest('id must be an integer');
  const db = await getDb();
  const row = db
    .select()
    .from(schema.feature_verification_reports)
    .where(eq(schema.feature_verification_reports.id, n))
    .get();
  if (!row) return notFound(`feature-verification report ${id} not found`);
  return NextResponse.json({ report: row });
}

const DeleteBody = z.object({ reason: z.string().max(500).optional() });

export async function DELETE(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, DeleteBody);
  if (!result.ok) return result.res;
  const { id } = await params;
  const n = parseIntId(id);
  if (n === null) return badRequest('id must be an integer');
  const db = await getDb();
  const row = db
    .select({ id: schema.feature_verification_reports.id })
    .from(schema.feature_verification_reports)
    .where(eq(schema.feature_verification_reports.id, n))
    .get();
  if (!row) return notFound(`feature-verification report ${id} not found`);
  db.delete(schema.feature_verification_reports)
    .where(eq(schema.feature_verification_reports.id, n))
    .run();
  return NextResponse.json({ ok: true, deleted: n });
}
