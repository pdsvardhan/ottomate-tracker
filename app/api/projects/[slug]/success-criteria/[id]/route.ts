// /api/projects/[slug]/success-criteria/[id] — patch + delete

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { SuccessCriterionPatchSchema } from '@/lib/validation/projects';

export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ slug: string; id: string }>;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, SuccessCriterionPatchSchema);
  if (!result.ok) return result.res;

  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');

  const db = await getDb();
  const existing = db
    .select({ id: schema.project_success_criteria.id })
    .from(schema.project_success_criteria)
    .where(
      and(
        eq(schema.project_success_criteria.id, idNum),
        eq(schema.project_success_criteria.project_slug, slug),
      ),
    )
    .get();
  if (!existing) return notFound(`Success criterion ${idNum} not found for '${slug}'`);

  db.update(schema.project_success_criteria)
    .set(result.data)
    .where(eq(schema.project_success_criteria.id, idNum))
    .run();
  const updated = db
    .select()
    .from(schema.project_success_criteria)
    .where(eq(schema.project_success_criteria.id, idNum))
    .get();
  return NextResponse.json({ success_criterion: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;

  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');

  const db = await getDb();
  const existing = db
    .select({ id: schema.project_success_criteria.id })
    .from(schema.project_success_criteria)
    .where(
      and(
        eq(schema.project_success_criteria.id, idNum),
        eq(schema.project_success_criteria.project_slug, slug),
      ),
    )
    .get();
  if (!existing) return notFound(`Success criterion ${idNum} not found for '${slug}'`);

  db.delete(schema.project_success_criteria)
    .where(eq(schema.project_success_criteria.id, idNum))
    .run();
  return NextResponse.json({ deleted: idNum });
}
