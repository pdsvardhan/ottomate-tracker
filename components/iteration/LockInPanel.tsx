// Anti-gaslighting bedrock UI (R1.3): user reviews extracted items
// side-by-side with original raw text, edits / rejects / approves, then locks.
// Spotlight Glass redesign — iteration #6 item 50.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import {
  FILTER_CONTROL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from '@/components/ui/FilterBar';

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

type VqaComment = {
  id: number;
  category: string | null;
  text: string;
  url: string | null;
  target: string | null;
  screenshot_url: string | null;
};

type Props = {
  iterationId: number;
  rawText: string | null;
  items: Item[];
  comments?: VqaComment[];
};

const CONFIDENCE_FLOOR = 0.7;

export function LockInPanel({ iterationId, rawText, items: initialItems, comments }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = items.filter((i) => i.status !== 'rejected');
  const blocking = active.filter((i) => (i.confidence ?? 0) < CONFIDENCE_FLOOR && !i.user_edited);
  const rejected = items.filter((i) => i.status === 'rejected');
  const canLock = active.length > 0 && blocking.length === 0;

  function token(): string | null {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
  }

  async function patchItem(itemId: number, patch: Partial<Item>) {
    setBusy(`item-${itemId}`);
    setError(null);
    try {
      const res = await fetch(`/api/iterations/${iterationId}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        },
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
        headers: {
          'content-type': 'application/json',
          ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        },
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
        headers: {
          'content-type': 'application/json',
          ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        },
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
      <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-7rem)] overflow-auto">
        <h2 className="text-sm font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent mb-3">
          {comments && comments.length > 0 ? '📷 Visual-QA source' : 'Original report'}
        </h2>
        {comments && comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 overflow-hidden">
                {c.screenshot_url && (
                  <a href={c.screenshot_url} target="_blank" rel="noopener noreferrer" title="Open full screenshot">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.screenshot_url}
                      alt="comment screenshot"
                      loading="lazy"
                      className="block w-full max-h-48 object-cover object-top border-b border-zinc-800/60"
                    />
                  </a>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {c.category && <Badge variant="tag">{c.category}</Badge>}
                    {c.url && (
                      <span className="text-[10px] text-zinc-600 truncate">{c.url.replace(/^https?:\/\//, '')}</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : rawText ? (
          <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{rawText}</p>
        ) : (
          <p className="text-xs text-zinc-600 italic">— no raw text linked</p>
        )}
        <p className="mt-4 pt-4 border-t border-zinc-800/40 text-[11px] text-zinc-500 leading-relaxed">
          What you see on the right is what the skill extracted from your text. Edit anything that doesn't match.
          Reject anything that wasn't what you asked for. Lock only after every item reads true.
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Extracted items
            </h2>
            <Badge variant="count">{active.length} active</Badge>
            {rejected.length > 0 && <Badge variant="status" tone="blocked">{rejected.length} rejected</Badge>}
          </div>
          <button
            type="button"
            onClick={lock}
            disabled={!canLock || busy !== null}
            className={PRIMARY_BUTTON_CLASSES + ' disabled:opacity-40 disabled:cursor-not-allowed'}
            title={canLock ? 'Lock this list and start the build' : 'All active items must be confidence ≥ 0.7 OR user-edited'}
          >
            {busy === 'lock' ? 'Locking…' : '🔒 Lock & build'}
          </button>
        </div>

        {blocking.length > 0 && (
          <div className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur px-4 py-3 text-xs text-amber-200">
            {blocking.length} item{blocking.length === 1 ? '' : 's'} below the confidence floor ({CONFIDENCE_FLOOR}).
            Edit to confirm intent, or reject — the lock button enables once nothing's flagged.
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 backdrop-blur px-4 py-3 text-xs text-rose-200">
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
  const needsReview = lowConfidence && !item.user_edited && !isRejected;

  const surface = isRejected
    ? 'border-zinc-900/60 bg-zinc-950/40 opacity-60'
    : needsReview
    ? 'border-amber-500/30 bg-amber-500/5 backdrop-blur-xl'
    : 'border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl';

  return (
    <li className={'rounded-2xl border p-4 transition-colors ' + surface}>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {item.item_type && <Badge variant="tag">{item.item_type}</Badge>}
        {item.target_kind && (
          <Badge variant="tag">{item.target_kind}{item.target_id ? `:${item.target_id}` : ''}</Badge>
        )}
        {item.user_edited && <Badge variant="status" tone="building">edited</Badge>}
        {!item.user_edited && item.confidence != null && (
          <Badge variant="status" tone={lowConfidence ? 'open' : 'neutral'}>
            {(item.confidence * 100).toFixed(0)}% conf
          </Badge>
        )}
        {isRejected && <Badge variant="status" tone="blocked">rejected</Badge>}
      </div>

      {editing && !isRejected ? (
        <div className="space-y-2">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className={FILTER_CONTROL_CLASSES + ' w-full text-sm font-medium'}
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Add a description (optional)…"
            rows={3}
            className={FILTER_CONTROL_CLASSES + ' w-full text-sm text-zinc-300 resize-y'}
          />
        </div>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{item.title}</h3>
          {item.description && (
            <p className="mt-1.5 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {item.description}
            </p>
          )}
        </>
      )}

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
                className={PRIMARY_BUTTON_CLASSES + ' text-xs disabled:opacity-50'}
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
                className={SECONDARY_BUTTON_CLASSES + ' text-xs disabled:opacity-50'}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-cyan-300 hover:text-cyan-100 transition-colors"
              >
                Edit
              </button>
              <span className="text-zinc-700">·</span>
              <button
                type="button"
                disabled={busy}
                onClick={onReject}
                className="text-rose-300 hover:text-rose-100 transition-colors disabled:opacity-50"
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
