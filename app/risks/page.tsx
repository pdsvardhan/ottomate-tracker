// Cross-project risk heatmap.

import Link from 'next/link';
import { count, eq, ne } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const SEVERITY_COLOURS: Record<string, string> = {
  critical: 'border-rose-900/60 bg-rose-950/30 text-rose-300',
  high: 'border-amber-900/60 bg-amber-950/30 text-amber-300',
  medium: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  low: 'border-zinc-800 bg-zinc-950/60 text-zinc-500',
};

export default async function RisksHeatmap() {
  const db = await getDb();
  const catalog = db.select().from(schema.risks_catalog).all();

  const aggregates = db.select({
    risk_type_id: schema.risk_instances.risk_type_id,
    n: count(),
  }).from(schema.risk_instances)
    .where(ne(schema.risk_instances.status, 'resolved'))
    .groupBy(schema.risk_instances.risk_type_id).all();

  const total = aggregates.reduce((s, r) => s + Number(r.n), 0);
  const counts = new Map(aggregates.map((r) => [r.risk_type_id, Number(r.n)]));

  const sorted = catalog
    .map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Risk Heatmap</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {total} open risk{total === 1 ? '' : 's'} across {catalog.length} risk types. Resolved hidden by default (Codex P1 #10).
        </p>
      </header>

      <div className="grid gap-2">
        {sorted.map((r) => {
          const colour = SEVERITY_COLOURS[r.severity_baseline ?? 'medium'] ?? SEVERITY_COLOURS.medium;
          return (
            <div
              key={r.id}
              className={`rounded-xl border p-4 transition-colors ${r.count > 0 ? colour : 'border-zinc-900 bg-zinc-950/40 text-zinc-600'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-[11px] text-zinc-500">{r.id}</code>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">{r.severity_baseline}</span>
                  </div>
                  <h3 className="text-sm font-medium">{r.name}</h3>
                  <p className="mt-1 text-xs opacity-80 line-clamp-2">{r.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-bold ${r.count > 0 ? '' : 'text-zinc-700'}`}>
                    {r.count}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider opacity-60">
                    open
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-zinc-600">
        <Link href="/" className="hover:text-zinc-300">← Back to projects</Link>
      </p>
    </div>
  );
}
