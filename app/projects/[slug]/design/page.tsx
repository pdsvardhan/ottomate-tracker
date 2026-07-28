// /projects/[slug]/design — the design surface (Task 2, 2026-07-27).
//
// This route REPLACES the Claude-Artifact path. A design round used to be published
// as an artifact on claude.ai and picked in chat; it is now published into this app:
// the harness's self-contained HTML is written to the previews volume and served by
// /api/previews, and the per-sub-decision picks are written straight to the
// design_decisions ledger from the round page.
//
// No new table. A ROUND is derivable: the design_decisions rows sharing
// (project_slug, target_id, round). Each row already carries variants_shown (the
// options), preview_url (where the round renders) and rung.
//
// N2 (2026-07-28): the target list is now a STATUS BOARD — Pages vs Components, each
// target's status (final / in progress / not started) rolled up from its rows, with a
// project-level roll-up. Status logic lives in lib/design.ts (pure + unit-tested).

import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { summariseTargets, type TargetSummary, type TargetStatus } from '@/lib/design';
import { resolveProjectProfile, PROFILE_META } from '@/lib/audience-profile';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

// ── U4: the design worklist ────────────────────────────────────────────────
// Every source the owner named — a DOM comment, a passing dislike, a rebuild, a new
// feature — already funnels into an iteration_items row, and that row already carries
// target_kind + target_id. So the worklist is a QUERY, not a new table.
// Mirrors scripts/generation/design-intent.mjs `buildWorklist`, which is the spec and
// carries the tests; kept in sync by hand because the plugin and the app are separate repos.
const UI_ITEM_TYPES = new Set([
  'component_modification', 'page_modification', 'revamp', 'new_feature_request', 'bug',
]);
const DEAD_STATUSES = new Set(['rejected', 'integrated']);

interface WorkRow {
  source: string;
  source_id: number;
  kind: string;
  target_id: string;
  label: string;
  item_type: string | null;
  status: string;
  settled: boolean;
  at: number;
}

const STATUS_LABEL: Record<TargetStatus, string> = {
  final: 'final', 'in-progress': 'in progress', 'not-started': 'not started',
};
const STATUS_TONE: Record<TargetStatus, 'done' | 'open' | 'neutral'> = {
  final: 'done', 'in-progress': 'open', 'not-started': 'neutral',
};

function leaf(id: string): string {
  const parts = id.split('.');
  return parts[parts.length - 1] || id;
}

function ago(ms: number | null): string {
  if (ms == null) return '—';
  const d = Math.floor((Date.now() - ms) / 86_400_000);
  if (d <= 0) return 'today';
  if (d === 1) return '1d ago';
  if (d < 30) return `${d}d ago`;
  return new Date(ms).toISOString().slice(0, 10);
}

