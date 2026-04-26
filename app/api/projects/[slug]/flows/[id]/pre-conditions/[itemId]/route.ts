// /api/projects/[slug]/flows/[id]/pre-conditions/[itemId] — patch + delete

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { FlowSubItemPatchSchema } from '@/lib/validation/flows';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string; itemId: string }>; }

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, FlowSubItemPatchSchema);
  if (!result.ok) return result.res;
  const { itemId } = await params;
  const idNum = parseIntId(itemId);
  if (idNum === null) return badRequest('Invalid itemId');
  const db = await getDb();
  const existing = db.select({ id: schema.flow_pre_conditions.id }).from(schema.flow_pre_conditions)
    .where(eq(schema.flow_pre_conditions.id, idNum)).get();
  if (!existing) return notFound(`Pre-condition ${idNum} not found`);
  db.update(schema.flow_pre_conditions).set(result.data).where(eq(schema.flow_pre_conditions.id, idNum)).run();
  const updated = db.select().from(schema.flow_pre_conditions).where(eq(schema.flow_pre_conditions.id, idNum)).get();
  return NextResponse.json({ pre_condition: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { itemId } = await params;
  const idNum = parseIntId(itemId);
  if (idNum === null) return badRequest('Invalid itemId');
  const db = await getDb();
  db.delete(schema.flow_pre_conditions).where(eq(schema.flow_pre_conditions.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
