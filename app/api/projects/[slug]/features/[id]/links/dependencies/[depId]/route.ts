// /api/projects/[slug]/features/[id]/links/dependencies/[depId]
// link/unlink feature → depends-on (M:N feature_dependencies)

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound } from '@/lib/api';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string; depId: string }>; }

export async function PUT(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id, depId } = await params;
  if (id === depId) return badRequest('A feature cannot depend on itself');
  const db = await getDb();
  const feat = db.select({ id: schema.features.id }).from(schema.features)
    .where(and(eq(schema.features.id, id), eq(schema.features.project_slug, slug))).get();
  if (!feat) return notFound(`Feature '${id}' not in '${slug}'`);
  const dep = db.select({ id: schema.features.id }).from(schema.features)
    .where(and(eq(schema.features.id, depId), eq(schema.features.project_slug, slug))).get();
  if (!dep) return notFound(`Dependency '${depId}' not in '${slug}'`);
  try {
    db.insert(schema.feature_dependencies).values({
      feature_id: id, depends_on_feature_id: depId,
    }).run();
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('UNIQUE') && !msg.includes('PRIMARY KEY')) throw err;
  }
  return NextResponse.json({ feature_id: id, depends_on: depId, linked: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id, depId } = await params;
  const db = await getDb();
  db.delete(schema.feature_dependencies).where(and(
    eq(schema.feature_dependencies.feature_id, id),
    eq(schema.feature_dependencies.depends_on_feature_id, depId),
  )).run();
  return NextResponse.json({ feature_id: id, depends_on: depId, linked: false });
}
