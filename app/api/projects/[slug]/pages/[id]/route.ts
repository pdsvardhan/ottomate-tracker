// /api/projects/[slug]/pages/[id] — detail + patch + delete

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { PagePatchSchema } from '@/lib/validation/pages';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const db = await getDb();
  const page = db.select().from(schema.pages)
    .where(and(eq(schema.pages.id, id), eq(schema.pages.project_slug, slug))).get();
  if (!page) return notFound(`Page '${id}' not found in '${slug}'`);
  const entry_points = db.select().from(schema.page_entry_points)
    .where(eq(schema.page_entry_points.page_id, id)).all();
  const components = db.select().from(schema.components)
    .where(eq(schema.components.page_id, id))
    .orderBy(asc(schema.components.id)).all();
  return NextResponse.json({ page, entry_points, components });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, PagePatchSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.pages.id }).from(schema.pages)
    .where(and(eq(schema.pages.id, id), eq(schema.pages.project_slug, slug))).get();
  if (!existing) return notFound(`Page '${id}' not found in '${slug}'`);
  db.update(schema.pages).set(result.data).where(eq(schema.pages.id, id)).run();
  const updated = db.select().from(schema.pages).where(eq(schema.pages.id, id)).get();
  return NextResponse.json({ page: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.pages.id }).from(schema.pages)
    .where(and(eq(schema.pages.id, id), eq(schema.pages.project_slug, slug))).get();
  if (!existing) return notFound(`Page '${id}' not found in '${slug}'`);
  db.delete(schema.pages).where(eq(schema.pages.id, id)).run();
  return NextResponse.json({ deleted: id });
}
