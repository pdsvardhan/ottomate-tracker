// /api/projects/[slug]/features — list (GET) + create (POST)

import { NextResponse } from 'next/server';
import { eq, asc, desc, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, conflict, notFound, readAuthBody } from '@/lib/api';
import { FeatureCreateSchema } from '@/lib/validation/features';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

// Opt-in expansions for GET. Bare GET stays lean — attaching ACs by default
// would change every existing caller's payload.
const INCLUDABLE = ['acceptance_criteria'] as const;

export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const url = new URL(req.url);
  const include = (url.searchParams.get('include') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  // An unknown include key is a 400, not a shrug (to-do #826). Silently ignoring
  // `include=acceptance_criteria` is what made two verifiers conclude on 2026-09-04
  // that city-wars features had no acceptance criteria and issue false BLOCKs —
  // the request looked answered, so nobody checked the dedicated AC endpoint.
  const unknown = include.filter((k) => !INCLUDABLE.includes(k as (typeof INCLUDABLE)[number]));
  if (unknown.length > 0) {
    return badRequest(
      `Unknown include key(s): ${unknown.join(', ')}. Supported: ${INCLUDABLE.join(', ')}`,
    );
  }

  const db = await getDb();
  const features = db.select().from(schema.features)
    .where(eq(schema.features.project_slug, slug))
    .orderBy(desc(schema.features.updated_at)).all();

  if (!include.includes('acceptance_criteria') || features.length === 0) {
    return NextResponse.json({ features });
  }

  // One query for the whole page rather than one per feature.
  const rows = db.select().from(schema.feature_acceptance_criteria)
    .where(inArray(schema.feature_acceptance_criteria.feature_id, features.map((f) => f.id)))
    .orderBy(asc(schema.feature_acceptance_criteria.sort_order)).all();
  const byFeature = new Map<string, typeof rows>();
  for (const row of rows) {
    const bucket = byFeature.get(row.feature_id);
    if (bucket) bucket.push(row);
    else byFeature.set(row.feature_id, [row]);
  }

  return NextResponse.json({
    features: features.map((f) => ({ ...f, acceptance_criteria: byFeature.get(f.id) ?? [] })),
  });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, FeatureCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const existing = db.select({ id: schema.features.id }).from(schema.features)
    .where(eq(schema.features.id, result.data.id)).get();
  if (existing) return conflict(`Feature '${result.data.id}' already exists`);

  // Anti-gaslight rule 3 (2026-05-19): a brand-new feature cannot be created
  // directly into status='building' because it can't have acceptance criteria
  // yet (the AC POST endpoint requires the feature to already exist). Force
  // a two-step: create with status='planned' (or default), POST the ACs, then
  // PATCH status to 'building'.
  if (result.data.status === 'building') {
    return NextResponse.json({
      error: `anti_gaslight_rule_3_violation`,
      detail: `Cannot create feature '${result.data.id}' with status='building' (no acceptance criteria exist yet for a feature that doesn't exist). Create with status='planned', POST at least 1 AC via /api/projects/${slug}/features/${result.data.id}/acceptance-criteria, then PATCH status to 'building'.`,
    }, { status: 422 });
  }

  db.insert(schema.features).values({ ...result.data, project_slug: slug }).run();
  const created = db.select().from(schema.features).where(eq(schema.features.id, result.data.id)).get();
  return NextResponse.json({ feature: created }, { status: 201 });
}
