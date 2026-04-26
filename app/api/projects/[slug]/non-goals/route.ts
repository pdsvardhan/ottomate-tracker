// /api/projects/[slug]/non-goals — list (GET) + create (POST)

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { NonGoalCreateSchema } from '@/lib/validation/projects';

export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const items = db
    .select()
    .from(schema.project_non_goals)
    .where(eq(schema.project_non_goals.project_slug, slug))
    .orderBy(asc(schema.project_non_goals.sort_order))
    .all();
  return NextResponse.json({ non_goals: items });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, NonGoalCreateSchema);
  if (!result.ok) return result.res;

  const { slug } = await params;
  const db = await getDb();

  const project = db
    .select({ slug: schema.projects.slug })
    .from(schema.projects)
    .where(eq(schema.projects.slug, slug))
    .get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const inserted = db
    .insert(schema.project_non_goals)
    .values({ project_slug: slug, ...result.data })
    .returning()
    .get();
  return NextResponse.json({ non_goal: inserted }, { status: 201 });
}
