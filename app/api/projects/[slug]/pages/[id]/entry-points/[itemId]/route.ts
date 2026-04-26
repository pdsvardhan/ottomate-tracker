// /api/projects/[slug]/pages/[id]/entry-points/[itemId] — patch + delete

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { EntryPointPatchSchema } from '@/lib/validation/pages';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string; itemId: string }>; }

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, EntryPointPatchSchema);
  if (!result.ok) return result.res;
  const { itemId } = await params;
  const idNum = parseIntId(itemId);
  if (idNum === null) return badRequest('Invalid itemId');
  const db = await getDb();
  const existing = db.select({ id: schema.page_entry_points.id }).from(schema.page_entry_points)
    .where(eq(schema.page_entry_points.id, idNum)).get();
  if (!existing) return notFound(`Entry point ${idNum} not found`);
  db.update(schema.page_entry_points).set(result.data).where(eq(schema.page_entry_points.id, idNum)).run();
  const updated = db.select().from(schema.page_entry_points).where(eq(schema.page_entry_points.id, idNum)).get();
  return NextResponse.json({ entry_point: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { itemId } = await params;
  const idNum = parseIntId(itemId);
  if (idNum === null) return badRequest('Invalid itemId');
  const db = await getDb();
  db.delete(schema.page_entry_points).where(eq(schema.page_entry_points.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
