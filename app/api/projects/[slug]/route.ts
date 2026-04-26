// /api/projects/[slug] — detail (GET) + update (PATCH) + delete (DELETE)

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { ProjectPatchSchema } from '@/lib/validation/projects';

export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();

  const project = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, slug))
    .get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const non_goals = db
    .select()
    .from(schema.project_non_goals)
    .where(eq(schema.project_non_goals.project_slug, slug))
    .orderBy(asc(schema.project_non_goals.sort_order))
    .all();

  const success_criteria = db
    .select()
    .from(schema.project_success_criteria)
    .where(eq(schema.project_success_criteria.project_slug, slug))
    .orderBy(asc(schema.project_success_criteria.sort_order))
    .all();

  return NextResponse.json({ project, non_goals, success_criteria });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, ProjectPatchSchema);
  if (!result.ok) return result.res;

  const { slug } = await params;
  const db = await getDb();

  const existing = db
    .select({ slug: schema.projects.slug })
    .from(schema.projects)
    .where(eq(schema.projects.slug, slug))
    .get();
  if (!existing) return notFound(`Project '${slug}' not found`);

  const updates = { ...result.data, updated_at: new Date() };
  db.update(schema.projects).set(updates).where(eq(schema.projects.slug, slug)).run();

  const updated = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, slug))
    .get();
  return NextResponse.json({ project: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;

  const { slug } = await params;
  const db = await getDb();

  const existing = db
    .select({ slug: schema.projects.slug })
    .from(schema.projects)
    .where(eq(schema.projects.slug, slug))
    .get();
  if (!existing) return notFound(`Project '${slug}' not found`);

  db.delete(schema.projects).where(eq(schema.projects.slug, slug)).run();
  return NextResponse.json({ deleted: slug });
}
