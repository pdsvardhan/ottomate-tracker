// app/api/audit/[slug]/route.ts
// Cross-stage audit query — full ledger of phase transitions for a project.
// Per CC-7 + references/anti-gaslight-rules.md.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import {
  feature_phase_transitions,
  flow_phase_transitions,
  page_phase_transitions,
  component_phase_transitions,
  risk_lifecycle_transitions,
  iteration_item_transitions,
  features,
  flows,
  pages,
  components,
  risk_instances,
  iterations,
  iteration_items,
  projects,
  skill_events,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';

// ============================================================================
// GET /api/audit/[slug] — full timeline + entity state
// ============================================================================
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const includeRaw = url.searchParams.get('include_raw') === 'true';

  const db = await getDb();

  // Verify project exists
  const project = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  if (project.length === 0) {
    return NextResponse.json(
      { error: 'not-found', details: { resource: 'project', slug } },
      { status: 404 },
    );
  }

  // Fetch all transition tables for entities belonging to this project
  // Entity tables → fetch all entity ids for this project
  const projectFeatures = await db.select({ id: features.id }).from(features).where(eq(features.project_slug, slug));
  const projectFlows = await db.select({ id: flows.id }).from(flows).where(eq(flows.project_slug, slug));
  const projectPages = await db.select({ id: pages.id }).from(pages).where(eq(pages.project_slug, slug));
  const projectComponents = await db.select({ id: components.id }).from(components).where(eq(components.project_slug, slug));
  const projectRisks = await db.select({ id: risk_instances.id }).from(risk_instances).where(eq(risk_instances.project_slug, slug));
  const projectIterations = await db.select({ id: iterations.id }).from(iterations).where(eq(iterations.project_slug, slug));

  const feature_ids = projectFeatures.map((f) => f.id);
  const flow_ids = projectFlows.map((f) => f.id);
  const page_ids = projectPages.map((p) => p.id);
  const component_ids = projectComponents.map((c) => c.id);
  const riskIds = projectRisks.map((r) => r.id);
  const iteration_ids = projectIterations.map((i) => i.id);

  // Get iteration item ids
  const projectIterationItems = iteration_ids.length > 0
    ? await db.select({ id: iteration_items.id }).from(iteration_items)
    : [];
  const itemIds = projectIterationItems.map((i) => i.id);

  // Fetch transitions (only if entity ids exist; SQL IN with empty is invalid)
  const featureTransitions = feature_ids.length > 0
    ? await db.select().from(feature_phase_transitions).orderBy(desc(feature_phase_transitions.transitioned_at)).limit(500)
    : [];
  const flowTransitions = flow_ids.length > 0
    ? await db.select().from(flow_phase_transitions).orderBy(desc(flow_phase_transitions.transitioned_at)).limit(500)
    : [];
  const pageTransitions = page_ids.length > 0
    ? await db.select().from(page_phase_transitions).orderBy(desc(page_phase_transitions.transitioned_at)).limit(500)
    : [];
  const componentTransitions = component_ids.length > 0
    ? await db.select().from(component_phase_transitions).orderBy(desc(component_phase_transitions.transitioned_at)).limit(500)
    : [];
  const riskTransitions = riskIds.length > 0
    ? await db.select().from(risk_lifecycle_transitions).orderBy(desc(risk_lifecycle_transitions.transitioned_at)).limit(500)
    : [];
  const iterationItemTrans = itemIds.length > 0
    ? await db.select().from(iteration_item_transitions).orderBy(desc(iteration_item_transitions.transitioned_at)).limit(500)
    : [];

  const projectEvents = await db
    .select()
    .from(skill_events)
    .where(eq(skill_events.project_slug, slug))
    .orderBy(desc(skill_events.event_at))
    .limit(200);

  // Filter transitions for this project's entities
  const fxs = featureTransitions.filter((t) => feature_ids.includes(t.feature_id));
  const flxs = flowTransitions.filter((t) => flow_ids.includes(t.flow_id));
  const pxs = pageTransitions.filter((t) => page_ids.includes(t.page_id));
  const cxs = componentTransitions.filter((t) => component_ids.includes(t.component_id));
  const rxs = riskTransitions.filter((t) => riskIds.includes(t.risk_instance_id));
  const ixs = iterationItemTrans.filter((t) => itemIds.includes(t.iteration_item_id));

  return NextResponse.json({
    audit: {
      project_slug: slug,
      generated_at: new Date().toISOString(),
      entity_counts: {
        features: feature_ids.length,
        flows: flow_ids.length,
        pages: page_ids.length,
        components: component_ids.length,
        risks: riskIds.length,
        iterations: iteration_ids.length,
        iteration_items: itemIds.length,
      },
      transitions: {
        features: fxs,
        flows: flxs,
        pages: pxs,
        components: cxs,
        risks: rxs,
        iteration_items: ixs,
      },
      skill_events: projectEvents,
      ...(includeRaw ? { raw_state: { project: project[0] } } : {}),
    },
  });
}
