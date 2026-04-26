// Home — project list. Server component; queries DB directly.

import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const STATUS_COLOURS: Record<string, string> = {
  building: 'text-cyan-400 border-cyan-900/60 bg-cyan-950/30',
  shipped: 'text-emerald-400 border-emerald-900/60 bg-emerald-950/30',
  paused: 'text-amber-400 border-amber-900/60 bg-amber-950/30',
  archived: 'text-zinc-500 border-zinc-800 bg-zinc-900/40',
};

const PHASE_LABELS: Record<string, string> = {
  ideating: 'Ideating',
  building: 'Building',
  shipped: 'Shipped',
  maintained: 'Maintained',
  deprecated: 'Deprecated',
};

export default async function HomePage() {
  const db = await getDb();
  const projects = db.select().from(schema.projects)
    .orderBy(desc(schema.projects.updated_at)).all();

  const totalReports = db.select({ id: schema.reports.id }).from(schema.reports)
    .where(eq(schema.reports.status, 'pending')).all().length;

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} ·{' '}
            {totalReports > 0 ? (
              <Link href="/inbox" className="text-amber-400 hover:underline">
                {totalReports} pending bug{totalReports === 1 ? '' : 's'}
              </Link>
            ) : (
              <span className="text-zinc-600">inbox clear</span>
            )}
          </p>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
          <p className="text-zinc-500">No projects yet.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Run <code className="px-1.5 py-0.5 rounded bg-zinc-900 text-cyan-300">/ottomate</code> in Claude Code to start one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const statusClass = STATUS_COLOURS[p.current_status ?? 'building'] ?? STATUS_COLOURS.building;
            return (
              <Link
                key={p.slug}
                href={`/projects/${p.slug}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 hover:bg-zinc-900/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate group-hover:text-cyan-300 transition-colors">
                      {p.display_name}
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500 truncate">{p.slug}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 ${statusClass}`}>
                    {p.current_status}
                  </span>
                </div>
                {p.tagline && (
                  <p className="mt-3 text-sm text-zinc-400 line-clamp-2">{p.tagline}</p>
                )}
                <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-600">
                  <span>{PHASE_LABELS[p.lifecycle_phase ?? 'ideating']}</span>
                  {p.port && <span className="font-mono">:{p.port}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
