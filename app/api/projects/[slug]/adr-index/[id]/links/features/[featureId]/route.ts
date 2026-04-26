// /api/projects/[slug]/adr-index/[id]/links/features/[featureId]

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
  const adr = db.select({ id: schema.adr_index.id }).from(schema.adr_index)
    .where(and(eq(schema.adr_index.id, id), eq(schema.adr_index.project_slug, slug))).get();
  if (!adr) return notFound(`Decision '${id}' not in '${slug}'`);
  const feat = db.select({ id: schema.features.id }).from(schema.features)
    .where(and(eq(schema.features.id, featureId), eq(schema.features.project_slug, slug))).get();
  if (!feat) return notFound(`Feature '${featureId}' not in '${slug}'`);
  try {
    db.insert(schema.adr_features).values({ adr_id: id, feature_id: featureId }).run();
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('UNIQUE') && !msg.includes('PRIMARY KEY')) throw err;
  }
  return NextResponse.json({ adr_id: id, feature_id: featureId, linked: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id, featureId } = await params;
  const db = await getDb();
  db.delete(schema.adr_features).where(and(
    eq(schema.adr_features.adr_id, id),
    eq(schema.adr_features.feature_id, featureId),
  )).run();
  return NextResponse.json({ adr_id: id, feature_id: featureId, linked: false });
}
