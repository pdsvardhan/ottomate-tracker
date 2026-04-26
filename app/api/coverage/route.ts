// /api/coverage — test coverage roll-up across projects.
// Powers the Test Coverage Dashboard (R10.5 #2).

import { NextResponse } from 'next/server';
import { count, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slugFilter = url.searchParams.get('project_slug');
  const db = await getDb();
  const projects = slugFilter
    ? db.select({ slug: schema.projects.slug, display_name: schema.projects.display_name })
        .from(schema.projects).where(eq(schema.projects.slug, slugFilter)).all()
    : db.select({ slug: schema.projects.slug, display_name: schema.projects.display_name })
        .from(schema.projects).all();

  const summaries = projects.map((p) => {
    const flowCounts = db.select({
      total: count(),
      status: schema.flows.test_status,
    }).from(schema.flows)
      .where(eq(schema.flows.project_slug, p.slug))
      .groupBy(schema.flows.test_status).all();
    const featCounts = db.select({
      total: count(),
      status: schema.features.test_status,
    }).from(schema.features)
      .where(eq(schema.features.project_slug, p.slug))
      .groupBy(schema.features.test_status).all();
    const total_flows = flowCounts.reduce((sum, r) => sum + Number(r.total), 0);
    const passing_flows = flowCounts.find((r) => r.status === 'passing')?.total ?? 0;
    const total_features = featCounts.reduce((sum, r) => sum + Number(r.total), 0);
    const passing_features = featCounts.find((r) => r.status === 'passing')?.total ?? 0;
    return {
      slug: p.slug,
      display_name: p.display_name,
      total_flows,
      passing_flows: Number(passing_flows),
      total_features,
      passing_features: Number(passing_features),
      flow_pass_rate: total_flows ? Number(passing_flows) / total_flows : null,
      feature_pass_rate: total_features ? Number(passing_features) / total_features : null,
      breakdown: { flows: flowCounts, features: featCounts },
    };
  });
  return NextResponse.json({ projects: summaries });
}
