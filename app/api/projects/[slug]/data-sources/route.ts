// /api/projects/[slug]/data-sources — list + create

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { DataSourceCreateSchema } from '@/lib/validation/data';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const sources = db.select().from(schema.data_sources)
    .where(eq(schema.data_sources.project_slug, slug))
    .orderBy(asc(schema.data_sources.id)).all();
  return NextResponse.json({ data_sources: sources });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, DataSourceCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);
  const inserted = db.insert(schema.data_sources)
    .values({ ...result.data, project_slug: slug }).returning().get();
  return NextResponse.json({ data_source: inserted }, { status: 201 });
}
