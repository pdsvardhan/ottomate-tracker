// /api/projects/[slug]/adr-index/[id] — get + patch + delete

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { AdrPatchSchema } from '@/lib/validation/decisions';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const db = await getDb();
  const decision = db.select().from(schema.adr_index)
    .where(and(eq(schema.adr_index.id, id), eq(schema.adr_index.project_slug, slug))).get();
  if (!decision) return notFound(`Decision '${id}' not found in '${slug}'`);
  return NextResponse.json({ decision });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, AdrPatchSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.adr_index.id }).from(schema.adr_index)
    .where(and(eq(schema.adr_index.id, id), eq(schema.adr_index.project_slug, slug))).get();
  if (!existing) return notFound(`Decision '${id}' not found in '${slug}'`);
  db.update(schema.adr_index).set(result.data).where(eq(schema.adr_index.id, id)).run();
  const updated = db.select().from(schema.adr_index).where(eq(schema.adr_index.id, id)).get();
  return NextResponse.json({ decision: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.adr_index.id }).from(schema.adr_index)
    .where(and(eq(schema.adr_index.id, id), eq(schema.adr_index.project_slug, slug))).get();
  if (!existing) return notFound(`Decision '${id}' not found in '${slug}'`);
  db.delete(schema.adr_index).where(eq(schema.adr_index.id, id)).run();
  return NextResponse.json({ deleted: id });
}
