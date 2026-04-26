// /api/projects/[slug]/secrets — list + create
// Stores NAMES + metadata only — never values (those live in Infisical/env).

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { SecretCreateSchema } from '@/lib/validation/risks';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const items = db.select().from(schema.project_secrets)
    .where(eq(schema.project_secrets.project_slug, slug))
    .orderBy(asc(schema.project_secrets.name)).all();
  return NextResponse.json({ secrets: items });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, SecretCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);
  const inserted = db.insert(schema.project_secrets)
    .values({ ...result.data, project_slug: slug }).returning().get();
  return NextResponse.json({ secret: inserted }, { status: 201 });
}
