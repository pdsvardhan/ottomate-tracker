// /api/projects/[slug]/features/[id]/acceptance-criteria — list + create
// (Doc 3 max 5 acceptance_criteria enforced here.)

import { NextResponse } from 'next/server';
import { and, asc, eq, count } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, readAuthBody } from '@/lib/api';
import { AcceptanceCriterionCreateSchema } from '@/lib/validation/features';

export const runtime = 'nodejs';

const MAX_PER_FEATURE = 5;

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const items = db.select().from(schema.feature_acceptance_criteria)
    .where(eq(schema.feature_acceptance_criteria.feature_id, id))
    .orderBy(asc(schema.feature_acceptance_criteria.sort_order)).all();
  return NextResponse.json({ acceptance_criteria: items });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, AcceptanceCriterionCreateSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const db = await getDb();
  const feature = db.select({ id: schema.features.id }).from(schema.features)
    .where(and(eq(schema.features.id, id), eq(schema.features.project_slug, slug))).get();
  if (!feature) return notFound(`Feature '${id}' not found in '${slug}'`);

  const [{ n }] = db.select({ n: count() }).from(schema.feature_acceptance_criteria)
    .where(eq(schema.feature_acceptance_criteria.feature_id, id)).all();
  if (n >= MAX_PER_FEATURE) {
    return badRequest(`Max ${MAX_PER_FEATURE} acceptance criteria per feature reached`);
  }

  const inserted = db.insert(schema.feature_acceptance_criteria)
    .values({ ...result.data, feature_id: id }).returning().get();
  // A feature's spec changed when its ACs change → bump the parent's updated_at
  // so it reflects the edit (and the D2 doc-gate sees the spec was touched).
  db.update(schema.features).set({ updated_at: new Date() }).where(eq(schema.features.id, id)).run();
  return NextResponse.json({ acceptance_criterion: inserted }, { status: 201 });
}
