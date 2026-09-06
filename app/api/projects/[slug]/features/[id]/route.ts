// /api/projects/[slug]/features/[id] — detail + patch + delete

import { NextResponse } from 'next/server';
import { and, asc, count, eq } from 'drizzle-orm';
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
  const existing = db.select({ id: schema.features.id, status: schema.features.status })
    .from(schema.features)
    .where(and(eq(schema.features.id, id), eq(schema.features.project_slug, slug))).get();
  if (!existing) return notFound(`Feature '${id}' not found in '${slug}'`);

  // Anti-gaslight rule 3 (2026-05-19): block transition to status='building' if
  // the feature has 0 acceptance_criteria. Caught a real bug in feat-phase-10
  // where status=building was set without any ACs. Status changes from any other
  // value into 'building' are gated; non-status PATCHes pass through unchanged.
  if (result.data.status === 'building' && existing.status !== 'building') {
    const acRow = db.select({ n: count() }).from(schema.feature_acceptance_criteria)
      .where(eq(schema.feature_acceptance_criteria.feature_id, id)).all();
    const acCount = acRow[0]?.n ?? 0;
    if (acCount < 1) {
      return NextResponse.json({
        error: `anti_gaslight_rule_3_violation`,
        detail: `Cannot transition feature '${id}' to status='building' with 0 acceptance criteria. Add at least 1 via POST /api/projects/${slug}/features/${id}/acceptance-criteria, then retry.`,
      }, { status: 422 });
    }
  }

  const updates = { ...result.data, updated_at: new Date() };
  db.update(schema.features).set(updates).where(eq(schema.features.id, id)).run();
  const updated = db.select().from(schema.features).where(eq(schema.features.id, id)).get();
  // #688: a dropped field is reported, never hidden - the caller can tell a stored write from a discarded one.
  return NextResponse.json(
    result.ignored?.length
      ? { feature: updated, ignored: result.ignored, warning: 'unknown fields were not stored' }
      : { feature: updated },
  );
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
