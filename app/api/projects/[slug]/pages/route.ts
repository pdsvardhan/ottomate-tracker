// /api/projects/[slug]/pages — list (GET) + create (POST)

import { NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { conflict, notFound, readAuthBody } from '@/lib/api';
import { PageCreateSchema } from '@/lib/validation/pages';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const pages = db.select().from(schema.pages)
    .where(eq(schema.pages.project_slug, slug))
    .orderBy(asc(schema.pages.title)).all();
  return NextResponse.json({ pages });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, PageCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const existing = db.select({ id: schema.pages.id }).from(schema.pages)
    .where(eq(schema.pages.id, result.data.id)).get();
  if (existing) return conflict(`Page '${result.data.id}' already exists`);

  db.insert(schema.pages).values({ ...result.data, project_slug: slug }).run();
  const created = db.select().from(schema.pages).where(eq(schema.pages.id, result.data.id)).get();
  return NextResponse.json({ page: created }, { status: 201 });
}
