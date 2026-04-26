// THE LOCK-IN GATE — iteration detail page.
// Anti-gaslighting bedrock (R1.3, Phase 6 of TODO.md).
// Shows raw text + extracted items side-by-side. User edits/rejects/locks.

import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { LockInPanel } from '@/components/iteration/LockInPanel';
import { TraceReport } from '@/components/iteration/TraceReport';

export const dynamic = 'force-dynamic';

export default async function IterationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) notFound();

  const db = await getDb();
  const iteration = db.select().from(schema.iterations).where(eq(schema.iterations.id, idNum)).get();
  if (!iteration) notFound();

  const items = db.select().from(schema.iteration_items)
    .where(eq(schema.iteration_items.iteration_id, idNum))
    .orderBy(asc(schema.iteration_items.id)).all();

  const report = iteration.raw_text_id
    ? (db.select().from(schema.reports).where(eq(schema.reports.id, iteration.raw_text_id)).get() ?? null)
    : null;

  const isEditable = ['awaiting-lock', 'pending_user_review'].includes(iteration.status ?? '');
  const isIntegrated = iteration.status === 'integrated';

  return (
    <div className="px-8 py-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <Link
          href={`/projects/${iteration.project_slug}/iterations`}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← {iteration.project_slug} iterations
        </Link>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold">Iteration {iteration.iteration_number}</h1>
          <span className="text-[10px] uppercase tracking-wider rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-zinc-400">
            {iteration.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Triggered by <code className="text-zinc-300">{iteration.trigger_source}</code>
          {iteration.locked_at && <> · locked at {new Date(iteration.locked_at).toLocaleString()}</>}
        </p>
      </header>

      {isIntegrated && (iteration.trace_report || iteration.lock_in_audit) ? (
        <TraceReport
          iteration={iteration}
          items={items}
          report={report}
        />
      ) : isEditable ? (
        <LockInPanel
          iterationId={iteration.id}
          rawText={report?.raw_text ?? null}
          items={items}
        />
      ) : (
        <BuildProgress iteration={iteration} items={items} />
      )}
    </div>
  );
}

function BuildProgress({ iteration, items }: { iteration: typeof schema.iterations.$inferSelect; items: typeof schema.iteration_items.$inferSelect[]; }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-4 text-sm text-cyan-300">
        Locked at {iteration.locked_at && new Date(iteration.locked_at).toLocaleString()}.
        Skill is building items now. Status auto-refreshes when verifier results arrive.
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{it.title}</div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  {it.item_type} · {it.target_kind ?? '—'} · {it.target_id ?? '—'}
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wider rounded-full border border-zinc-800 px-2 py-0.5 text-zinc-400 shrink-0">
                {it.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
