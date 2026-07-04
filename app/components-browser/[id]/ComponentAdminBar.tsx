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

  // Danger zone (iter-16): prominent, clearly-scoped delete; the dev-only
  // "bearer token" hint was removed from the showcase.
  return (
    <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.04] px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[length:var(--t-label)] font-semibold text-rose-200">Danger zone</span>
        <span className="text-[length:var(--t-cap)] text-zinc-500">Permanently remove this component and its database row.</span>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2.5">
          <span className="text-[length:var(--t-cap)] text-rose-300">Delete {id}?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-rose-500/60 bg-rose-500/20 px-4 py-2 text-[length:var(--t-label)] font-semibold text-rose-100 hover:bg-rose-500/30 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Confirm delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-[length:var(--t-cap)] text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="shrink-0 rounded-lg border border-rose-500/50 bg-rose-500/15 px-4 py-2 text-[length:var(--t-label)] font-semibold text-rose-200 hover:bg-rose-500/25 hover:text-rose-100 transition-colors"
        >
          Delete component
        </button>
      )}

      {error ? <span className="w-full text-[length:var(--t-cap)] text-rose-300">{error}</span> : null}
    </div>
  );
}
