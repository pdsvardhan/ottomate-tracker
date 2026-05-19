// Project iterations list — Spotlight Glass redesign (C.7 closes iteration #5 item 32).
// Each iteration is the unit of Stage 4 work: raw report -> classify -> lock -> build ->
// verify -> integrate. This page surfaces ALL iterations for the project with
// item-status counts + a CTA to start a new one.

import Link from 'next/link';
import { count, desc, eq, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PRIMARY_BUTTON_CLASSES } from '@/components/ui/FilterBar';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'open' | 'building' | 'shipped' | 'neutral' | 'blocked'> = {
  'awaiting-lock': 'open',
  'pending_user_review': 'open',
  'classification-pending': 'neutral',
  'building': 'building',
  'verifying': 'building',
  'integrated': 'shipped',
  'cancelled': 'neutral',
  'failed': 'blocked',
};

export default async function IterationsList({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();

  const iterations = db
    .select()
    .from(schema.iterations)
    .where(eq(schema.iterations.project_slug, slug))
    .orderBy(desc(schema.iterations.iteration_number))
    .all();

  // Per-iteration item rollup (single grouped query for the lot).
  const itemCounts = db
    .select({
      iteration_id: schema.iteration_items.iteration_id,
      status: schema.iteration_items.status,
      count: count(),
    })
    .from(schema.iteration_items)
    .groupBy(schema.iteration_items.iteration_id, schema.iteration_items.status)
    .all();

  const countsByIter = new Map<number, { verified: number; locked: number; integrated: number; other: number; total: number }>();
  for (const row of itemCounts) {
    const cell = countsByIter.get(row.iteration_id) ?? { verified: 0, locked: 0, integrated: 0, other: 0, total: 0 };
    cell.total += row.count;
    if (row.status === 'verified') cell.verified += row.count;
    else if (row.status === 'locked') cell.locked += row.count;
    else if (row.status === 'integrated') cell.integrated += row.count;
    else cell.other += row.count;
    countsByIter.set(row.iteration_id, cell);
  }

  return (
    <div className="space-y-6">
      {/* Header with purpose + CTA */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-zinc-200">Iterations</h2>
          <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
            Each iteration is one Stage 4 mini-pipeline: raw report → classifier extracts items → you
            lock the list → coder builds → verifier checks → integrate. Iterations stay browsable forever
            so you can audit what was asked, built, and shipped.
          </p>
        </div>
        <Link href="/inbox?action=new" className={PRIMARY_BUTTON_CLASSES}>
          + Submit a report
        </Link>
      </div>

      {iterations.length === 0 ? (
        <EmptyState
          title="No iterations yet"
          body={`Submit a report from /inbox or POST raw_text to /api/projects/${slug}/reports to start one. Classifier extracts structured items; you lock-in via the gate; coder + verifier do the rest.`}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {iterations.map((it) => {
            const status = it.status ?? 'awaiting-lock';
            const tone = STATUS_TONE[status] ?? 'neutral';
            const counts = countsByIter.get(it.id) ?? { verified: 0, locked: 0, integrated: 0, other: 0, total: 0 };

            return (
              <SpotlightCard key={it.id} href={`/iterations/${it.id}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors">
                      Iteration {it.iteration_number}
                    </h3>
                    <code className="text-[11px] font-mono text-zinc-500">id {it.id}</code>
                  </div>
                  <Badge variant="status" tone={tone}>{status}</Badge>
                </div>

                {it.trigger_source && (
                  <p className="text-xs text-zinc-500">
                    triggered by <span className="text-zinc-300">{it.trigger_source}</span>
                  </p>
                )}

                {counts.total > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="count">{counts.total} total</Badge>
                    {counts.verified > 0 && <Badge variant="status" tone="shipped">{counts.verified} verified</Badge>}
                    {counts.locked > 0 && <Badge variant="status" tone="open">{counts.locked} locked</Badge>}
                    {counts.integrated > 0 && <Badge variant="status" tone="shipped">{counts.integrated} integrated</Badge>}
                    {counts.other > 0 && <Badge variant="status" tone="neutral">{counts.other} other</Badge>}
                  </div>
                )}

                <div className="mt-3 text-[11px] text-zinc-500 space-y-0.5">
                  {it.locked_at && (
                    <div>locked: {new Date(it.locked_at).toLocaleString()}</div>
                  )}
                  {it.integrated_at && (
                    <div>integrated: {new Date(it.integrated_at).toLocaleString()}</div>
                  )}
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
