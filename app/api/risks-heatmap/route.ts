// /api/risks-heatmap — risk-type counts cross-project.
// Hides resolved by default (Codex P1 #10). Powers Risk Heatmap (R10.5 #5).

import { NextResponse } from 'next/server';
import { count, eq, ne, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeResolved = url.searchParams.get('include_resolved') === 'true';
  const db = await getDb();

  const rows = db.select({
    risk_type_id: schema.risk_instances.risk_type_id,
    project_slug: schema.risk_instances.project_slug,
    status: schema.risk_instances.status,
    severity_override: schema.risk_instances.severity_override,
    n: count(),
  }).from(schema.risk_instances)
    .where(includeResolved ? sql`1=1` : ne(schema.risk_instances.status, 'resolved'))
    .groupBy(
      schema.risk_instances.risk_type_id,
      schema.risk_instances.project_slug,
      schema.risk_instances.status,
      schema.risk_instances.severity_override,
    ).all();

  const catalog = db.select().from(schema.risks_catalog).all();

  // heatmap[risk_type_id][project_slug] = { count, status_breakdown }
  const heatmap: Record<string, Record<string, { count: number }>> = {};
  for (const row of rows) {
    if (!heatmap[row.risk_type_id]) heatmap[row.risk_type_id] = {};
    if (!heatmap[row.risk_type_id][row.project_slug]) {
      heatmap[row.risk_type_id][row.project_slug] = { count: 0 };
    }
    heatmap[row.risk_type_id][row.project_slug].count += Number(row.n);
  }
  return NextResponse.json({ catalog, heatmap, raw: rows });
}
