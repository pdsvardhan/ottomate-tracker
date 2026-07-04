// /api/projects/[slug]/tech-stack — GET + PUT (upsert; project_slug is the PK).
// Added iter-14 follow-up so the register STACK column can be backfilled with
// real values (repos' package.json / requirements) through the app's own DB
// connection instead of a second SQLite client (ONE DOOR, adr-018).

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { TechStackUpsertSchema } from '@/lib/validation/tech';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const tech = db.select().from(schema.tech_stacks)
    .where(eq(schema.tech_stacks.project_slug, slug)).get();
  return NextResponse.json({ tech_stack: tech ?? null });
}

export async function PUT(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, TechStackUpsertSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const existing = db.select({ slug: schema.tech_stacks.project_slug })
    .from(schema.tech_stacks)
    .where(eq(schema.tech_stacks.project_slug, slug)).get();

  if (existing) {
    db.update(schema.tech_stacks).set(result.data)
      .where(eq(schema.tech_stacks.project_slug, slug)).run();
  } else {
    db.insert(schema.tech_stacks)
      .values({ project_slug: slug, ...result.data }).run();
  }
  const after = db.select().from(schema.tech_stacks)
    .where(eq(schema.tech_stacks.project_slug, slug)).get();
  return NextResponse.json({ tech_stack: after });
}
