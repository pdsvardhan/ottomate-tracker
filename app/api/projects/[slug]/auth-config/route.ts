// /api/projects/[slug]/auth-config — GET + PUT (singleton)

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { AuthConfigUpsertSchema } from '@/lib/validation/risks';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const cfg = db.select().from(schema.auth_config).where(eq(schema.auth_config.project_slug, slug)).get();
  return NextResponse.json({ auth_config: cfg ?? null });
}

export async function PUT(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, AuthConfigUpsertSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);
  const existing = db.select({ slug: schema.auth_config.project_slug }).from(schema.auth_config)
    .where(eq(schema.auth_config.project_slug, slug)).get();
  if (existing) {
    db.update(schema.auth_config).set(result.data).where(eq(schema.auth_config.project_slug, slug)).run();
  } else {
    db.insert(schema.auth_config).values({ project_slug: slug, ...result.data }).run();
  }
  const after = db.select().from(schema.auth_config).where(eq(schema.auth_config.project_slug, slug)).get();
  return NextResponse.json({ auth_config: after });
}
