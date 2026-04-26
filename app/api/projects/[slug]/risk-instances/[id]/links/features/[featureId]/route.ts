// /api/projects/[slug]/risk-instances/[id]/links/features/[featureId]
// Codex P2 #17 — explicit per-target table, no polymorphic FKs.

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId } from '@/lib/api';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string; featureId: string }>; }

export async function PUT(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id, featureId } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid risk instance id');
  const db = await getDb();
  const ri = db.select({ id: schema.risk_instances.id }).from(schema.risk_instances)
    .where(and(eq(schema.risk_instances.id, idNum), eq(schema.risk_instances.project_slug, slug))).get();
  if (!ri) return notFound(`Risk instance ${idNum} not in '${slug}'`);
  const feat = db.select({ id: schema.features.id }).from(schema.features)
    .where(and(eq(schema.features.id, featureId), eq(schema.features.project_slug, slug))).get();
  if (!feat) return notFound(`Feature '${featureId}' not in '${slug}'`);
  try {
    db.insert(schema.risk_instance_features).values({ risk_instance_id: idNum, feature_id: featureId }).run();
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('UNIQUE') && !msg.includes('PRIMARY KEY')) throw err;
  }
  return NextResponse.json({ risk_instance_id: idNum, feature_id: featureId, linked: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id, featureId } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid risk instance id');
  const db = await getDb();
  db.delete(schema.risk_instance_features).where(and(
    eq(schema.risk_instance_features.risk_instance_id, idNum),
    eq(schema.risk_instance_features.feature_id, featureId),
  )).run();
  return NextResponse.json({ risk_instance_id: idNum, feature_id: featureId, linked: false });
}
