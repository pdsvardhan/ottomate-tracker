// /api/projects/[slug]/features/[id] — detail + patch + delete

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { FeaturePatchSchema } from '@/lib/validation/features';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const db = await getDb();
  const feature = db.select().from(schema.features)
    .where(and(eq(schema.features.id, id), eq(schema.features.project_slug, slug))).get();
  if (!feature) return notFound(`Feature '${id}' not found in '${slug}'`);
  const acceptance_criteria = db.select().from(schema.feature_acceptance_criteria)
    .where(eq(schema.feature_acceptance_criteria.feature_id, id))
    .orderBy(asc(schema.feature_acceptance_criteria.sort_order)).all();
  return NextResponse.json({ feature, acceptance_criteria });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, FeaturePatchSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.features.id }).from(schema.features)
    .where(and(eq(schema.features.id, id), eq(schema.features.project_slug, slug))).get();
  if (!existing) return notFound(`Feature '${id}' not found in '${slug}'`);
  const updates = { ...result.data, updated_at: new Date() };
  db.update(schema.features).set(updates).where(eq(schema.features.id, id)).run();
  const updated = db.select().from(schema.features).where(eq(schema.features.id, id)).get();
  return NextResponse.json({ feature: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.features.id }).from(schema.features)
    .where(and(eq(schema.features.id, id), eq(schema.features.project_slug, slug))).get();
  if (!existing) return notFound(`Feature '${id}' not found in '${slug}'`);
  db.delete(schema.features).where(eq(schema.features.id, id)).run();
  return NextResponse.json({ deleted: id });
}
