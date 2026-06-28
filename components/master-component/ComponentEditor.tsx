// Client editor for a single master_component. PUTs to /api/master-components/[id].
// Reads token from sessionStorage (key 'ottomate_token'). If not set, prompts.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COMPONENT_CATEGORIES } from '@/lib/categories';

type Component = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  tags: string[] | null;
  framework_tags: string[] | null;
  source_code?: string | null;
  preview_url: string | null;
  dependencies: string[] | null;
  variants: string[] | null;
  dark_light_compat: boolean | null;
  responsive: boolean | null;
};

// Single source of truth: lib/categories.ts (taxonomy-refine 2026-06-29).
const CATEGORY_OPTIONS = COMPONENT_CATEGORIES;

function arrInput(arr: string[] | null | undefined): string {
  return (arr ?? []).join(', ');
}
function arrParse(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

export function ComponentEditor({ initial }: { initial: Component }) {
  const router = useRouter();
  const [draft, setDraft] = useState({
    name: initial.name,
    category: initial.category ?? '',
    description: initial.description ?? '',
    tags: arrInput(initial.tags),
    framework_tags: arrInput(initial.framework_tags),
    source_code: initial.source_code ?? '',
    preview_url: initial.preview_url ?? '',
    dependencies: arrInput(initial.dependencies),
    variants: arrInput(initial.variants),
    dark_light_compat: initial.dark_light_compat ?? true,
    responsive: initial.responsive ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    setToken(window.sessionStorage.getItem('ottomate_token') ?? '');
  }, []);

  async function save() {
    if (!token) {
      setError('Bearer token required. Paste it above and try again.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: draft.name || undefined,
        category: draft.category || null,
        description: draft.description || null,
        tags: arrParse(draft.tags).length > 0 ? arrParse(draft.tags) : null,
        framework_tags: arrParse(draft.framework_tags).length > 0 ? arrParse(draft.framework_tags) : null,
        source_code: draft.source_code || null,
        preview_url: draft.preview_url || null,
        dependencies: arrParse(draft.dependencies).length > 0 ? arrParse(draft.dependencies) : null,
        variants: arrParse(draft.variants).length > 0 ? arrParse(draft.variants) : null,
        dark_light_compat: draft.dark_light_compat,
        responsive: draft.responsive,
      };
      const res = await fetch(`/api/master-components/${initial.id}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      setSavedAt(new Date().toLocaleTimeString());
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {!token && (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-300">
          Auth token not auto-loaded. Reload the page; if it still fails, check that the Ottomate container has the bearer-token secret mounted.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}
      {savedAt && (
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          ✓ Saved at {savedAt}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Category">
          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description">
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={2}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm"
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tags (comma-separated)" hint="modern, animated, interactive, basic, accessibility-first">
          <input
            value={draft.tags}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm font-mono"
            placeholder="modern, animated"
          />
        </Field>
        <Field label="Framework tags" hint="react, next, vue, svelte, vanilla">
          <input
            value={draft.framework_tags}
            onChange={(e) => setDraft({ ...draft, framework_tags: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm font-mono"
            placeholder="react, next"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Variants (comma-separated)">
          <input
            value={draft.variants}
            onChange={(e) => setDraft({ ...draft, variants: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm font-mono"
            placeholder="primary, ghost, icon-only"
          />
        </Field>
        <Field label="Dependencies (npm)" hint="framer-motion, lucide-react">
          <input
            value={draft.dependencies}
            onChange={(e) => setDraft({ ...draft, dependencies: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm font-mono"
            placeholder="framer-motion"
          />
        </Field>
      </div>

      <Field label="Preview URL">
        <input
          value={draft.preview_url}
          onChange={(e) => setDraft({ ...draft, preview_url: e.target.value })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm font-mono"
          placeholder="https://codesandbox.io/s/..."
        />
      </Field>

      <Field label="Source code">
        <textarea
          value={draft.source_code}
          onChange={(e) => setDraft({ ...draft, source_code: e.target.value })}
          rows={20}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs font-mono leading-relaxed"
          placeholder="// Paste TSX / Vue / Svelte source here..."
          spellCheck={false}
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors enabled:bg-cyan-500 enabled:text-zinc-950 enabled:hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        <span className="self-center text-xs text-zinc-600">PUT /api/master-components/{initial.id}</span>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</label>
        {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
