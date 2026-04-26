// /api/projects/[slug]/data-sources/[id] — get + patch + delete

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { DataSourcePatchSchema } from '@/lib/validation/data';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const ds = db.select().from(schema.data_sources)
    .where(and(eq(schema.data_sources.id, idNum), eq(schema.data_sources.project_slug, slug))).get();
  if (!ds) return notFound(`Data source ${idNum} not found in '${slug}'`);
  return NextResponse.json({ data_source: ds });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, DataSourcePatchSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select({ id: schema.data_sources.id }).from(schema.data_sources)
    .where(and(eq(schema.data_sources.id, idNum), eq(schema.data_sources.project_slug, slug))).get();
  if (!existing) return notFound(`Data source ${idNum} not found in '${slug}'`);
  db.update(schema.data_sources).set(result.data).where(eq(schema.data_sources.id, idNum)).run();
  const updated = db.select().from(schema.data_sources).where(eq(schema.data_sources.id, idNum)).get();
  return NextResponse.json({ data_source: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select({ id: schema.data_sources.id }).from(schema.data_sources)
    .where(and(eq(schema.data_sources.id, idNum), eq(schema.data_sources.project_slug, slug))).get();
  if (!existing) return notFound(`Data source ${idNum} not found in '${slug}'`);
  db.delete(schema.data_sources).where(eq(schema.data_sources.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
