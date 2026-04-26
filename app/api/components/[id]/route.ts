// /api/components/[id] — patch + delete (cross-project, integer id)

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { ComponentPatchSchema } from '@/lib/validation/pages';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const component = db.select().from(schema.components).where(eq(schema.components.id, idNum)).get();
  if (!component) return notFound(`Component ${idNum} not found`);
  const variants = db.select().from(schema.component_variants)
    .where(eq(schema.component_variants.component_id, idNum)).all();
  return NextResponse.json({ component, variants });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, ComponentPatchSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select({ id: schema.components.id }).from(schema.components)
    .where(eq(schema.components.id, idNum)).get();
  if (!existing) return notFound(`Component ${idNum} not found`);
  db.update(schema.components).set(result.data).where(eq(schema.components.id, idNum)).run();
  const updated = db.select().from(schema.components).where(eq(schema.components.id, idNum)).get();
  return NextResponse.json({ component: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select({ id: schema.components.id }).from(schema.components)
    .where(eq(schema.components.id, idNum)).get();
  if (!existing) return notFound(`Component ${idNum} not found`);
  db.delete(schema.components).where(eq(schema.components.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
