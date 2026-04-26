// /api/projects — list (GET) + create (POST)

import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { conflict, readAuthBody } from '@/lib/api';
import { ProjectCreateSchema } from '@/lib/validation/projects';

export const runtime = 'nodejs';

export async function GET() {
  const db = await getDb();
  const projects = db
    .select()
    .from(schema.projects)
    .orderBy(desc(schema.projects.updated_at))
    .all();
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const result = await readAuthBody(req, ProjectCreateSchema);
  if (!result.ok) return result.res;

  const db = await getDb();

  const existing = db
    .select({ slug: schema.projects.slug })
    .from(schema.projects)
    .where(eq(schema.projects.slug, result.data.slug))
    .get();
  if (existing) return conflict(`Project '${result.data.slug}' already exists`);

  db.insert(schema.projects).values(result.data).run();
  const created = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.slug, result.data.slug))
    .get();

  return NextResponse.json({ project: created }, { status: 201 });
}
