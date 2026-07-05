// /inspirations — gallery of visual references (Dribbble + Figma community + …).
// iter-7 #63: trimmed to a clean visual board. The matched-component machinery was
// dropped (it held github URLs, not catalog ids, and Stage 2 never routed through it).

import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackButton } from '@/components/ui/BackButton';
import { ShaderBackground } from '@/components/project/ShaderBackground';

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

  return (
    <div className="sc">
      <ShaderBackground />
      <div className="sc-veil" aria-hidden />
      <div className="sc-scan" aria-hidden />
      <div className="sc-grain" aria-hidden />
      <div className="sc-wrap px-6 md:px-10 py-10">
        {/* Header (iter-16): dropped the eyebrow, count line, and the whole
            filter form; added the shared back button left of the title. */}
        <div className="mb-8 flex items-center gap-4 flex-wrap">
          <BackButton href="/" label="Home" />
          <h1 className="display pg leading-none">Inspirations</h1>
        </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No inspirations yet"
          body="Add a new reference via POST /api/inspirations."
        />
      ) : (
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((insp) => (
            <InspirationCard key={insp.id} insp={insp} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function InspirationCard({ insp }: { insp: typeof schema.inspirations.$inferSelect }) {
  return (
    <SpotlightCard href={`/inspirations/${insp.id}`}>
      {/* Thumbnail area (iter-14: was a short h-32 strip — 'cant see shit'. Now a
          proper 16:10 frame so the reference reads at a glance) */}
      <div className="mb-3 -mx-4 -mt-4 aspect-[16/10] rounded-t-2xl overflow-hidden bg-gradient-to-br from-violet-500/10 via-zinc-900/40 to-cyan-500/10 border-b border-zinc-800/60 relative">
        {insp.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={insp.thumbnail_url}
            alt={insp.title}
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[length:var(--t-cap)] uppercase tracking-wider text-zinc-600">
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
