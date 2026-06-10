// Cross-project bug inbox.
// Iteration #5 C.5: + Submit-bug modal wired (closes item 33).
// Showcase overhaul: submit-bug entry points (modal trigger + header action) deferred;
// route kept live as a read-only report list. SubmitBugModal component retained in repo.

import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

const STATUSES = ['pending', 'classified', 'failed', 'ignored'] as const;
type Status = (typeof STATUSES)[number];

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = (STATUSES.includes(params.status as Status) ? params.status : 'pending') as Status;

  const db = await getDb();
  const reports = db
    .select()
    .from(schema.reports)
    .where(eq(schema.reports.status, status))
    .orderBy(desc(schema.reports.submitted_at))
    .all();

  const counts: Record<Status, number> = { pending: 0, classified: 0, failed: 0, ignored: 0 };
  for (const s of STATUSES) {
    counts[s] = db
      .select({ id: schema.reports.id })
      .from(schema.reports)
      .where(eq(schema.reports.status, s))
      .all().length;
  }

  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">
      <PageHeader
        title="Bug Inbox"
        tagline="cross-project reports & feedback"
        meta={
          <span className="inline-flex items-center gap-3">
            <span><span className="text-zinc-200 font-medium">{counts.pending}</span> pending</span>
            <span className="text-zinc-700">·</span>
            <span>{counts.classified} classified</span>
            <span className="text-zinc-700">·</span>
            <span>{counts.failed} failed</span>
            <span className="text-zinc-700">·</span>
            <span>{counts.ignored} ignored</span>
          </span>
        }
      />

      <div className="mb-6 flex items-center gap-2 flex-wrap">
        {STATUSES.map((s) => {
          const isActive = s === status;
          return (
            <Link
              key={s}
              href={`/inbox?status=${s}`}
              className={
                'text-xs rounded-full border px-3 py-1.5 backdrop-blur-sm transition-all ' +
                (isActive
                  ? 'border-cyan-700/60 bg-cyan-500/10 text-cyan-200 shadow-[0_0_15px_-5px_rgba(0,212,170,0.4)]'
                  : 'border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700/80 hover:text-zinc-200')
              }
            >
              {s} <span className="ml-1 font-mono text-zinc-600">{counts[s]}</span>
            </Link>
          );
        })}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title={`No ${status} reports`}
          body={status === 'pending' ? 'Submit a bug to start the loop, or browse the other tabs.' : 'Nothing here yet.'}
        />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5 transition-colors hover:border-zinc-700/80"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <Link
                  href={`/projects/${r.project_slug}`}
                  className="text-sm font-medium text-cyan-300 hover:text-cyan-100 transition-colors"
                >
                  {r.project_slug}
                </Link>
                <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                  {r.source} · {r.submitted_at && new Date(r.submitted_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                {r.raw_text}
              </p>
              {r.flow_id && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant="tag">flow</Badge>
                  <code className="text-[11px] font-mono text-zinc-500">{r.flow_id}</code>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* SubmitBugModal trigger deferred for the showcase — modal component is kept in
          the repo (app/inbox/SubmitBugModal.tsx), just not mounted here. The /inbox
          route stays live (read-only report list). */}
    </div>
  );
}
