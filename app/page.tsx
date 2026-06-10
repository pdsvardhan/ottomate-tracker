// Home — projects landing. Spotlight Glass redesign (E.1 closes iteration #5 item 16).
// Showcase overhaul: main grid is the curated 6-project showcase set; all other
// non-deprecated projects move into a collapsible "Other projects" section. Each card
// carries an honest stage + feature-shipped badge (same computation as the Overview tab).

import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

// ── The LOCKED showcase set ──────────────────────────────────────────────────
// These six projects appear in the main grid; everything else (non-deprecated)
// drops into the collapsible "Other projects" section below. Edit this list to
// change what the portfolio index spotlights — it is the single source of truth.
const SHOWCASE_SLUGS = [
  'portfolio',
  'leaploop',
  'cointrail',
  'mapsofbharat',
  'ottomate',
  'ingest',
] as const;

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

// ── Honest progress (same logic as the project Overview tab) ──
// Maps lifecycle phase → a coarse "stage" label and pairs it with the real
// shipped/total feature counts. `dropped` features are excluded from the total.
interface FeatureStat { done: number; total: number }

function lifecycleStage(phase: string | null): string {
  switch (phase) {
    case 'ideating': return 'Spec';
    case 'building': return 'Build';
    case 'shipped': return 'Shipped';
    case 'maintained': return 'Maintained';
    case 'deprecated': return 'Archived';
    default: return 'Build';
  }
}

function progressLabel(phase: string | null, stat: FeatureStat): string {
  const stage = lifecycleStage(phase);
  if (stat.total === 0) return `${stage} · spec`;
  return `${stage} · ${stat.done}/${stat.total} shipped`;
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

  // Per-project feature stats for the honest progress badge on each card.
  const allFeatures = db.select({
    project_slug: schema.features.project_slug,
    status: schema.features.status,
  }).from(schema.features).all();
  const featureStats = new Map<string, FeatureStat>();
  for (const f of allFeatures) {
    if (f.status === 'dropped') continue; // excluded from totals
    const stat = featureStats.get(f.project_slug) ?? { done: 0, total: 0 };
    stat.total += 1;
    if (f.status === 'done') stat.done += 1;
    featureStats.set(f.project_slug, stat);
  }
  const statFor = (slug: string): FeatureStat => featureStats.get(slug) ?? { done: 0, total: 0 };

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

  // Category filter on tags array
  function matchesCategory(p: typeof allProjects[number]): boolean {
    if (!category) return true;
    const tags = (p.tags ?? []) as string[];
    return tags.includes(category);
  }
  const filteredActive = allProjects.filter(matchesCategory);

  // Split into the curated showcase set vs. everything else (both non-deprecated).
  // Order the showcase grid to match SHOWCASE_SLUGS so it reads as an intentional index.
  const showcaseSet = new Set<string>(SHOWCASE_SLUGS);
  const showcaseProjects = SHOWCASE_SLUGS
    .map((s) => filteredActive.find((p) => p.slug === s))
    .filter((p): p is typeof allProjects[number] => Boolean(p));
  const otherProjects = filteredActive.filter((p) => !showcaseSet.has(p.slug));

  // Shared card renderer — keeps the showcase grid and "Other projects" grid identical.
  const renderCard = (p: typeof allProjects[number]) => {
    const tone = LIFECYCLE_TONE[p.lifecycle_phase ?? 'building'] ?? 'neutral';
    const tags = (p.tags ?? []) as string[];
    const stat = statFor(p.slug);
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
        {/* Honest stage + feature-shipped badge — same computation as the Overview tab. */}
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-800/60 bg-zinc-950/40 px-2.5 py-1">
          <span className="size-1.5 rounded-full bg-cyan-400/80" aria-hidden />
          <span className="text-[11px] font-medium text-zinc-300">{progressLabel(p.lifecycle_phase, stat)}</span>
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
  };

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      <PageHeader
        title="Projects"
        tagline="all VAULT7A work-in-progress + shipped"
        meta={
          <>
            {/* Pending-bugs link removed from the showcase (inbox deferred, not deleted). */}
            <span className="text-zinc-200 font-medium">{showcaseProjects.length}</span> showcased ·{' '}
            <span>{allProjects.length}</span> active ·{' '}
            <span>{archivedProjects.length}</span> archived
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

      {/* Showcase grid — the curated 6 (SHOWCASE_SLUGS), in that order */}
      {filteredActive.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-900/60 bg-zinc-950/30 backdrop-blur p-12 text-center">
          <p className="text-sm text-zinc-300">No projects in this category.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Add the <code className="font-mono">{category}</code> tag to a project to surface it here, or run{' '}
            <code className="font-mono text-cyan-300">/ottomate</code> in Claude Code to start a new one.
          </p>
        </div>
      ) : showcaseProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-900/60 bg-zinc-950/30 backdrop-blur p-12 text-center">
          <p className="text-sm text-zinc-300">No showcase projects in this category.</p>
          <p className="mt-1 text-xs text-zinc-600">See &ldquo;Other projects&rdquo; below.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {showcaseProjects.map(renderCard)}
        </div>
      )}

      {/* Other projects — non-deprecated, non-showcase, kept out of the spotlight grid */}
      {otherProjects.length > 0 && (
        <details className="mt-10 rounded-2xl border border-zinc-800/40 bg-zinc-950/30 backdrop-blur p-4">
          <summary className="text-xs uppercase tracking-wider text-zinc-500 cursor-pointer">
            Other projects ({otherProjects.length})
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherProjects.map(renderCard)}
          </div>
        </details>
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
