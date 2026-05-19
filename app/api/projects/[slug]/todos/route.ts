// /api/projects/[slug]/todos — per-project to-do list (E.3, schema from CHUNK 1).

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const CreateSchema = z.object({
  title: z.string().min(1).max(300),
  sort_order: z.number().int().nullish(),
});

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const todos = db.select().from(schema.project_todos)
    .where(eq(schema.project_todos.project_slug, slug))
    .orderBy(asc(schema.project_todos.sort_order), asc(schema.project_todos.id))
    .all();

  return NextResponse.json({ count: todos.length, todos });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, CreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  db.insert(schema.project_todos).values({
    project_slug: slug,
    title: result.data.title,
    sort_order: result.data.sort_order ?? 0,
    done: false,
  }).run();

  const latest = db.select().from(schema.project_todos)
    .where(eq(schema.project_todos.project_slug, slug))
    .orderBy(asc(schema.project_todos.id))
    .all().slice(-1)[0];

  return NextResponse.json({ todo: latest }, { status: 201 });
}
