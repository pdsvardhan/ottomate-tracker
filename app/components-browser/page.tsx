// Master components browser — central asset library catalog.

import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function ComponentsBrowser({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const db = await getDb();
  const all = db.select().from(schema.master_components)
    .orderBy(asc(schema.master_components.id)).all();

  const queryNorm = q?.toLowerCase().trim();
  const filtered = queryNorm
    ? all.filter((c) => {
        return (
          (c.id ?? '').toLowerCase().includes(queryNorm) ||
          (c.name as string ?? '').toLowerCase().includes(queryNorm) ||
          ((c as Record<string, unknown>).description as string | undefined ?? '').toLowerCase().includes(queryNorm)
        );
      })
    : all;

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Components</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {filtered.length} of {all.length} components in the central asset library.
        </p>
      </header>

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name, ID, or description…"
          className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2 text-sm placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
        />
      </form>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const desc = ((c as Record<string, unknown>).description as string | undefined) ?? '';
          return (
            <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-400">
                  {(c as Record<string, unknown>).category as string ?? '—'}
                </span>
                <code className="text-[11px] text-zinc-500 truncate">{c.id}</code>
              </div>
              <h3 className="text-sm font-medium text-zinc-100">{c.name}</h3>
              {desc && <p className="mt-1 text-xs text-zinc-400 line-clamp-3">{desc}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
