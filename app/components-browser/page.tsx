// /components-browser — central asset library, grouped by category.
// Spotlight Glass redesign (iteration #5 item 37). Uses components/ui/ primitives.

import { asc } from 'drizzle-orm';
import Link from 'next/link';
import { getDb, schema } from '@/lib/db/client';
import { getPreviewManifest } from '@/lib/previews';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Badge } from '@/components/ui/Badge';
import {
  FilterBar,
  FILTER_CONTROL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
} from '@/components/ui/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddComponentModal } from '@/components/master-component/AddComponentModal';
import { COMPONENT_CATEGORIES } from '@/lib/categories';
import { ShaderBackground } from '@/components/project/ShaderBackground';
import { RATING_LABEL } from '@/components/master-component/RatingControl';

const RATING_HUE: Record<string, string> = { A: 'var(--cyan)', B: 'var(--vio)', C: 'var(--amber)' };

export const dynamic = 'force-dynamic';

// Single source of truth: lib/categories.ts (taxonomy-refine 2026-06-29).
const CATEGORY_ORDER: Array<{ id: string; label: string; description: string }> = [
  ...COMPONENT_CATEGORIES,
];

type QualityGrade = 'A' | 'B' | 'C';

export default async function ComponentsBrowser({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; only?: string; lib?: string; quality?: string }>;
}) {
  const { q, tag, only, lib, quality } = await searchParams;
  const db = await getDb();
  const all = db.select().from(schema.master_components).orderBy(asc(schema.master_components.id)).all();

  // Inline-preview screenshots (iter-77): which components have a poster thumbnail.
  const manifest = await getPreviewManifest();
  const shotIds = new Set(
    Object.entries(manifest?.components ?? {}).filter(([, v]) => v.shot).map(([k]) => k),
  );

  // Filter
  const queryNorm = q?.toLowerCase().trim();
  const filtered = all.filter((c) => {
    if (queryNorm) {
      const haystack = [c.id, c.name, c.description ?? '', (c.tags ?? []).join(' '), c.library ?? '']
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(queryNorm)) return false;
    }
    if (tag && !((c.tags ?? []) as string[]).includes(tag)) return false;
    if (lib && c.library !== lib) return false;
    if (quality && c.quality_grade !== quality) return false;
    if (only === 'no-source' && c.source_paths?.[0] && c.source_paths[0].trim().length > 0) return false;
    if (only === 'with-source' && !(c.source_paths?.[0] && c.source_paths[0].trim().length > 0)) return false;
    return true;
  });

  // Group
  const grouped = new Map<string, typeof filtered>();
  for (const c of filtered) {
    const key = c.category ?? 'uncategorised';
    const arr = grouped.get(key) ?? [];
    arr.push(c);
    grouped.set(key, arr);
  }

  // Derived stats
  const totalWithSource = all.filter((c) => c.source_paths?.[0] && c.source_paths[0].trim().length > 0).length;
  const libraries = Array.from(new Set(all.map((c) => c.library).filter(Boolean))).sort() as string[];
  const allTags = Array.from(new Set(all.flatMap((c) => (c.tags ?? []) as string[]))).sort();

  return (
    <div className="sc">
      <ShaderBackground />
      <div className="sc-veil" aria-hidden />
      <div className="sc-scan" aria-hidden />
      <div className="sc-grain" aria-hidden />
      <div className="sc-wrap px-6 md:px-10 py-10">
        {/* Cyber-Den header (iter-14: was the Spotlight-Glass PageHeader) */}
        <div className="mb-7 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="eyebrow" style={{ color: 'var(--cyan)' }}>Central asset library</div>
            <h1 className="display pg">Components</h1>
            <p className="mt-3 text-[length:var(--t-lead)]" style={{ color: 'var(--ink)', opacity: 0.82 }}>
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>{filtered.length}</span> of {all.length} shown ·{' '}
              {totalWithSource} with source · {CATEGORY_ORDER.length} categories
            </p>
          </div>
          <Link href="/components-browser?action=new" className={PRIMARY_BUTTON_CLASSES}>
            + Add component
          </Link>
        </div>

        <FilterBar>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name, ID, description, or tag…"
            className={FILTER_CONTROL_CLASSES + ' flex-1 min-w-[260px]'}
          />
          <select name="quality" defaultValue={quality ?? ''} className={FILTER_CONTROL_CLASSES}>
            <option value="">— any rating —</option>
            <option value="A">Standout</option>
            <option value="B">Solid</option>
            <option value="C">Fine</option>
          </select>
          <select name="tag" defaultValue={tag ?? ''} className={FILTER_CONTROL_CLASSES}>
            <option value="">— any tag —</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button type="submit" className={PRIMARY_BUTTON_CLASSES}>
            Filter
          </button>
        </FilterBar>

        {/* Category quick-jump chips */}
        <div className="mb-10 flex flex-wrap gap-1.5">
          {CATEGORY_ORDER.map((cat) => {
            const count = grouped.get(cat.id)?.length ?? 0;
            const isEmpty = count === 0;
            return (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className={
                  'rounded-full border px-3.5 py-1.5 text-[length:var(--t-cap)] backdrop-blur-sm transition-all ' +
                  (isEmpty
                    ? 'border-zinc-900/80 bg-zinc-950/40 text-zinc-700 cursor-default'
                    : 'border-zinc-700/60 bg-zinc-900/40 text-zinc-300 hover:border-cyan-600/60 hover:bg-zinc-800/60 hover:text-cyan-200 hover:shadow-[0_0_15px_-5px_rgba(0,212,170,0.4)]')
                }
              >
                {cat.label} <span className={'ml-0.5 ' + (isEmpty ? 'text-zinc-700' : 'text-zinc-500')}>{count}</span>
              </a>
            );
          })}
        </div>

        {/* Category sections */}
        <div className="space-y-12">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped.get(cat.id) ?? [];
            return (
              <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-24">
                <header className="mb-4 flex items-baseline justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-3">
                      <h2 className="h2" style={{ fontSize: 'var(--t-title)' }}>{cat.label}</h2>
                      <Badge variant="count">{items.length}</Badge>
                    </div>
                    <p className="text-[length:var(--t-label)] text-zinc-400 mt-1">{cat.description}</p>
                  </div>
                </header>
                {items.length === 0 ? (
                  <EmptyState
                    title="No components in this category yet"
                    body="See the taxonomy doc in the skill plugin for suggestions, or use + Add component to seed one."
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((c) => (
                      <ComponentCard key={c.id} component={c} hasShot={shotIds.has(c.id)} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* CRUD modals — mounted once; toggled by ?action= URL param */}
        <AddComponentModal
          categories={CATEGORY_ORDER.map((c) => c.id)}
          libraries={libraries}
        />
      </div>
    </div>
  );
}

function ComponentCard({ component, hasShot }: { component: typeof schema.master_components.$inferSelect; hasShot?: boolean }) {
  const hasSource = Boolean(component.source_paths?.[0] && component.source_paths[0].trim().length > 0);
  const quality = (component.quality_grade ?? '') as QualityGrade | '';

  return (
    <SpotlightCard href={`/components-browser/${component.id}`}>
      {/* Static poster thumbnail (iter-15): posters are now CROPPED tight to the
          content by render.mjs, so object-contain shows the element clearly. */}
      <div className="mb-3 -mt-1 grid place-items-center overflow-hidden rounded-lg border border-zinc-800/80 bg-[#0b0b12] h-48 p-2">
        {hasShot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/previews/${component.id}/shot.png`}
            alt={`${component.name} preview`}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[length:var(--t-cap)] uppercase tracking-wider text-zinc-700">
            no preview
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 mb-3">
        <code className="text-[12.5px] font-mono text-zinc-500 truncate">{component.id}</code>
        <div className="flex items-center gap-1.5 shrink-0">
          {quality ? (
            <span
              className="mono text-[10px] font-semibold rounded px-1.5 py-0.5"
              style={{ color: RATING_HUE[quality], border: `1px solid color-mix(in srgb, ${RATING_HUE[quality]} 40%, transparent)`, background: `color-mix(in srgb, ${RATING_HUE[quality]} 12%, transparent)` }}
              title={`Rated ${RATING_LABEL[quality]}`}
            >
              {RATING_LABEL[quality]}
            </span>
          ) : null}
          {hasSource ? (
            <span
              className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
              title="Has source code"
            />
          ) : (
            <span className="size-1.5 rounded-full bg-zinc-700" title="No source yet" />
          )}
        </div>
      </div>

      <h3 className="text-[17px] font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors">
        {component.name}
      </h3>

      {component.description ? (
        <p className="mt-1.5 text-[13.5px] text-zinc-400 line-clamp-2 leading-relaxed">{component.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {component.library ? <Badge variant="library">{component.library}</Badge> : null}
        {((component.tags ?? []) as string[]).slice(0, 4).map((t) => (
          <Badge key={t} variant="tag">
            {t}
          </Badge>
        ))}
      </div>
    </SpotlightCard>
  );
}
