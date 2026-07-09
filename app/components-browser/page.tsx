// /components-browser — central asset library, grouped by category.
// Spotlight Glass redesign (iteration #5 item 37). Uses components/ui/ primitives.

import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { getPreviewManifest } from '@/lib/previews';
import { TiltCard } from '@/components/ui/TiltCard';
import { Badge } from '@/components/ui/Badge';
import { COMPONENT_CATEGORIES } from '@/lib/categories';
import { ShaderBackground } from '@/components/project/ShaderBackground';
import { BackButton } from '@/components/ui/BackButton';
import { RATING_LABEL } from '@/components/master-component/RatingControl';
import { CategorySideRail } from '@/components/master-component/CategorySideRail';
import { RatingFilter } from '@/components/master-component/RatingFilter';

const RATING_HUE: Record<string, string> = { A: 'var(--cyan)', B: 'var(--vio)', C: 'var(--amber)' };

// Clean chevron-select styling for the filter toolbar (iter-16b).
const SELECT_CLASSES =
  'appearance-none cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-4 pr-9 ' +
  'text-[length:var(--t-label)] text-zinc-200 transition-colors focus:border-cyan-500/50 focus:outline-none ' +
  // native <option> popups inherit the OS palette, not the select — force a solid
  // dark bg + light text so values aren't dark-on-dark (owner feedback 2026-07-06).
  '[&>option]:bg-[#0b0e17] [&>option]:text-zinc-100';

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

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
  // Cache-bust the poster URLs by the manifest build time (iter-15) — the shot.png
  // path is stable, so re-cropped posters were served stale from browser cache.
  const posterVer = manifest?.built_at ? String(Date.parse(manifest.built_at) || '') : '';

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

  // Derived
  const allTags = Array.from(new Set(all.flatMap((c) => (c.tags ?? []) as string[]))).sort();
  // Only categories that actually have components (iter-16): empty ones (e.g.
  // auth-screens) no longer render a rail entry or a hollow "no components" section.
  const visibleCats = CATEGORY_ORDER.filter((cat) => (grouped.get(cat.id)?.length ?? 0) > 0);

  // Rating distribution over the whole catalog — feeds the glass rating dropdown
  // (iter-15). Counts are the catalog totals per grade, not the current filter.
  const ratingCounts = {
    any: all.length,
    A: all.filter((c) => c.quality_grade === 'A').length,
    B: all.filter((c) => c.quality_grade === 'B').length,
    C: all.filter((c) => c.quality_grade === 'C').length,
  };
  const railCats = visibleCats.map((cat) => ({
    id: cat.id,
    label: cat.label,
    count: grouped.get(cat.id)?.length ?? 0,
  }));

  return (
    <div className="sc">
      <ShaderBackground />
      <div className="sc-veil" aria-hidden />
      <div className="sc-scan" aria-hidden />
      <div className="sc-grain" aria-hidden />
      <div className="sc-wrap px-6 md:px-10 py-10">
        {/* Header (iter-16): dropped the eyebrow + count line, added the shared
            back button to the left of the title. */}
        <div className="mb-7 flex items-center gap-4 flex-wrap">
          <BackButton href="/" label="Home" />
          <h1 className="display pg leading-none">Components</h1>
        </div>

        {/* Search + filter toolbar (iter-16b redesign — the old boxed form
            clashed with the rest of the site). Prominent search with an inline
            icon; rating/tag as clean chevron-selects; subtle submit. */}
        <form className="mb-9 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[280px]">
            <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-zinc-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
            </span>
            <input
              type="search"
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search components by name, tag, or description…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-[length:var(--t-body)] text-zinc-100 placeholder:text-zinc-500 transition-colors focus:border-cyan-500/50 focus:bg-white/[0.05] focus:outline-none"
            />
          </div>
          <RatingFilter value={quality ?? ''} counts={ratingCounts} />
          <div className="relative">
            <select name="tag" defaultValue={tag ?? ''} className={SELECT_CLASSES}>
              <option value="">Any tag</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <SelectChevron />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-[length:var(--t-label)] font-semibold text-cyan-100 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/20"
          >
            Search
          </button>
        </form>

        {/* iter-15 category "side rail" (winner 8a): a sticky, scrollspy-
            highlighted category index beside the grid — replaces the old
            wrapping chip row. Rail is desktop-only; on mobile the sections just
            stack and the rail is hidden. */}
        <div className="cat-grid">
          <CategorySideRail cats={railCats} />

          {/* Category sections (iter-16: only non-empty categories render) */}
          <div className="min-w-0 space-y-12">
          {visibleCats.map((cat) => {
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
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
                  {items.map((c) => (
                    <ComponentCard key={c.id} component={c} hasShot={shotIds.has(c.id)} posterVer={posterVer} />
                  ))}
                </div>
              </section>
            );
          })}
          </div>
        </div>

      </div>
    </div>
  );
}

function ComponentCard({ component, hasShot, posterVer }: { component: typeof schema.master_components.$inferSelect; hasShot?: boolean; posterVer?: string }) {
  const hasSource = Boolean(component.source_paths?.[0] && component.source_paths[0].trim().length > 0);
  const quality = (component.quality_grade ?? '') as QualityGrade | '';

  return (
    <TiltCard href={`/components-browser/${component.id}`}>
      {/* Static poster thumbnail (iter-15): posters are now CROPPED tight to the
          content by render.mjs, so object-contain shows the element clearly. */}
      <div className="mb-3 -mt-1 flex items-center justify-center overflow-hidden rounded-lg border border-zinc-800/80 bg-[#0b0b12] h-48 p-3">
        {hasShot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/previews/${component.id}/shot.png${posterVer ? `?v=${posterVer}` : ''}`}
            alt={`${component.name} preview`}
            loading="lazy"
            // Fit-within + centered: the tight-cropped poster shows whole (never
            // clipped), scaled down only if bigger than the card.
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
    </TiltCard>
  );
}
