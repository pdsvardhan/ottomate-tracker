// /api/projects/[slug]/flows — list (GET) + create (POST)

import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { conflict, notFound, readAuthBody } from '@/lib/api';
import { FlowCreateSchema } from '@/lib/validation/flows';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const flows = db
    .select()
    .from(schema.flows)
    .where(eq(schema.flows.project_slug, slug))
    .orderBy(desc(schema.flows.updated_at))
    .all();
  return NextResponse.json({ flows });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, FlowCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();

  const project = db.select({ slug: schema.projects.slug }).from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const existing = db.select({ id: schema.flows.id }).from(schema.flows).where(eq(schema.flows.id, result.data.id)).get();
  if (existing) return conflict(`Flow '${result.data.id}' already exists`);

  db.insert(schema.flows).values({ ...result.data, project_slug: slug }).run();
  const created = db.select().from(schema.flows).where(eq(schema.flows.id, result.data.id)).get();
  return NextResponse.json({ flow: created }, { status: 201 });
}
