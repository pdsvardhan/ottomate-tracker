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

import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
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

interface TargetRollup {
  target_id: string;
  target_kind: string | null;
  latest_round: number;
  rounds: number[];
  open: number;
  in_review: number;
  locked: number;
  rejected: number;
  total: number;
  profile: string | null;
  updated_at: Date | null;
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

  const byTarget = new Map<string, TargetRollup>();
  for (const r of rows) {
    let t = byTarget.get(r.target_id);
    if (!t) {
      t = {
        target_id: r.target_id,
        target_kind: r.target_kind,
        latest_round: r.round ?? 1,
        rounds: [],
        open: 0,
        in_review: 0,
        locked: 0,
        rejected: 0,
        total: 0,
        profile: r.profile_at_decision,
        updated_at: r.updated_at,
      };
      byTarget.set(r.target_id, t);
    }
    const round = r.round ?? 1;
    if (!t.rounds.includes(round)) t.rounds.push(round);
    if (round > t.latest_round) t.latest_round = round;
    t.total += 1;
    if (r.status === 'proposed') t.open += 1;
    else if (r.status === 'in-review') t.in_review += 1;
    else if (r.status === 'locked') t.locked += 1;
    else if (r.status === 'rejected') t.rejected += 1;
  }

  const targets = [...byTarget.values()].sort(
    (a, b) => (b.updated_at?.getTime() ?? 0) - (a.updated_at?.getTime() ?? 0),
  );

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

  return (
    <div className="mt-6">
      <PageHeader
        title="Design"
        tagline={project.display_name}
        meta={
          targets.length
            ? `${targets.length} target${targets.length === 1 ? '' : 's'} · ${rows.length} decision${rows.length === 1 ? '' : 's'} in the ledger`
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

      {targets.length === 0 ? (
        <EmptyState
          title="No design rounds yet"
          body="A round is published from the skill: the variant harness builds one self-contained page, publish-round.mjs copies it onto the previews volume and posts one proposed decision per sub-decision. This page then lists every target that has decisions."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {targets.map((t) => (
            <Link
              key={t.target_id}
              href={`/projects/${slug}/design/${encodeURIComponent(t.target_id)}`}
              className="group rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <code className="text-[11px] font-mono text-zinc-500 block truncate">
                    {t.target_id}
                  </code>
                  <h3 className="mt-1 text-sm font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors">
                    round {t.latest_round}
                    {t.rounds.length > 1 ? (
                      <span className="text-zinc-500 font-normal"> · {t.rounds.length} rounds</span>
                    ) : null}
                  </h3>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  {t.target_kind ? <Badge variant="tag">{t.target_kind}</Badge> : null}
                  {t.profile ? <Badge variant="tag">{t.profile}</Badge> : null}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {t.open > 0 ? (
                  <Badge variant="status" tone="neutral">{t.open} open</Badge>
                ) : null}
                {t.in_review > 0 ? (
                  <Badge variant="status" tone="open">{t.in_review} in review</Badge>
                ) : null}
                {t.locked > 0 ? (
                  <Badge variant="status" tone="done">{t.locked} locked</Badge>
                ) : null}
                {t.rejected > 0 ? (
                  <Badge variant="status" tone="deprecated">{t.rejected} rejected</Badge>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
