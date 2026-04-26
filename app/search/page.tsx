// Cross-doc FTS5 search.

import Link from 'next/link';
import { getRawSqlite } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

interface Match {
  doc_type: string;
  doc_id: string;
  project_slug: string;
  title: string;
  snippet: string;
  rank: number;
}

const DOC_LABELS: Record<string, string> = {
  flow: 'Flow',
  feature: 'Feature',
  page: 'Page',
  bug: 'Bug',
  decision: 'Decision',
};

function linkFor(m: Match): string {
  // For now, link to project page; detailed deep-links come in Phase 5.
  return `/projects/${m.project_slug}`;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  let grouped: Record<string, Match[]> = {};
  let total = 0;
  let error: string | null = null;

  if (query.length >= 2) {
    const sanitised = query.replace(/['"\(\)\[\]\:\*]/g, ' ').trim();
    if (sanitised.length >= 2) {
      const ftsQuery = sanitised.split(/\s+/).map((t) => `"${t}"*`).join(' ');
      try {
        const sqlite = await getRawSqlite();
        const rows = sqlite.prepare(`
          SELECT doc_type, doc_id, project_slug, title,
            snippet(ottomate_fts, -1, '<mark>', '</mark>', '...', 12) AS snippet,
            bm25(ottomate_fts) AS rank
          FROM ottomate_fts
          WHERE ottomate_fts MATCH ?
          ORDER BY rank
          LIMIT 50
        `).all(ftsQuery) as Match[];
        for (const r of rows) {
          if (!grouped[r.doc_type]) grouped[r.doc_type] = [];
          grouped[r.doc_type].push(r);
        }
        total = rows.length;
      } catch (err) {
        error = String(err);
      }
    }
  }

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Full-text across flows, features, pages, bugs, decisions.
        </p>
      </header>

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search…"
          autoFocus
          className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2 text-sm placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
        />
      </form>

      {error && (
        <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300 mb-4">
          {error}
        </div>
      )}

      {query.length === 0 ? (
        <p className="text-sm text-zinc-500">Type a query to search.</p>
      ) : query.length < 2 ? (
        <p className="text-sm text-amber-400">Query must be at least 2 characters.</p>
      ) : total === 0 ? (
        <p className="text-sm text-zinc-500">No matches for &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-zinc-500">{total} match{total === 1 ? '' : 'es'}</p>
          {Object.entries(grouped).map(([type, rows]) => (
            <section key={type}>
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                {DOC_LABELS[type] ?? type} · {rows.length}
              </h2>
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={`${r.doc_type}-${r.doc_id}`}>
                    <Link
                      href={linkFor(r)}
                      className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-sm font-medium text-zinc-100">{r.title}</h3>
                        <span className="text-[10px] text-zinc-500">{r.project_slug} · {r.doc_id}</span>
                      </div>
                      {r.snippet && (
                        <p
                          className="mt-1 text-xs text-zinc-400"
                          dangerouslySetInnerHTML={{ __html: r.snippet }}
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
