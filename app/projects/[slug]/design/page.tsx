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
