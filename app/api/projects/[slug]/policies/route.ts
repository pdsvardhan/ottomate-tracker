// /api/projects/[slug]/policies — GET + PUT (singleton per project)

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { PolicyUpsertSchema } from '@/lib/validation/risks';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const policy = db.select().from(schema.policies)
    .where(eq(schema.policies.project_slug, slug)).get();
  return NextResponse.json({ policy: policy ?? null });
}

export async function PUT(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, PolicyUpsertSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);
  const existing = db.select({ slug: schema.policies.project_slug }).from(schema.policies)
    .where(eq(schema.policies.project_slug, slug)).get();
  if (existing) {
    db.update(schema.policies).set(result.data)
      .where(eq(schema.policies.project_slug, slug)).run();
  } else {
    db.insert(schema.policies).values({ project_slug: slug, ...result.data }).run();
  }
  const after = db.select().from(schema.policies).where(eq(schema.policies.project_slug, slug)).get();
  return NextResponse.json({ policy: after });
}
