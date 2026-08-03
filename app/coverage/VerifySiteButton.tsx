'use client';
// The "Verify site" button (BP-4). Enqueues via a server action, then polls the
// run status (open GET) until the host runner marks it done. The tracker itself
// cannot run the harness — this is the trigger + status surface.
import { useState } from 'react';
import { requestSiteVerify } from './actions';

interface RunResults {
  summary?: { runnable?: number; gaps?: number; ran?: number };
}

function summarize(results: RunResults | null): string {
  const s = results?.summary;
  if (!s) return '';
  return `${s.ran ?? s.runnable ?? '?'} run · ${s.gaps ?? 0} gaps`;
}

export function VerifySiteButton() {
  const [id, setId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [note, setNote] = useState<string>('');

  async function poll(runId: string) {
    for (let i = 0; i < 600; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/verify/${runId}`, { cache: 'no-store' });
        if (!res.ok) continue;
        const { run } = await res.json();
        setStatus(run.status);
        setNote(run.results ? summarize(run.results) : run.error ?? '');
        if (run.status === 'done' || run.status === 'error') return;
      } catch {
        /* transient — keep polling */
      }
    }
  }

  async function start() {
    setStatus('queuing');
    setNote('');
    try {
      const { id: runId } = await requestSiteVerify();
      setId(runId);
      setStatus('queued');
      void poll(runId);
    } catch (e) {
      setStatus('error');
      setNote(String(e));
    }
  }

  const busy = status === 'queuing' || status === 'queued' || status === 'running';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={start}
        disabled={busy}
        className="rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium px-3.5 py-1.5 transition-colors"
      >
        {busy ? 'Verifying…' : 'Verify site'}
      </button>
      {status !== 'idle' && (
        <span className="text-[11px] font-mono text-zinc-400">
          {id ? `${id.slice(0, 18)}… ` : ''}
          <span className="text-zinc-200">{status}</span>
          {status === 'queued' && ' · waiting for the host runner'}
          {note ? ` · ${note}` : ''}
        </span>
      )}
    </div>
  );
}
