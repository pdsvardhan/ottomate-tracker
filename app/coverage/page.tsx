// Coverage page — Spotlight Glass redesign (E.8 closes iteration #5 item 35).
// Per-project pass rate cards for flows + features, with a click-through to
// the Capabilities tab where the user can flip status inline via FlowTestRow.

import Link from 'next/link';
import { count, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

interface ProjectCoverage {
  slug: string;
  display_name: string;
  total_flows: number;
  passing_flows: number;
  failing_flows: number;
  not_tested_flows: number;
  total_features: number;
  done_features: number;
}

function pctClass(value: number | null): string {
  if (value === null) return 'bg-zinc-800';
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

function ProjectCard({ row }: { row: ProjectCoverage }) {
  const flowPct = row.total_flows > 0 ? Math.round((row.passing_flows / row.total_flows) * 100) : null;
  const featurePct = row.total_features > 0 ? Math.round((row.done_features / row.total_features) * 100) : null;
  return (
    <SpotlightCard href={`/projects/${row.slug}/capabilities`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors truncate">
          {row.display_name}
        </h3>
        <code className="text-[11px] font-mono text-zinc-500 truncate shrink-0">{row.slug}</code>
      </div>

      {/* Flows row */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">Flows</span>
          <span className="text-[11px] font-mono text-zinc-400">
            {flowPct !== null ? `${flowPct}%` : '—'}
            <span className="text-zinc-600 ml-1.5">
              ({row.passing_flows}/{row.total_flows})
            </span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
          <div className={'h-full transition-all ' + pctClass(flowPct)} style={{ width: `${flowPct ?? 0}%` }} />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Badge variant="status" tone="shipped">{row.passing_flows} pass</Badge>
          {row.failing_flows > 0 && <Badge variant="status" tone="blocked">{row.failing_flows} fail</Badge>}
          {row.not_tested_flows > 0 && <Badge variant="status" tone="neutral">{row.not_tested_flows} untested</Badge>}
        </div>
      </div>

      {/* Features row */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">Features done</span>
          <span className="text-[11px] font-mono text-zinc-400">
            {featurePct !== null ? `${featurePct}%` : '—'}
            <span className="text-zinc-600 ml-1.5">
              ({row.done_features}/{row.total_features})
            </span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
          <div className={'h-full transition-all ' + pctClass(featurePct)} style={{ width: `${featurePct ?? 0}%` }} />
        </div>
      </div>
    </SpotlightCard>
  );
}

export default async function CoveragePage() {
  const db = await getDb();
  const projects = db.select().from(schema.projects)
    .where(eq(schema.projects.archived, false)).all();

  const rows: ProjectCoverage[] = projects.map((p) => {
    const flowCounts = db.select({
      total: count(),
      status: schema.flows.test_status,
    }).from(schema.flows)
      .where(eq(schema.flows.project_slug, p.slug))
      .groupBy(schema.flows.test_status).all();
    const featCounts = db.select({
      total: count(),
      status: schema.features.status,
    }).from(schema.features)
      .where(eq(schema.features.project_slug, p.slug))
      .groupBy(schema.features.status).all();

    const total_flows = flowCounts.reduce((s, r) => s + Number(r.total), 0);
    const passing_flows = Number(flowCounts.find((r) => r.status === 'passing')?.total ?? 0);
    const failing_flows = Number(flowCounts.find((r) => r.status === 'failing')?.total ?? 0);
    const not_tested_flows = total_flows - passing_flows - failing_flows;

    const total_features = featCounts.reduce((s, r) => s + Number(r.total), 0);
    const done_features = Number(featCounts.find((r) => r.status === 'done')?.total ?? 0);

    return {
      slug: p.slug,
      display_name: p.display_name,
      total_flows,
      passing_flows,
      failing_flows,
      not_tested_flows,
      total_features,
      done_features,
    };
  });

  const totalFlows = rows.reduce((s, r) => s + r.total_flows, 0);
  const totalPassingFlows = rows.reduce((s, r) => s + r.passing_flows, 0);
  const totalFailing = rows.reduce((s, r) => s + r.failing_flows, 0);
  const overallPct = totalFlows > 0 ? Math.round((totalPassingFlows / totalFlows) * 100) : null;

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      <PageHeader
        title="Coverage"
        tagline="cross-project test pass-rate dashboard"
        meta={
          <>
            <span className="text-zinc-200 font-medium">
              {overallPct !== null ? `${overallPct}% overall` : '— no tests yet'}
            </span>{' '}
            ({totalPassingFlows} of {totalFlows} flows passing
            {totalFailing > 0 && `, ${totalFailing} failing`})
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No active projects to score"
          body="Coverage rolls up flows + features across non-archived projects."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <ProjectCard key={row.slug} row={row} />
          ))}
        </div>
      )}

      <p className="mt-8 text-[11px] text-zinc-600">
        Click any card to open that project's <Link href="#" className="text-cyan-500">Capabilities tab</Link> and flip flow status inline.
      </p>
    </div>
  );
}
