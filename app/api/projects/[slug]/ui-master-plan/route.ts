// /api/projects/[slug]/ui-master-plan — singleton GET + PUT (Stage 2.2)

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { UiMasterPlanUpsertSchema } from '@/lib/validation/ui-master-plan';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const plan = db.select().from(schema.ui_master_plans)
    .where(eq(schema.ui_master_plans.project_slug, slug)).get();
  /**
   * #434 — read/write round-trip.
   *
   * A stored row can carry aspect_ratios = null, but the PUT schema requires an
   * array, so reading a plan and writing it straight back answered 422. Callers
   * had to know to strip the field, which is exactly the kind of asymmetry that
   * gets discovered at the worst moment.
   *
   * Fixed on the READ side deliberately. Loosening PUT to accept null would push
   * the same ambiguity into every consumer, each of which would then have to
   * decide what a null list means. An empty list already means "none", so the
   * read now says that.
   */
  const shaped = plan ? { ...plan, aspect_ratios: plan.aspect_ratios ?? [] } : null;
  return NextResponse.json({ ui_master_plan: shaped });
}

export async function PUT(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, UiMasterPlanUpsertSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);
  const existing = db.select({ slug: schema.ui_master_plans.project_slug })
    .from(schema.ui_master_plans)
    .where(eq(schema.ui_master_plans.project_slug, slug)).get();
  if (existing) {
    db.update(schema.ui_master_plans).set(result.data)
      .where(eq(schema.ui_master_plans.project_slug, slug)).run();
  } else {
    db.insert(schema.ui_master_plans).values({ project_slug: slug, ...result.data }).run();
  }
  const after = db.select().from(schema.ui_master_plans)
    .where(eq(schema.ui_master_plans.project_slug, slug)).get();
  return NextResponse.json({ ui_master_plan: after });
}
