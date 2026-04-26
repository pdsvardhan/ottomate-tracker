// /api/projects/[slug]/flows/[id]/links/features/[featureId]
// PUT to link, DELETE to unlink (M:N flow_features).

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
  const flow = db.select({ id: schema.flows.id }).from(schema.flows)
    .where(and(eq(schema.flows.id, id), eq(schema.flows.project_slug, slug))).get();
  if (!flow) return notFound(`Flow '${id}' not in '${slug}'`);
  const feature = db.select({ id: schema.features.id }).from(schema.features)
    .where(and(eq(schema.features.id, featureId), eq(schema.features.project_slug, slug))).get();
  if (!feature) return notFound(`Feature '${featureId}' not in '${slug}'`);
  // Idempotent insert: ignore if exists
  try {
    db.insert(schema.flow_features).values({ flow_id: id, feature_id: featureId }).run();
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('UNIQUE') && !msg.includes('PRIMARY KEY')) throw err;
  }
  return NextResponse.json({ flow_id: id, feature_id: featureId, linked: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id, featureId } = await params;
  const db = await getDb();
  db.delete(schema.flow_features).where(and(
    eq(schema.flow_features.flow_id, id),
    eq(schema.flow_features.feature_id, featureId),
  )).run();
  return NextResponse.json({ flow_id: id, feature_id: featureId, linked: false });
}
