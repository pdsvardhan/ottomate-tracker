// Client component for picking a master_component for a Stage 4 iteration item.
// Fetches /component-options, renders option cards, POSTs the user's pick.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COMPONENT_CATEGORIES } from '@/lib/categories';

// Single source of truth: lib/categories.ts. Leading '' = "— any —" filter.
const CATEGORY_OPTIONS: Array<{ id: string; label: string }> = [
  { id: '', label: '— any —' },
  ...COMPONENT_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

interface ComponentOption {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  tags: string[] | null;
  framework_tags: string[] | null;
  source_code: string | null;
  preview_url: string | null;
  variants: string[] | null;
  dependencies: string[] | null;
  relevance_score: number;
}

interface Props {
  iterationId: number;
  itemId: number;
  itemTitle: string;
}

export function PickComponentClient({ iterationId, itemId, itemTitle }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [options, setOptions] = useState<ComponentOption[] | null>(null);
  const [catalogSize, setCatalogSize] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [picked, setPicked] = useState<ComponentOption | null>(null);
  const [showSourceFor, setShowSourceFor] = useState<string | null>(null);

  useEffect(() => {
    setToken(window.sessionStorage.getItem('ottomate_token') ?? '');
    void load('', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(cat: string, tagStr: string) {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cat) params.set('category', cat);
      if (tagStr) params.set('tags', tagStr);
      params.set('limit', '6');
      const res = await fetch(`/api/iterations/${iterationId}/items/${itemId}/component-options?${params.toString()}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setOptions(data.options ?? []);
      setCatalogSize(data.catalog_size ?? 0);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function pick(option: ComponentOption) {
    if (!token) {
      setError('Bearer token required. Paste it above first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/iterations/${iterationId}/items/${itemId}/pick-component`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ component_id: option.id }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      setPicked(option);
      setTimeout(() => router.push(`/iterations/${iterationId}`), 1500);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!token && (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300">
          Auth token not auto-loaded. Reload the page; if it still fails, check that the Ottomate container has the bearer-token secret mounted.
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Filter the library ({catalogSize} components)</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); void load(e.target.value, tags); }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm"
            >
              {CATEGORY_OPTIONS.map((c) => <option key={c.id || 'any'} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onBlur={() => void load(category, tags)}
              placeholder="modern, animated"
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => void load(category, tags)}
            disabled={busy}
            className="rounded-md bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}
      {picked && (
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 text-sm text-emerald-300">
          ✓ Picked <strong>{picked.name}</strong>. Returning to iteration…
        </div>
      )}

      {options === null ? (
        <p className="text-sm text-zinc-500">Loading options…</p>
      ) : options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
          <p className="text-zinc-500">No components match those filters.</p>
          <p className="mt-1 text-xs text-zinc-600">Try clearing tags or the category filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => (
            <div
              key={option.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors"
            >
              <header>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-semibold text-zinc-100">{option.name}</h4>
                  {option.relevance_score > 0 && (
                    <span className="text-[10px] uppercase tracking-wider rounded-full border border-emerald-900/60 bg-emerald-950/30 text-emerald-300 px-2 py-0.5">
                      match {option.relevance_score}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider">
                  {option.category && (
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-400">
                      {option.category}
                    </span>
                  )}
                  {(option.tags ?? []).map((t) => (
                    <span key={t} className="rounded-full bg-zinc-800/60 text-zinc-400 px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{option.id}</p>
              </header>

              {option.description && (
                <p className="text-xs text-zinc-400 line-clamp-3">{option.description}</p>
              )}

              {option.preview_url && (
                <a
                  href={option.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:underline truncate"
                >
                  preview ↗
                </a>
              )}

              <div className="text-[11px] text-zinc-500 space-y-0.5">
                {option.framework_tags && option.framework_tags.length > 0 && (
                  <div>frameworks: <span className="font-mono text-zinc-400">{option.framework_tags.join(', ')}</span></div>
                )}
                {option.variants && option.variants.length > 0 && (
                  <div>variants: <span className="font-mono text-zinc-400">{option.variants.join(', ')}</span></div>
                )}
                {option.dependencies && option.dependencies.length > 0 && (
                  <div>deps: <span className="font-mono text-zinc-400">{option.dependencies.join(', ')}</span></div>
                )}
              </div>

              {option.source_code && (
                <button
                  type="button"
                  onClick={() => setShowSourceFor(showSourceFor === option.id ? null : option.id)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 self-start"
                >
                  {showSourceFor === option.id ? '▼ hide source' : '▶ show source'}
                </button>
              )}
              {showSourceFor === option.id && option.source_code && (
                <pre className="rounded-md bg-zinc-950 border border-zinc-800 p-2 text-[10px] text-zinc-300 overflow-x-auto max-h-60 overflow-y-auto">
                  {option.source_code}
                </pre>
              )}

              <div className="mt-auto pt-2">
                <button
                  type="button"
                  disabled={busy || picked !== null}
                  onClick={() => void pick(option)}
                  className="w-full rounded-lg px-3 py-2 text-sm font-semibold enabled:bg-cyan-500 enabled:text-zinc-950 enabled:hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
                >
                  Use this for &ldquo;{itemTitle}&rdquo;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

