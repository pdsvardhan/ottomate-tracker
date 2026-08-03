// /api/coverage — test-coverage roll-up across projects (BP-5).
// Sourced from live flow test_status + feature test_status (derived, BP-2), the
// latest feature-verification report per project, and the GAP count (flows with no
// linked test) — so a consumer sees what ISN'T covered, not just a pass rate.

import { NextResponse } from 'next/server';
import { count, desc, eq } from 'drizzle-orm';
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
    const flows = db.select({
      test_status: schema.flows.test_status,
      linked: schema.flows.linked_playwright_test,
    }).from(schema.flows).where(eq(schema.flows.project_slug, p.slug)).all();
    const featCounts = db.select({
      total: count(),
      status: schema.features.test_status,
    }).from(schema.features)
      .where(eq(schema.features.project_slug, p.slug))
      .groupBy(schema.features.test_status).all();
    const last = db.select({
      verdict: schema.feature_verification_reports.recommendation_overall,
      ran_at: schema.feature_verification_reports.ran_at,
      commit_sha: schema.feature_verification_reports.commit_sha,
    }).from(schema.feature_verification_reports)
      .where(eq(schema.feature_verification_reports.project_slug, p.slug))
      .orderBy(desc(schema.feature_verification_reports.ran_at)).limit(1).get();

    const total_flows = flows.length;
    const passing_flows = flows.filter((f) => f.test_status === 'passing').length;
    const failing_flows = flows.filter((f) => f.test_status === 'failing').length;
    const flows_without_test = flows.filter((f) => !f.linked || String(f.linked).trim() === '').length;
    const total_features = featCounts.reduce((sum, r) => sum + Number(r.total), 0);
    const passing_features = Number(featCounts.find((r) => r.status === 'passing')?.total ?? 0);

    return {
      slug: p.slug,
      display_name: p.display_name,
      total_flows,
      passing_flows,
      failing_flows,
      flows_without_test,
      total_features,
      passing_features,
      flow_pass_rate: total_flows ? passing_flows / total_flows : null,
      feature_pass_rate: total_features ? passing_features / total_features : null,
      last_verification: last
        ? { verdict: last.verdict, ran_at: last.ran_at, commit_sha: last.commit_sha }
        : null,
      breakdown: { features: featCounts },
    };
  });
  return NextResponse.json({ projects: summaries });
}
