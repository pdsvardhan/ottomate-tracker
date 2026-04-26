// /api/projects/[slug]/features — list (GET) + create (POST)

import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { conflict, notFound, readAuthBody } from '@/lib/api';
import { FeatureCreateSchema } from '@/lib/validation/features';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const features = db.select().from(schema.features)
    .where(eq(schema.features.project_slug, slug))
    .orderBy(desc(schema.features.updated_at)).all();
  return NextResponse.json({ features });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, FeatureCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const existing = db.select({ id: schema.features.id }).from(schema.features)
    .where(eq(schema.features.id, result.data.id)).get();
  if (existing) return conflict(`Feature '${result.data.id}' already exists`);

  db.insert(schema.features).values({ ...result.data, project_slug: slug }).run();
  const created = db.select().from(schema.features).where(eq(schema.features.id, result.data.id)).get();
  return NextResponse.json({ feature: created }, { status: 201 });
}
