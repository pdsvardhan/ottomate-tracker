// /api/projects/[slug]/pages/[id]/components — list + create
// Components live under a page; their variants are queried separately
// at /api/components/[componentId]/variants (integer component_id).

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { ComponentCreateSchema } from '@/lib/validation/pages';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const components = db.select().from(schema.components)
    .where(eq(schema.components.page_id, id))
    .orderBy(asc(schema.components.id)).all();
  return NextResponse.json({ components });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, ComponentCreateSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const db = await getDb();
  const page = db.select({ id: schema.pages.id, slug: schema.pages.project_slug }).from(schema.pages)
    .where(and(eq(schema.pages.id, id), eq(schema.pages.project_slug, slug))).get();
  if (!page) return notFound(`Page '${id}' not found in '${slug}'`);
  const inserted = db.insert(schema.components).values({
    ...result.data,
    page_id: id,
    project_slug: slug,
  }).returning().get();
  return NextResponse.json({ component: inserted }, { status: 201 });
}