function TargetRow({ slug, t }: { slug: string; t: TargetSummary }) {
  return (
    <Link
      href={`/projects/${slug}/design/${encodeURIComponent(t.target_id)}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/50 transition-colors group"
    >
      <span className="min-w-0 flex-1">
        <span className="text-sm text-zinc-100 group-hover:text-cyan-200 transition-colors">
          {leaf(t.target_id)}
        </span>
        <code className="ml-2 text-[10px] font-mono text-zinc-600">{t.target_id}</code>
      </span>
      <Badge variant="status" tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
      <span className="w-20 shrink-0 text-right text-[11px] text-zinc-500">
        {t.rounds.length ? `${t.rounds.length} round${t.rounds.length === 1 ? '' : 's'}` : '—'}
      </span>
      <span className="w-24 shrink-0 text-right text-[11px] text-zinc-500">
        {t.openAxes > 0 ? `${t.openAxes} open` : `${t.lockedAxes} locked`}
      </span>
      <span className="w-20 shrink-0 text-right text-[11px] text-zinc-600">{ago(t.lastActivity)}</span>
    </Link>
  );
}

function Section({ slug, title, targets }: { slug: string; title: string; targets: TargetSummary[] }) {
  if (targets.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-zinc-200 mb-1">
        {title}
        <span className="ml-2 font-normal text-xs text-zinc-500">{targets.length}</span>
      </h2>
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl divide-y divide-zinc-800/60">
        {targets.map((t) => <TargetRow key={t.target_id} slug={slug} t={t} />)}
      </div>
    </section>
  );
}

export default async function DesignIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  const rows = db
    .select()
    .from(schema.design_decisions)
    .where(eq(schema.design_decisions.project_slug, slug))
    .orderBy(desc(schema.design_decisions.updated_at))
    .all();

  const board = summariseTargets(rows);

  // ── #319: the audience profile that resolveFloor(profile) binds to ──
  // Owner-set (context gate) wins; otherwise a suggestion from the project's own signals, suggest-only.
  const ump = db
    .select()
    .from(schema.ui_master_plans)
    .where(eq(schema.ui_master_plans.project_slug, slug))
    .get();
  const ledger = (ump?.design_ledger ?? {}) as { context?: { profile?: string | null } };
  const audience = resolveProjectProfile(project, ledger.context?.profile);

  // ── the worklist: what is outstanding, from work the project already tracks ──
  const settled = new Set(rows.filter((r) => r.status === 'locked').map((r) => r.target_id));

  const iterationRows = db
    .select({
      id: schema.iteration_items.id,
      item_type: schema.iteration_items.item_type,
      target_kind: schema.iteration_items.target_kind,
      target_id: schema.iteration_items.target_id,
      title: schema.iteration_items.title,
      status: schema.iteration_items.status,
      project_slug: schema.iterations.project_slug,
    })
    .from(schema.iteration_items)
    .innerJoin(schema.iterations, eq(schema.iteration_items.iteration_id, schema.iterations.id))
    .where(eq(schema.iterations.project_slug, slug))
    .all();

  const componentRows = db
    .select()
    .from(schema.components)
    .where(eq(schema.components.project_slug, slug))
    .all();

  const worklist: WorkRow[] = [
    ...iterationRows
      .filter((i) =>
        i.item_type && UI_ITEM_TYPES.has(i.item_type)
        && !(i.status && DEAD_STATUSES.has(i.status))
        && ['component', 'page'].includes(i.target_kind ?? '')
        && i.target_id)
      .map((i) => ({
        source: 'iteration item', source_id: i.id, kind: i.target_kind ?? 'component',
        target_id: i.target_id as string, label: i.title, item_type: i.item_type,
        status: i.status ?? 'pending-review', settled: settled.has(i.target_id as string),
        // iteration_items carries NO timestamp columns, so the autoincrement id IS creation order.
        at: i.id,
      })),
    ...componentRows
      .filter((c) => !c.picked && !c.skip_reason)
      .map((c) => ({
        source: 'unpicked component slot', source_id: c.id, kind: 'component',
        target_id: c.name, label: c.name, item_type: null, status: 'unpicked',
        settled: settled.has(c.name), at: 0,
      })),
  ].sort((a, b) => {
    if (a.settled !== b.settled) return a.settled ? 1 : -1;   // unsettled first
    const at = b.at - a.at;                                    // then most recently raised
    return at || String(a.label).localeCompare(String(b.label));
  });

  const { rollup } = board;

  return (
    <div className="mt-6">
      <PageHeader
        title="Design"
        tagline={project.display_name}
        meta={
          board.targets.length
            ? `${board.targets.length} target${board.targets.length === 1 ? '' : 's'} · ${rows.length} decision${rows.length === 1 ? '' : 's'} in the ledger`
            : 'No design rounds published yet.'
        }
        actions={
          <Link
            href={`/projects/${slug}`}
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
          >
            Project overview
          </Link>
        }
      />

      <div className="mb-2 flex items-center gap-2 flex-wrap">
        {board.targets.length > 0 ? (
          <>
            <Badge variant="status" tone="done">{rollup.final} final</Badge>
            <Badge variant="status" tone="open">{rollup.inProgress} in progress</Badge>
            <Badge variant="status" tone="neutral">{rollup.notStarted} not started</Badge>
            <span className="text-[11px] text-zinc-600">of {rollup.total} target{rollup.total === 1 ? '' : 's'}</span>
            <span className="text-zinc-700">·</span>
          </>
        ) : null}
        <Badge variant="tag" title={`Audience profile ${audience.profile} — ${PROFILE_META[audience.profile].blurb} (resolveFloor binds this floor)`}>
          {audience.profile} {PROFILE_META[audience.profile].label}
        </Badge>
        {audience.source === 'suggested' ? (
          <span className="text-[11px] text-amber-400/80" title={audience.evidence.join('; ')}>
            suggested (not set) — {audience.evidence[0]}
          </span>
        ) : null}
      </div>
      <div className="mb-6" />

      {worklist.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-200 mb-1">
            Outstanding UI work
            <span className="ml-2 font-normal text-xs text-zinc-500">
              from this project&apos;s own iteration items and unpicked slots · unsettled first
            </span>
          </h2>
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl divide-y divide-zinc-800/60">
            {worklist.slice(0, 12).map((w) => (
              <Link
                key={`${w.source}-${w.source_id}`}
                href={`/projects/${slug}/design/${encodeURIComponent(w.target_id)}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900/50 transition-colors group"
              >
                <span className="text-[10px] uppercase tracking-wider text-zinc-600 w-32 shrink-0">
                  {w.source}
                </span>
                <span className="text-xs text-zinc-200 group-hover:text-cyan-200 transition-colors truncate flex-1">
                  {w.label}
                </span>
                <code className="text-[10px] font-mono text-zinc-600 truncate max-w-[16rem]">{w.target_id}</code>
                {w.settled ? (
                  <Badge variant="status" tone="done">settled</Badge>
                ) : (
                  <Badge variant="status" tone="neutral">{w.status}</Badge>
                )}
              </Link>
            ))}
          </div>
          {worklist.length > 12 ? (
            <p className="mt-2 text-[11px] text-zinc-500">showing 12 of {worklist.length}</p>
          ) : null}
        </section>
      ) : null}

      {board.targets.length === 0 ? (
        <EmptyState
          title="No design rounds yet"
          body="A round is published from the skill: the variant harness builds one self-contained page, publish-round.mjs copies it onto the previews volume and posts one proposed decision per sub-decision. This page then lists every target that has decisions, grouped into Pages and Components with its status."
        />
      ) : (
        <>
          <Section slug={slug} title="Pages" targets={board.pages} />
          <Section slug={slug} title="Components" targets={board.components} />
        </>
      )}
    </div>
  );
}
