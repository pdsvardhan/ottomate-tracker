// /inspirations — gallery of visual references (Dribbble + Figma community + ...).
// Iteration #5 item 42.

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
  match_confidence?: string;
  tag?: string;
}

const CONFIDENCE_TONE: Record<string, 'shipped' | 'open' | 'blocked' | 'neutral'> = {
  high: 'shipped',
  medium: 'open',
  low: 'blocked',
  unmatched: 'neutral',
};

export default async function InspirationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const { q, domain, source_type, match_confidence, tag } = await searchParams;
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
    if (match_confidence && i.match_confidence !== match_confidence) return false;
    if (tag && !((i.style_tags ?? []) as string[]).includes(tag)) return false;
    return true;
  });

  const domains = Array.from(new Set(all.map((i) => i.domain).filter(Boolean))).sort() as string[];
  const sourceTypes = Array.from(new Set(all.map((i) => i.source_type))).sort();
  const allTags = Array.from(new Set(all.flatMap((i) => (i.style_tags ?? []) as string[]))).sort();

  const matchedCounts = {
    high: all.filter((i) => i.match_confidence === 'high').length,
    medium: all.filter((i) => i.match_confidence === 'medium').length,
    low: all.filter((i) => i.match_confidence === 'low').length,
    unmatched: all.filter((i) => i.match_confidence === 'unmatched' || !i.match_confidence).length,
  };

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      <PageHeader
        title="Inspirations"
        tagline="visual references that shape Stage 2.2 UI master plans"
        meta={
          <>
            <span className="text-zinc-200 font-medium">{filtered.length}</span> of {all.length} shown ·{' '}
            {matchedCounts.high} high-confidence matches · {sourceTypes.length} sources · {domains.length} domains
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
        <select name="match_confidence" defaultValue={match_confidence ?? ''} className={FILTER_CONTROL_CLASSES}>
          <option value="">— any confidence —</option>
          <option value="high">high only</option>
          <option value="medium">medium+</option>
          <option value="low">low</option>
          <option value="unmatched">unmatched</option>
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
          body="Loosen the filters above, or seed new entries via SQL until the Add UI lands."
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
  const matchedCount = ((insp.matched_master_component_ids ?? []) as string[]).length;
  const tone = insp.match_confidence ? CONFIDENCE_TONE[insp.match_confidence] : 'neutral';

  return (
    <SpotlightCard href={`/inspirations/${insp.id}`}>
      {/* Thumbnail placeholder area */}
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

      <div className="flex items-start justify-between gap-2 mb-2">
        <code className="text-[11px] font-mono text-zinc-500 truncate">{insp.id}</code>
        {insp.match_confidence ? (
          <Badge variant="status" tone={tone} title={`Match confidence: ${insp.match_confidence}`}>
            {insp.match_confidence}
          </Badge>
        ) : null}
      </div>

      <h3 className="text-base font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors line-clamp-2">
        {insp.title}
      </h3>

      {insp.notes ? (
        <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">{insp.notes}</p>
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

      <div className="mt-3 text-[10px] uppercase tracking-wider text-zinc-500">
        {matchedCount > 0 ? `${matchedCount} matched components` : 'no matches yet'}
      </div>
    </SpotlightCard>
  );
}
