// /api/projects/[slug]/data-concepts — GET + PUT (upsert; singleton per project)

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { DataConceptsUpsertSchema } from '@/lib/validation/data';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const concepts = db.select().from(schema.project_data_concepts)
    .where(eq(schema.project_data_concepts.project_slug, slug)).get();
  return NextResponse.json({ data_concepts: concepts ?? null });
}

export async function PUT(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, DataConceptsUpsertSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const existing = db.select({ slug: schema.project_data_concepts.project_slug })
    .from(schema.project_data_concepts)
    .where(eq(schema.project_data_concepts.project_slug, slug)).get();

  if (existing) {
    db.update(schema.project_data_concepts).set(result.data)
      .where(eq(schema.project_data_concepts.project_slug, slug)).run();
  } else {
    db.insert(schema.project_data_concepts)
      .values({ project_slug: slug, ...result.data }).run();
  }
  const after = db.select().from(schema.project_data_concepts)
    .where(eq(schema.project_data_concepts.project_slug, slug)).get();
  return NextResponse.json({ data_concepts: after });
}
