// /api/projects/[slug]/features/[id]/acceptance-criteria/[itemId] — patch + delete

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { AcceptanceCriterionPatchSchema } from '@/lib/validation/features';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string; itemId: string }>; }

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, AcceptanceCriterionPatchSchema);
  if (!result.ok) return result.res;
  const { id, itemId } = await params;
  const idNum = parseIntId(itemId);
  if (idNum === null) return badRequest('Invalid itemId');
  const db = await getDb();
  const existing = db.select({ id: schema.feature_acceptance_criteria.id })
    .from(schema.feature_acceptance_criteria)
    .where(eq(schema.feature_acceptance_criteria.id, idNum)).get();
  if (!existing) return notFound(`Acceptance criterion ${idNum} not found`);
  db.update(schema.feature_acceptance_criteria).set(result.data)
    .where(eq(schema.feature_acceptance_criteria.id, idNum)).run();
  db.update(schema.features).set({ updated_at: new Date() }).where(eq(schema.features.id, id)).run();
  const updated = db.select().from(schema.feature_acceptance_criteria)
    .where(eq(schema.feature_acceptance_criteria.id, idNum)).get();
  return NextResponse.json({ acceptance_criterion: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id, itemId } = await params;
  const idNum = parseIntId(itemId);
  if (idNum === null) return badRequest('Invalid itemId');
  const db = await getDb();
  db.delete(schema.feature_acceptance_criteria).where(eq(schema.feature_acceptance_criteria.id, idNum)).run();
  db.update(schema.features).set({ updated_at: new Date() }).where(eq(schema.features.id, id)).run();
  return NextResponse.json({ deleted: idNum });
}
