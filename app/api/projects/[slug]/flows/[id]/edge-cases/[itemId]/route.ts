// /api/projects/[slug]/flows/[id]/edge-cases/[itemId] — patch + delete

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
  const existing = db.select({ id: schema.flow_edge_cases.id }).from(schema.flow_edge_cases)
    .where(eq(schema.flow_edge_cases.id, idNum)).get();
  if (!existing) return notFound(`Edge case ${idNum} not found`);
  db.update(schema.flow_edge_cases).set(result.data).where(eq(schema.flow_edge_cases.id, idNum)).run();
  const updated = db.select().from(schema.flow_edge_cases).where(eq(schema.flow_edge_cases.id, idNum)).get();
  return NextResponse.json({ edge_case: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { itemId } = await params;
  const idNum = parseIntId(itemId);
  if (idNum === null) return badRequest('Invalid itemId');
  const db = await getDb();
  db.delete(schema.flow_edge_cases).where(eq(schema.flow_edge_cases.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
