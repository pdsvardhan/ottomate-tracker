// /api/master-components/[id] — single component CRUD.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { MasterComponentPatchSchema } from '@/lib/validation/master-components';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const component = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  if (!component) return notFound(`Component '${id}' not found`);
  return NextResponse.json({ component });
}

export async function PUT(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, MasterComponentPatchSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.master_components.id })
    .from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  if (!existing) return notFound(`Component '${id}' not found`);
  const updates = { ...result.data, updated_at: new Date() };
  db.update(schema.master_components).set(updates)
    .where(eq(schema.master_components.id, id)).run();
  const after = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  return NextResponse.json({ component: after });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.master_components.id })
    .from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  if (!existing) return notFound(`Component '${id}' not found`);
  db.delete(schema.master_components).where(eq(schema.master_components.id, id)).run();
  return NextResponse.json({ deleted: id });
}
