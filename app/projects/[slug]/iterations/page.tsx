// Project iterations list — entries link into the lock-in gate UI.

import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const STATUS_COLOURS: Record<string, string> = {
  'awaiting-lock': 'border-amber-900/60 bg-amber-950/30 text-amber-400',
  'pending_user_review': 'border-amber-900/60 bg-amber-950/30 text-amber-400',
  'building': 'border-cyan-900/60 bg-cyan-950/30 text-cyan-400',
  'verifying': 'border-violet-900/60 bg-violet-950/30 text-violet-400',
  'integrated': 'border-emerald-900/60 bg-emerald-950/30 text-emerald-400',
  'cancelled': 'border-zinc-800 bg-zinc-900/40 text-zinc-500',
  'classification-pending': 'border-zinc-800 bg-zinc-900/40 text-zinc-400',
};

export default async function IterationsList({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const iterations = db.select().from(schema.iterations)
    .where(eq(schema.iterations.project_slug, slug))
    .orderBy(desc(schema.iterations.iteration_number)).all();

  return (
    <div className="space-y-3">
      {iterations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
          <p className="text-zinc-500">No iterations yet.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Submit a report via <code className="px-1.5 py-0.5 rounded bg-zinc-900 text-cyan-300">/api/projects/{slug}/reports</code> to start one.
          </p>
        </div>
      ) : (
        iterations.map((it) => {
          const statusClass = STATUS_COLOURS[it.status ?? 'awaiting-lock'] ?? 'border-zinc-800';
          return (
            <Link
              key={it.id}
              href={`/iterations/${it.id}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Iteration {it.iteration_number}</span>
                    <span className={`text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 ${statusClass}`}>
                      {it.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Triggered by {it.trigger_source}
                    {it.locked_at && <> · locked {new Date(it.locked_at).toLocaleString()}</>}
                    {it.integrated_at && <> · integrated {new Date(it.integrated_at).toLocaleString()}</>}
                  </p>
                </div>
                <span className="text-xs text-zinc-600 shrink-0">→</span>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
