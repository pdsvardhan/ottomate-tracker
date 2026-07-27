// /projects/[slug]/design/[target] — one design round, rendered and picked in-app.
//
// Replaces the Claude-Artifact surface (owner decision, 2026-07-27). The round's
// self-contained HTML is served same-origin by /api/previews and shown in an iframe;
// the per-sub-decision picks are PATCHed straight onto design_decisions rows.
//
// The iframe is deliberately NOT sandboxed: the content is this pipeline's own output
// and has already passed the feasibility gate (no eval / WASM / network / inline
// handlers), and sandboxing would break the harness's token mode, which renders client
// side. Panels are isolated from each other by declarative shadow DOM inside the page.

import Link from 'next/link';
import { asc, eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { RoundPicker, type LedgerDecision } from './RoundPicker';

export const dynamic = 'force-dynamic';

export default async function DesignRoundPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; target: string }>;
  searchParams: Promise<{ round?: string }>;
}) {
  const { slug, target: rawTarget } = await params;
  const target = decodeURIComponent(rawTarget);
  const { round: roundParam } = await searchParams;

  const db = await getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  const rows = db
    .select()
    .from(schema.design_decisions)
    .where(
      and(
        eq(schema.design_decisions.project_slug, slug),
        eq(schema.design_decisions.target_id, target),
      ),
    )
    .orderBy(asc(schema.design_decisions.axis))
    .all();

  if (rows.length === 0) {
    return (
      <div className="mt-6">
        <PageHeader title="Design round" tagline={target} />
        <EmptyState
          title="No decisions recorded for this target"
          body="Publish a round first (scripts/generation/publish-round.mjs), or go back to the design index."
          cta={
            <Link href={`/projects/${slug}/design`} className="text-xs text-cyan-300 hover:text-cyan-200">
              ← All design targets
            </Link>
          }
        />
      </div>
    );
  }

  const rounds = [...new Set(rows.map((r) => r.round ?? 1))].sort((a, b) => a - b);
  const requested = roundParam ? Number(roundParam) : NaN;
  const current = rounds.includes(requested) ? requested : rounds[rounds.length - 1];

  const thisRound = rows.filter((r) => (r.round ?? 1) === current);
  const previewUrl = thisRound.find((r) => r.preview_url)?.preview_url ?? null;
  const profile = thisRound.find((r) => r.profile_at_decision)?.profile_at_decision ?? null;

  // Locked decisions from ANY round are frozen controls for this one (doctrine 39).
  const frozenElsewhere = rows.filter(
    (r) => r.status === 'locked' && (r.round ?? 1) !== current,
  );

  const decisions: LedgerDecision[] = thisRound.map((r) => ({
    id: r.id,
    axis: r.axis,
    status: r.status,
    rung: r.rung,
    round: r.round ?? 1,
    variants_shown: (r.variants_shown ?? null) as Record<string, unknown> | null,
    chosen_value: r.chosen_value,
    mixed_from: (r.mixed_from ?? null) as { variant?: string } | null,
    rejected: (r.rejected ?? null) as Array<{ value?: unknown; from?: string; why_rejected?: string }> | null,
    rationale: r.rationale,
    confirmed: Boolean(r.confirmed),
  }));

  const counts = {
    open: decisions.filter((d) => d.status === 'proposed').length,
    inReview: decisions.filter((d) => d.status === 'in-review').length,
    locked: decisions.filter((d) => d.status === 'locked').length,
    rejected: decisions.filter((d) => d.status === 'rejected').length,
  };

  return (
    <div className="mt-6">
      <PageHeader
        title="Design round"
        tagline={project.display_name}
        meta={
          <>
            <code className="font-mono text-zinc-300">{target}</code>
            {' · '}round {current} of {rounds.length}
            {profile ? ` · profile ${profile}` : ''}
            {' · '}
            {decisions.length} sub-decision{decisions.length === 1 ? '' : 's'}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {rounds.length > 1
              ? rounds.map((n) => (
                  <Link
                    key={n}
                    href={`/projects/${slug}/design/${encodeURIComponent(target)}?round=${n}`}
                    className={
                      'rounded-lg border px-2.5 py-1.5 text-xs transition-colors ' +
                      (n === current
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200')
                    }
                  >
                    r{n}
                  </Link>
                ))
              : null}
            <Link
              href={`/projects/${slug}/design`}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
            >
              All targets
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-1.5 flex-wrap">
        {counts.open > 0 ? <Badge variant="status" tone="neutral">{counts.open} open</Badge> : null}
        {counts.inReview > 0 ? <Badge variant="status" tone="open">{counts.inReview} in review</Badge> : null}
        {counts.locked > 0 ? <Badge variant="status" tone="done">{counts.locked} locked</Badge> : null}
        {counts.rejected > 0 ? <Badge variant="status" tone="deprecated">{counts.rejected} rejected</Badge> : null}
        {frozenElsewhere.length > 0 ? (
          <Badge variant="status" tone="maintained" title={frozenElsewhere.map((f) => f.axis).join(', ')}>
            {frozenElsewhere.length} frozen from earlier rounds
          </Badge>
        ) : null}
      </div>

      <RoundPicker
        target={target}
        round={current}
        previewUrl={previewUrl}
        decisions={decisions}
      />
    </div>
  );
}
