'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/** Delete control for a master_component detail page (iter-15: Edit removed per
 *  owner — delete is enough). Mutations use the sessionStorage('ottomate_token')
 *  -> Bearer convention shared with AddComponentModal. */
export function ComponentAdminBar({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
      const res = await fetch(`/api/master-components/${id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'request failed' }));
        setError(j.error ? `${j.error}` : `HTTP ${res.status}`);
        setDeleting(false);
        return;
      }
      startTransition(() => {
        router.push('/components-browser');
        router.refresh();
      });
    } catch (err) {
      setError(String(err));
      setDeleting(false);
    }
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-rose-300">Delete {id} and its DB row?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Confirm delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200 transition-colors"
        >
          Delete
        </button>
      )}

      {error ? <span className="text-xs text-rose-300">{error}</span> : null}

      <span className="ml-auto text-[11px] text-zinc-600">
        Mutations require the bearer token in <code className="font-mono">sessionStorage.ottomate_token</code>.
      </span>
    </div>
  );
}
