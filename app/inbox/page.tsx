// Cross-project bug inbox.

import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = (params.status ?? 'pending') as 'pending' | 'classified' | 'failed' | 'ignored';

  const db = await getDb();
  const reports = db.select().from(schema.reports)
    .where(eq(schema.reports.status, status))
    .orderBy(desc(schema.reports.submitted_at)).all();

  const STATUSES = ['pending', 'classified', 'failed', 'ignored'] as const;

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Bug Inbox</h1>
        <p className="mt-1 text-sm text-zinc-500">Cross-project pending reports and feedback.</p>
      </header>

      <div className="mb-6 flex items-center gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/inbox?status=${s}`}
            className={`text-xs rounded-full border px-3 py-1 transition-colors ${
              s === status
                ? 'border-cyan-700 bg-cyan-950/40 text-cyan-300'
                : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
          <p className="text-zinc-500">No {status} reports.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/projects/${r.project_slug}`}
                  className="text-sm font-medium text-cyan-400 hover:underline"
                >
                  {r.project_slug}
                </Link>
                <span className="text-[10px] text-zinc-500 shrink-0">
                  {r.source} · {r.submitted_at && new Date(r.submitted_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap line-clamp-3">
                {r.raw_text}
              </p>
              {r.flow_id && (
                <p className="mt-2 text-[11px] text-zinc-500">
                  flow: <code className="text-zinc-400">{r.flow_id}</code>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
