// /api/projects/[slug]/data-contracts — GET + PUT (upsert; Stage 2 contract block)

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { DataContractsUpsertSchema } from '@/lib/validation/data';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const contracts = db.select().from(schema.project_data_contracts)
    .where(eq(schema.project_data_contracts.project_slug, slug)).get();
  return NextResponse.json({ data_contracts: contracts ?? null });
}

export async function PUT(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, DataContractsUpsertSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const existing = db.select({ slug: schema.project_data_contracts.project_slug })
    .from(schema.project_data_contracts)
    .where(eq(schema.project_data_contracts.project_slug, slug)).get();

  if (existing) {
    db.update(schema.project_data_contracts).set(result.data)
      .where(eq(schema.project_data_contracts.project_slug, slug)).run();
  } else {
    db.insert(schema.project_data_contracts)
      .values({ project_slug: slug, ...result.data }).run();
  }
  const after = db.select().from(schema.project_data_contracts)
    .where(eq(schema.project_data_contracts.project_slug, slug)).get();
  return NextResponse.json({ data_contracts: after });
}
