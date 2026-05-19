'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface FlowRow {
  id: string;
  title: string;
  trigger: string | null;
  expected_outcome: string | null;
  type: string | null;
  test_status: string | null;
  last_tested_date: number | Date | null;
}

const STATUS_TONE: Record<string, 'shipped' | 'blocked' | 'neutral' | 'open'> = {
  passing: 'shipped',
  failing: 'blocked',
  'not-tested': 'neutral',
};

export function FlowTestRow({ flow, projectSlug }: { flow: FlowRow; projectSlug: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const status = flow.test_status ?? 'not-tested';
  const tone = STATUS_TONE[status] ?? 'neutral';

  async function mark(newStatus: 'passing' | 'failing') {
    setBusy(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
      const res = await fetch(`/api/flows/${flow.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus, ran_by: 'user' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'request failed' }));
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="group rounded-xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur px-4 py-3 transition-colors hover:border-zinc-700/60">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-baseline gap-2 text-left min-w-0 flex-1"
        >
          <span className={'text-[10px] font-mono ' + (expanded ? 'text-cyan-300' : 'text-zinc-600')}>
            {expanded ? '▼' : '▶'}
          </span>
          <code className="text-[10px] font-mono text-zinc-500 truncate">{flow.id}</code>
          <span className="text-sm text-zinc-200 truncate">{flow.title}</span>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="status" tone={tone}>{status}</Badge>
          <button
            type="button"
            onClick={() => mark('passing')}
            disabled={busy}
            title="Mark passing"
            className="rounded-md px-2 py-1 text-[11px] border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
          >
            pass
          </button>
          <button
            type="button"
            onClick={() => mark('failing')}
            disabled={busy}
            title="Mark failing — opens bug report"
            className="rounded-md px-2 py-1 text-[11px] border border-rose-500/20 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
          >
            fail
          </button>
          <Link
            href={`/inbox?action=new&project=${projectSlug}&flow=${flow.id}`}
            title="Report bug on this flow"
            className="rounded-md px-2 py-1 text-[11px] border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            bug
          </Link>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-zinc-800/40 space-y-2 text-xs">
          {flow.trigger && (
            <p>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 mr-2">trigger</span>
              <span className="text-zinc-300">{flow.trigger}</span>
            </p>
          )}
          {flow.expected_outcome && (
            <p>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 mr-2">expects</span>
              <span className="text-zinc-300">{flow.expected_outcome}</span>
            </p>
          )}
          {flow.type && (
            <p>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 mr-2">type</span>
              <Badge variant="tag">{flow.type}</Badge>
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-rose-200">{error}</p>
          )}
        </div>
      )}
    </li>
  );
}
