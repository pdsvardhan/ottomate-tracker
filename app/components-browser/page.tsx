// /components-browser — central asset library, grouped by category.
// All 15 taxonomy categories visible (even empty ones) with counts and click-to-filter.

import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

// Display order = taxonomy order (references/component-taxonomy.md). Some
// categories will start empty until the user fills them in via the edit form
// or the skill's Stage 2.3 cross-project scan.
const CATEGORY_ORDER: Array<{ id: string; label: string; description: string }> = [
  { id: 'input', label: 'Inputs', description: 'Text/number/picker single-value' },
  { id: 'selection', label: 'Selection', description: 'Boolean / discrete-set' },
  { id: 'button-action', label: 'Buttons & Actions', description: 'Click targets — animated bias' },
  { id: 'display', label: 'Display', description: 'Cards, badges, avatars, tooltips' },
  { id: 'navigation', label: 'Navigation', description: 'Top-level wayfinding' },
  { id: 'feedback', label: 'Feedback', description: 'Loading / empty / error / success' },
  { id: 'overlay', label: 'Overlay', description: 'Modal / drawer / popover / sheet' },
  { id: 'layout', label: 'Layout', description: 'Page composition primitives' },
  { id: 'animation', label: 'Animation primitives', description: 'Reusable motion building blocks' },
  { id: 'transition', label: 'Transitions', description: 'Connecting two states' },
  { id: 'dataviz', label: 'Data visualisation', description: 'Charts and viz primitives' },
  { id: 'media', label: 'Media', description: 'Image / video / audio / carousel' },
  { id: 'modern-specialty', label: 'Modern / Specialty', description: 'Glassmorphism, neon, aurora, holographic' },
  { id: 'interactive', label: 'Interactive Behaviours', description: 'Drag, sort, swipe, virtualised' },
  { id: 'forms-validation', label: 'Forms & Validation', description: 'Form-level patterns' },
];

export default async function ComponentsBrowser({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string; only?: string }> }) {
  const { q, tag, only } = await searchParams;
  const db = await getDb();
  const all = db.select().from(schema.master_components)
    .orderBy(asc(schema.master_components.id)).all();

  const queryNorm = q?.toLowerCase().trim();
  const filtered = all.filter((c) => {
    if (queryNorm) {
      const haystack = [c.id, c.name, c.description ?? '', (c.tags ?? []).join(' ')].join(' ').toLowerCase();
      if (!haystack.includes(queryNorm)) return false;
    }
    if (tag) {
      if (!Array.isArray(c.tags) || !c.tags.includes(tag)) return false;
    }
    if (only === 'no-source') {
      if (c.source_code && c.source_code.trim().length > 0) return false;
    }
    if (only === 'with-source') {
      if (!c.source_code || c.source_code.trim().length === 0) return false;
    }
    return true;
  });

  // Group by category
  const grouped = new Map<string, typeof filtered>();
  for (const c of filtered) {
    const key = c.category ?? 'uncategorised';
    const arr = grouped.get(key) ?? [];
    arr.push(c);
    grouped.set(key, arr);
  }

  const totalWithSource = all.filter((c) => c.source_code && c.source_code.trim().length > 0).length;

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Components</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Central asset library. {filtered.length} of {all.length} shown · {totalWithSource} have source code · 15 categories
        </p>
      </header>

      {/* Filters */}
      <form className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name, ID, description, or tag…"
          className="flex-1 min-w-[260px] rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
        />
        <select
          name="tag"
          defaultValue={tag ?? ''}
          className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:border-cyan-700 focus:outline-none"
        >
          <option value="">— any tag —</option>
          <option value="modern">modern</option>
          <option value="animated">animated</option>
          <option value="interactive">interactive</option>
          <option value="basic">basic</option>
          <option value="accessibility-first">accessibility-first</option>
          <option value="dark-only">dark-only</option>
          <option value="responsive">responsive</option>
        </select>
        <select
          name="only"
          defaultValue={only ?? ''}
          className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:border-cyan-700 focus:outline-none"
        >
          <option value="">— all —</option>
          <option value="with-source">with source code</option>
          <option value="no-source">missing source</option>
        </select>
        <button type="submit" className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm">
          Filter
        </button>
      </form>

      {/* Quick category chips for jump-to */}
      <div className="mb-8 flex flex-wrap gap-1.5 text-xs">
        {CATEGORY_ORDER.map((cat) => {
          const count = grouped.get(cat.id)?.length ?? 0;
          const isEmpty = count === 0;
          return (
            <a
              key={cat.id}
              href={`#cat-${cat.id}`}
              className={`rounded-full border px-2.5 py-1 transition-colors ${
                isEmpty
                  ? 'border-zinc-900 bg-zinc-950 text-zinc-700'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-cyan-700 hover:text-cyan-300'
              }`}
            >
              {cat.label} <span className={isEmpty ? 'text-zinc-700' : 'text-zinc-500'}>({count})</span>
            </a>
          );
        })}
      </div>

      {/* One section per category */}
      <div className="space-y-10">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat.id) ?? [];
          return (
            <section key={cat.id} id={`cat-${cat.id}`}>
              <header className="mb-3 flex items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-200">
                    {cat.label} <span className="text-xs font-normal text-zinc-500">({items.length})</span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">{cat.description}</p>
                </div>
              </header>
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-900 p-6 text-center">
                  <p className="text-xs text-zinc-600">
                    No components in this category yet. See the taxonomy doc in the skill plugin for suggestions.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((c) => (
                    <ComponentCard key={c.id} component={c} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ComponentCard({ component }: { component: typeof schema.master_components.$inferSelect }) {
  const hasSource = Boolean(component.source_code && component.source_code.trim().length > 0);
  return (
    <Link
      href={`/components-browser/${component.id}`}
      className="group block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-cyan-700 hover:bg-zinc-900/80 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {hasSource ? (
            <span className="size-1.5 rounded-full bg-emerald-400" title="Has source code" />
          ) : (
            <span className="size-1.5 rounded-full bg-zinc-700" title="No source yet" />
          )}
          <code className="text-[11px] text-zinc-500 truncate">{component.id}</code>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors">
        {component.name}
      </h3>
      {component.description && (
        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{component.description}</p>
      )}
      {(component.tags ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(component.tags ?? []).slice(0, 4).map((t) => (
            <span key={t} className="text-[10px] uppercase tracking-wider rounded-full bg-zinc-800/60 text-zinc-500 px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
