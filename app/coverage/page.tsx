// Coverage page — real test-coverage dashboard (BP-5, feature-registry Phase 2c).
// Sourced from live flow test_status + feature test_status (now DERIVED — BP-2) and
// the latest feature-verification report per project. It surfaces GAPS (flows with no
// linked test) instead of a green wall: an untested flow is shown as a gap, never
// counted as passing.
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { VerifySiteButton } from './VerifySiteButton';

export const dynamic = 'force-dynamic';

interface GapFlow {
  id: string;
  title: string;
}
interface ProjectCoverage {
  slug: string;
  display_name: string;
  total_flows: number;
  passing_flows: number;
  failing_flows: number;
  not_tested_flows: number;
  total_features: number;
  passing_features: number;
  gap_flows: GapFlow[];
  last_verdict: string | null;
  last_ran_at: Date | null;
  last_commit: string | null;
}

function pctClass(v: number | null): string {
  if (v === null) return 'bg-zinc-800';
  if (v >= 80) return 'bg-emerald-500';
  if (v >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

function Bar({ pct }: { pct: number | null }) {
  return (
    <div className="h-1.5 rounded-full bg-zinc-900/80 overflow-hidden">
      <div className={'h-full transition-all ' + pctClass(pct)} style={{ width: `${pct ?? 0}%` }} />
    </div>
  );
}

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : 'never';
}

function ProjectCard({ row }: { row: ProjectCoverage }) {
  const flowPct = row.total_flows > 0 ? Math.round((row.passing_flows / row.total_flows) * 100) : null;
  const featPct = row.total_features > 0 ? Math.round((row.passing_features / row.total_features) * 100) : null;
  const verdictColor =
    row.last_verdict === 'APPROVE' ? 'text-emerald-400'
      : row.last_verdict === 'BLOCK' ? 'text-rose-400'
        : 'text-amber-400';
  return (
    <SpotlightCard href={`/projects/${row.slug}/capabilities`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors truncate">
          {row.display_name}
        </h3>
        <code className="text-[11px] font-mono text-zinc-500 truncate shrink-0">{row.slug}</code>
      </div>

      {/* Flows */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">Flows tested</span>
          <span className="text-[11px] font-mono text-zinc-400">
            {flowPct !== null ? `${flowPct}%` : '—'}
            <span className="text-zinc-600 ml-1.5">({row.passing_flows}/{row.total_flows})</span>
          </span>
        </div>
        <Bar pct={flowPct} />
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
          <Badge variant="status" tone="shipped">{row.passing_flows} pass</Badge>
          {row.failing_flows > 0 && <Badge variant="status" tone="blocked">{row.failing_flows} fail</Badge>}
          {row.not_tested_flows > 0 && <Badge variant="status" tone="neutral">{row.not_tested_flows} untested</Badge>}
        </div>
      </div>

      {/* Features (test_status, now derived) */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">Features tested</span>
          <span className="text-[11px] font-mono text-zinc-400">
            {featPct !== null ? `${featPct}%` : '—'}
            <span className="text-zinc-600 ml-1.5">({row.passing_features}/{row.total_features})</span>
          </span>
        </div>
        <Bar pct={featPct} />
      </div>

      {/* Gaps + last verified */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-zinc-800/60">
        {row.gap_flows.length > 0 ? (
          <Badge variant="status" tone="blocked">
            {row.gap_flows.length} flow{row.gap_flows.length > 1 ? 's' : ''} with no test
          </Badge>
        ) : (
          <span className="text-[10px] text-emerald-500/80">every flow has a test</span>
        )}
        <span className="text-[10px] font-mono text-zinc-600">
          {row.last_verdict ? (
            <>
              verified {fmtDate(row.last_ran_at)} · <span className={verdictColor}>{row.last_verdict}</span>
              {row.last_commit ? ` · ${row.last_commit}` : ''}
            </>
          ) : (
            'never verified'
          )}
        </span>
      </div>
    </SpotlightCard>
  );
}

export default async function CoveragePage() {
  const db = await getDb();
  const projects = db.select().from(schema.projects).where(eq(schema.projects.archived, false)).all();

  const rows: ProjectCoverage[] = projects.map((p) => {
    const flows = db
      .select({
        id: schema.flows.id,
        title: schema.flows.title,
        test_status: schema.flows.test_status,
        linked: schema.flows.linked_playwright_test,
      })
      .from(schema.flows)
      .where(eq(schema.flows.project_slug, p.slug))
      .all();
    const feats = db
      .select({ test_status: schema.features.test_status })
      .from(schema.features)
      .where(eq(schema.features.project_slug, p.slug))
      .all();
    const last = db
      .select({
        verdict: schema.feature_verification_reports.recommendation_overall,
        ran_at: schema.feature_verification_reports.ran_at,
        commit: schema.feature_verification_reports.commit_sha,
      })
      .from(schema.feature_verification_reports)
      .where(eq(schema.feature_verification_reports.project_slug, p.slug))
      .orderBy(desc(schema.feature_verification_reports.ran_at))
      .limit(1)
      .get();

    const passing_flows = flows.filter((f) => f.test_status === 'passing').length;
    const failing_flows = flows.filter((f) => f.test_status === 'failing').length;
    const not_tested_flows = flows.filter((f) => !f.test_status || f.test_status === 'not-tested').length;
    const gap_flows = flows
      .filter((f) => !f.linked || String(f.linked).trim() === '')
      .map((f) => ({ id: f.id, title: f.title }));
    const passing_features = feats.filter((f) => f.test_status === 'passing').length;

    return {
      slug: p.slug,
      display_name: p.display_name,
      total_flows: flows.length,
      passing_flows,
      failing_flows,
      not_tested_flows,
      total_features: feats.length,
      passing_features,
      gap_flows,
      last_verdict: last?.verdict ?? null,
      last_ran_at: last?.ran_at ?? null,
      last_commit: last?.commit ?? null,
    };
  });

  const totalFlows = rows.reduce((s, r) => s + r.total_flows, 0);
  const totalPassing = rows.reduce((s, r) => s + r.passing_flows, 0);
  const totalFailing = rows.reduce((s, r) => s + r.failing_flows, 0);
  const totalGaps = rows.reduce((s, r) => s + r.gap_flows.length, 0);
  const overallPct = totalFlows > 0 ? Math.round((totalPassing / totalFlows) * 100) : null;
  const gapProjects = rows.filter((r) => r.gap_flows.length > 0);

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      <PageHeader
        title="Coverage"
        tagline="real test coverage across projects — and what isn't covered"
        meta={
          <>
            <span className="text-zinc-200 font-medium">
              {overallPct !== null ? `${overallPct}% of flows passing` : '— no tests yet'}
            </span>{' '}
            ({totalPassing}/{totalFlows}
            {totalFailing > 0 ? `, ${totalFailing} failing` : ''}
            {totalGaps > 0 ? `, ${totalGaps} with no test` : ''})
          </>
        }
      />

      <div className="mb-6 -mt-2">
        <VerifySiteButton />
      </div>

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

      {/* GAPS — the honest bit: flows with no linked test, never a silent pass */}
      {gapProjects.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-200 mb-1">Coverage gaps</h2>
          <p className="text-[11px] text-zinc-500 mb-4">
            Flows with no linked test — not verified, and shown as a gap rather than counted green.
          </p>
          <div className="space-y-3">
            {gapProjects.map((r) => (
              <div key={r.slug} className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Link
                    href={`/projects/${r.slug}/capabilities`}
                    className="text-[13px] font-medium text-zinc-200 hover:text-cyan-300"
                  >
                    {r.display_name}
                  </Link>
                  <Badge variant="status" tone="blocked">{r.gap_flows.length} untested</Badge>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {r.gap_flows.map((g) => (
                    <li key={g.id} className="text-[11px] text-zinc-400 bg-zinc-900/70 rounded px-2 py-0.5">
                      {g.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
