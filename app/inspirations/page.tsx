// /inspirations — gallery of visual references (Dribbble + Figma community + …).
// iter-7 #63: trimmed to a clean visual board. The matched-component machinery was
// dropped (it held github URLs, not catalog ids, and Stage 2 never routed through it).

import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar, FILTER_CONTROL_CLASSES, PRIMARY_BUTTON_CLASSES } from '@/components/ui/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

interface SearchParamsShape {
  q?: string;
  domain?: string;
  source_type?: string;
  tag?: string;
}

export default async function InspirationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const { q, domain, source_type, tag } = await searchParams;
  const db = await getDb();
  const all = db.select().from(schema.inspirations).orderBy(asc(schema.inspirations.id)).all();

  const queryNorm = q?.toLowerCase().trim();
  const filtered = all.filter((i) => {
    if (queryNorm) {
      const haystack = [i.id, i.title, i.notes ?? '', ((i.style_tags ?? []) as string[]).join(' '), i.domain ?? '']
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(queryNorm)) return false;
    }
    if (domain && i.domain !== domain) return false;
    if (source_type && i.source_type !== source_type) return false;
    if (tag && !((i.style_tags ?? []) as string[]).includes(tag)) return false;
    return true;
  });

  const domains = Array.from(new Set(all.map((i) => i.domain).filter(Boolean))).sort() as string[];
  const sourceTypes = Array.from(new Set(all.map((i) => i.source_type))).sort();
  const allTags = Array.from(new Set(all.flatMap((i) => (i.style_tags ?? []) as string[]))).sort();
  const withThumb = all.filter((i) => (i.thumbnail_url ?? '').trim().length > 0).length;

  return (
    <div className="px-6 md:px-10 py-8">
      <PageHeader
        title="Inspirations"
        tagline="visual references that shape Stage 2.2 UI master plans"
        meta={
          <>
            <span className="text-zinc-200 font-medium">{filtered.length}</span> of {all.length} shown ·{' '}
            {withThumb} with thumbnail · {sourceTypes.length} sources · {domains.length} domains
          </>
        }
      />

      <FilterBar>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by title, tag, notes…"
          className={FILTER_CONTROL_CLASSES + ' flex-1 min-w-[260px]'}
        />
        <select name="domain" defaultValue={domain ?? ''} className={FILTER_CONTROL_CLASSES}>
          <option value="">— any domain —</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select name="source_type" defaultValue={source_type ?? ''} className={FILTER_CONTROL_CLASSES}>
          <option value="">— any source —</option>
          {sourceTypes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
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

      {filtered.length === 0 ? (
        <EmptyState
          title="No inspirations match"
          body="Loosen the filters above, or add a new reference via POST /api/inspirations."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((insp) => (
            <InspirationCard key={insp.id} insp={insp} />
          ))}
        </div>
      )}
    </div>
  );
}

function InspirationCard({ insp }: { insp: typeof schema.inspirations.$inferSelect }) {
  return (
    <SpotlightCard href={`/inspirations/${insp.id}`}>
      {/* Thumbnail area */}
      <div className="mb-3 -mx-4 -mt-4 h-32 rounded-t-2xl overflow-hidden bg-gradient-to-br from-violet-500/10 via-zinc-900/40 to-cyan-500/10 border-b border-zinc-800/60 relative">
        {insp.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={insp.thumbnail_url}
            alt={insp.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-wider text-zinc-600">
            {insp.source_type}
          </div>
        )}
      </div>

      <code className="text-[12.5px] font-mono text-zinc-500 truncate block mb-2">{insp.id}</code>

      <h3 className="text-[17px] font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors line-clamp-2">
        {insp.title}
      </h3>

      {insp.notes ? (
        <p className="mt-1.5 text-[13.5px] text-zinc-400 line-clamp-2 leading-relaxed">{insp.notes}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="library">{insp.source_type}</Badge>
        {insp.domain ? <Badge variant="tag">{insp.domain}</Badge> : null}
        {((insp.style_tags ?? []) as string[]).slice(0, 3).map((t) => (
          <Badge key={t} variant="tag">
            {t}
          </Badge>
        ))}
      </div>
    </SpotlightCard>
  );
}
