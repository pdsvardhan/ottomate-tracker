// Home — projects landing. Spotlight Glass redesign (E.1 closes iteration #5 item 16).
// Layout: status strip + recent-activity strip + filter row + SpotlightCard grid.

import Link from 'next/link';
import { desc, eq, isNull } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

const LIFECYCLE_TONE: Record<string, 'building' | 'shipped' | 'open' | 'neutral' | 'blocked'> = {
  building: 'building',
  shipped: 'shipped',
  ideating: 'open',
  maintained: 'neutral',
  deprecated: 'blocked',
};

function unix(value: unknown): number {
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Math.floor(Date.parse(value) / 1000);
  return 0;
}

function timeAgo(unixSeconds: number): string {
  if (!unixSeconds) return '';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(unixSeconds * 1000).toLocaleDateString();
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const db = await getDb();

  const allProjects = db.select().from(schema.projects)
    .where(eq(schema.projects.archived, false))
    .orderBy(desc(schema.projects.updated_at)).all();
  const archivedProjects = db.select().from(schema.projects)
    .where(eq(schema.projects.archived, true))
    .orderBy(desc(schema.projects.updated_at)).all();

  // Status breakdown
  const phaseCounts: Record<string, number> = {
    building: 0, ideating: 0, shipped: 0, maintained: 0, deprecated: 0,
  };
  for (const p of [...allProjects, ...archivedProjects]) {
    const phase = p.lifecycle_phase ?? 'building';
    phaseCounts[phase] = (phaseCounts[phase] ?? 0) + 1;
  }

  // Recent activity: last 5 (skill events + project updated_at)
  const recentEvents = db.select().from(schema.skill_events)
    .orderBy(desc(schema.skill_events.event_at)).limit(15).all();
  const projectUpdates = [...allProjects].slice(0, 8).map((p) => ({
    at: unix(p.updated_at),
    slug: p.slug,
    label: p.display_name,
    verb: 'updated',
  }));
  type ActivityRow = { at: number; slug: string | null; label: string; verb: string };
  const activity: ActivityRow[] = [
    ...recentEvents.map((e) => ({
      at: unix(e.event_at), slug: e.project_slug, label: e.event_type ?? 'skill event', verb: e.event_type ?? 'event',
    })),
    ...projectUpdates,
  ].sort((a, b) => b.at - a.at).slice(0, 5);

  const totalReports = db.select({ id: schema.reports.id }).from(schema.reports)
    .where(eq(schema.reports.status, 'pending')).all().length;

  // Category filter on tags array
  function matchesCategory(p: typeof allProjects[number]): boolean {
    if (!category) return true;
    const tags = (p.tags ?? []) as string[];
    return tags.includes(category);
  }
  const filteredActive = allProjects.filter(matchesCategory);

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      <PageHeader
        title="Projects"
        tagline="all VAULT7A work-in-progress + shipped"
        meta={
          <>
            <span className="text-zinc-200 font-medium">{allProjects.length}</span> active ·{' '}
            <span>{archivedProjects.length}</span> archived ·{' '}
            {totalReports > 0 ? (
              <Link href="/inbox" className="text-amber-300 hover:text-amber-100 transition-colors">
                {totalReports} pending bug{totalReports === 1 ? '' : 's'}
              </Link>
            ) : (
              <span className="text-zinc-600">inbox clear</span>
            )}
          </>
        }
      />

      {/* Status breakdown strip */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {Object.entries(phaseCounts).map(([phase, count]) => {
          const tone = LIFECYCLE_TONE[phase] ?? 'neutral';
          return (
            <div key={phase} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-4">
              <div className="text-2xl font-bold text-zinc-100">{count}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500">{phase}</span>
                <Badge variant="status" tone={tone} className="!text-[9px]">{phase}</Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent activity strip */}
      <div className="mb-8 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl px-5 py-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Recent activity</h3>
          {activity.length > 0 && (
            <span className="text-[11px] text-zinc-600 font-mono">last {activity.length}</span>
          )}
        </div>
        {activity.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">No activity recorded yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-3 text-xs">
            {activity.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-zinc-400">
                <span className="font-mono text-[10px] text-zinc-500">{timeAgo(a.at)}</span>
                {a.slug ? (
                  <Link href={`/projects/${a.slug}`} className="text-cyan-300 hover:text-cyan-100 transition-colors font-medium">
                    {a.slug}
                  </Link>
                ) : null}
                <span className="text-zinc-500">{a.verb}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Category filter chips */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        {[
          { label: 'all', value: '' },
          { label: 'personal', value: 'personal' },
          { label: 'cv', value: 'cv' },
        ].map((opt) => {
          const isActive = (category ?? '') === opt.value;
          return (
            <Link
              key={opt.label}
              href={opt.value ? `/?category=${opt.value}` : '/'}
              className={
                'text-xs rounded-full border px-3 py-1.5 backdrop-blur-sm transition-all ' +
                (isActive
                  ? 'border-cyan-700/60 bg-cyan-500/10 text-cyan-200 shadow-[0_0_15px_-5px_rgba(0,212,170,0.4)]'
                  : 'border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700/80 hover:text-zinc-200')
              }
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      {/* Project grid */}
      {filteredActive.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-900/60 bg-zinc-950/30 backdrop-blur p-12 text-center">
          <p className="text-sm text-zinc-300">No projects in this category.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Add the <code className="font-mono">{category}</code> tag to a project to surface it here, or run{' '}
            <code className="font-mono text-cyan-300">/ottomate</code> in Claude Code to start a new one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredActive.map((p) => {
            const tone = LIFECYCLE_TONE[p.lifecycle_phase ?? 'building'] ?? 'neutral';
            const tags = (p.tags ?? []) as string[];
            return (
              <SpotlightCard key={p.slug} href={`/projects/${p.slug}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors truncate">
                      {p.display_name}
                    </h3>
                    <code className="text-[11px] font-mono text-zinc-500 truncate">{p.slug}</code>
                  </div>
                  <Badge variant="status" tone={tone}>{p.lifecycle_phase}</Badge>
                </div>
                {p.tagline && (
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{p.tagline}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {p.port && (
                    <Badge variant="count">:{p.port}</Badge>
                  )}
                  {tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="tag">{t}</Badge>
                  ))}
                </div>
                {p.public_url && (
                  <p className="mt-2 text-[10px] font-mono text-zinc-600 truncate">{p.public_url}</p>
                )}
              </SpotlightCard>
            );
          })}
        </div>
      )}

      {archivedProjects.length > 0 && (
        <details className="mt-12 rounded-2xl border border-zinc-800/40 bg-zinc-950/30 backdrop-blur p-4">
          <summary className="text-xs uppercase tracking-wider text-zinc-500 cursor-pointer">
            Archived projects ({archivedProjects.length})
          </summary>
          <ul className="mt-3 flex flex-wrap gap-2">
            {archivedProjects.map((p) => (
              <li key={p.slug}>
                <Link href={`/projects/${p.slug}`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  {p.display_name}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
