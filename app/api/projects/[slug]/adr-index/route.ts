// /api/projects/[slug]/adr-index — list + create (Doc 8)

import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { conflict, notFound, readAuthBody } from '@/lib/api';
import { AdrCreateSchema } from '@/lib/validation/decisions';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const items = db.select().from(schema.adr_index)
    .where(eq(schema.adr_index.project_slug, slug))
    .orderBy(desc(schema.adr_index.date)).all();
  return NextResponse.json({ decisions: items });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, AdrCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);
  const existing = db.select({ id: schema.adr_index.id }).from(schema.adr_index)
    .where(eq(schema.adr_index.id, result.data.id)).get();
  if (existing) return conflict(`ADR '${result.data.id}' already exists`);
  db.insert(schema.adr_index).values({ ...result.data, project_slug: slug }).run();
  const created = db.select().from(schema.adr_index).where(eq(schema.adr_index.id, result.data.id)).get();
  return NextResponse.json({ decision: created }, { status: 201 });
}
