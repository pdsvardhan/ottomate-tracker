// /api/projects/[slug]/pages/[id]/links/features/[featureId] — link/unlink (M:N page_features)

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from '@/lib/api';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string; featureId: string }>; }

export async function PUT(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id, featureId } = await params;
  const db = await getDb();
  const page = db.select({ id: schema.pages.id }).from(schema.pages)
    .where(and(eq(schema.pages.id, id), eq(schema.pages.project_slug, slug))).get();
  if (!page) return notFound(`Page '${id}' not in '${slug}'`);
  const feat = db.select({ id: schema.features.id }).from(schema.features)
    .where(and(eq(schema.features.id, featureId), eq(schema.features.project_slug, slug))).get();
  if (!feat) return notFound(`Feature '${featureId}' not in '${slug}'`);
  try {
    db.insert(schema.page_features).values({ page_id: id, feature_id: featureId }).run();
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('UNIQUE') && !msg.includes('PRIMARY KEY')) throw err;
  }
  return NextResponse.json({ page_id: id, feature_id: featureId, linked: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id, featureId } = await params;
  const db = await getDb();
  db.delete(schema.page_features).where(and(
    eq(schema.page_features.page_id, id),
    eq(schema.page_features.feature_id, featureId),
  )).run();
  return NextResponse.json({ page_id: id, feature_id: featureId, linked: false });
}
