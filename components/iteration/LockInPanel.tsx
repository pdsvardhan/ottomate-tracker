// Anti-gaslighting bedrock UI (R1.3): user reviews extracted items
// side-by-side with original raw text, edits / rejects / approves, then locks.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = {
  id: number;
  iteration_id: number;
  item_type: string | null;
  title: string;
  description: string | null;
  target_kind: string | null;
  target_id: string | null;
  confidence: number | null;
  user_edited: boolean | null;
  status: string | null;
  notes: string | null;
};

type Props = {
  iterationId: number;
  rawText: string | null;
  items: Item[];
};

const CONFIDENCE_FLOOR = 0.7;

export function LockInPanel({ iterationId, rawText, items: initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = items.filter((i) => i.status !== 'rejected');
  const blocking = active.filter((i) => (i.confidence ?? 0) < CONFIDENCE_FLOOR && !i.user_edited);
  const canLock = active.length > 0 && blocking.length === 0;

  async function patchItem(itemId: number, patch: Partial<Item>) {
    setBusy(`item-${itemId}`);
    setError(null);
    try {
      const res = await fetch(`/api/iterations/${iterationId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems((current) => current.map((i) => (i.id === itemId ? { ...i, ...data.item } : i)));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  }

  async function rejectItem(itemId: number) {
    setBusy(`item-${itemId}`);
    setError(null);
    try {
      const res = await fetch(`/api/iterations/${iterationId}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems((current) => current.map((i) => (i.id === itemId ? { ...i, ...data.item } : i)));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(null);
    }
  }

  async function lock() {
    setBusy('lock');
    setError(null);
    try {
      const res = await fetch(`/api/iterations/${iterationId}/lock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(String(err));
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-7rem)] overflow-auto">
        <h2 className="text-sm font-semibold text-zinc-300 mb-2">Original report</h2>
        {rawText ? (
          <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{rawText}</p>
        ) : (
          <p className="text-xs text-zinc-600">— no raw text linked</p>
        )}
        <div className="mt-4 pt-4 border-t border-zinc-800 text-[11px] text-zinc-500">
          What you see on the right is what the skill extracted. Edit anything that doesn't match. Reject anything that's not what you asked for.
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Extracted items ({active.length})</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={lock}
              disabled={!canLock || busy !== null}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors enabled:bg-cyan-500 enabled:text-zinc-950 enabled:hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
              title={canLock ? 'Lock this list and start the build' : 'All items must be confidence ≥ 0.7 OR user-edited'}
            >
              {busy === 'lock' ? 'Locking…' : '🔒 Lock & build'}
            </button>
          </div>
        </div>

        {blocking.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300">
            {blocking.length} item{blocking.length === 1 ? '' : 's'} below confidence floor ({CONFIDENCE_FLOOR}) — edit to confirm intent, or reject.
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <ul className="space-y-2">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              busy={busy === `item-${item.id}`}
              onPatch={(patch) => patchItem(item.id, patch)}
              onReject={() => rejectItem(item.id)}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function ItemCard({
  item,
  busy,
  onPatch,
  onReject,
}: {
  item: Item;
  busy: boolean;
  onPatch: (patch: Partial<Item>) => void;
  onReject: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: item.title, description: item.description ?? '' });

  const isRejected = item.status === 'rejected';
  const lowConfidence = (item.confidence ?? 0) < CONFIDENCE_FLOOR;

  const borderClass = isRejected
    ? 'border-zinc-900 bg-zinc-950 opacity-60'
    : lowConfidence && !item.user_edited
    ? 'border-amber-900/60 bg-amber-950/20'
    : 'border-zinc-800 bg-zinc-900/40';

  return (
    <li className={`rounded-xl border p-4 transition-colors ${borderClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-400">
              {item.item_type}
            </span>
            {item.target_kind && (
              <span className="text-[10px] text-zinc-500">→ {item.target_kind}{item.target_id ? `:${item.target_id}` : ''}</span>
            )}
            {item.user_edited && (
              <span className="text-[10px] text-cyan-400">edited</span>
            )}
            {!item.user_edited && item.confidence != null && (
              <span className={`text-[10px] ${lowConfidence ? 'text-amber-400' : 'text-zinc-500'}`}>
                {(item.confidence * 100).toFixed(0)}% conf
              </span>
            )}
            {isRejected && <span className="text-[10px] text-rose-400">rejected</span>}
          </div>
          {editing && !isRejected ? (
            <>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm font-medium"
              />
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Add a description (optional)…"
                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-300 min-h-[60px]"
              />
            </>
          ) : (
            <>
              <h3 className="text-sm font-medium text-zinc-100">{item.title}</h3>
              {item.description && (
                <p className="mt-1 text-xs text-zinc-400 whitespace-pre-wrap">{item.description}</p>
              )}
            </>
          )}
        </div>
      </div>

      {!isRejected && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {editing ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onPatch({ title: draft.title, description: draft.description || null });
                  setEditing(false);
                }}
                className="rounded-md bg-cyan-500 text-zinc-950 px-3 py-1 font-medium hover:bg-cyan-400 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setDraft({ title: item.title, description: item.description ?? '' });
                  setEditing(false);
                }}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onReject}
                className="text-rose-400 hover:text-rose-300"
              >
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
