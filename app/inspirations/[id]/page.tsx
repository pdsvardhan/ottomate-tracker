// /inspirations/[id] — single inspiration with its matched master_components.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

const CONFIDENCE_TONE: Record<string, 'shipped' | 'open' | 'blocked' | 'neutral'> = {
  high: 'shipped',
  medium: 'open',
  low: 'blocked',
  unmatched: 'neutral',
};

export default async function InspirationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const insp = db.select().from(schema.inspirations).where(eq(schema.inspirations.id, id)).get();
  if (!insp) notFound();

  const matchedIds = (insp.matched_master_component_ids ?? []) as string[];
  const matched = matchedIds.length > 0
    ? db.select().from(schema.master_components)
        .where(inArray(schema.master_components.id, matchedIds)).all()
    : [];

  const tone = insp.match_confidence ? CONFIDENCE_TONE[insp.match_confidence] : 'neutral';

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto">
      <Link href="/inspirations" className="text-xs text-zinc-500 hover:text-cyan-300 transition-colors">
        ← all inspirations
      </Link>

      <div className="mt-3">
        <PageHeader
          title={insp.title}
          tagline={insp.id}
          meta={
            <span className="inline-flex items-center gap-2">
              <Badge variant="library">{insp.source_type}</Badge>
              {insp.domain ? <Badge variant="tag">{insp.domain}</Badge> : null}
              {insp.match_confidence ? (
                <Badge variant="status" tone={tone}>
                  match: {insp.match_confidence}
                </Badge>
              ) : null}
            </span>
          }
          actions={
            <a
              href={insp.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-300 hover:text-cyan-100 transition-colors"
            >
              Open source →
            </a>
          }
        />
      </div>

      {/* Thumbnail panel */}
      <div className="mb-8 rounded-2xl overflow-hidden border border-zinc-800/60 bg-gradient-to-br from-violet-500/10 via-zinc-900/30 to-cyan-500/10 backdrop-blur-xl">
        {insp.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={insp.thumbnail_url}
            alt={insp.title}
            className="w-full max-h-[420px] object-cover"
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-xs uppercase tracking-wider text-zinc-600">
            {insp.source_type} · thumbnail not stored locally
          </div>
        )}
      </div>

      {/* Notes + style tags */}
      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <section className="md:col-span-2 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-2">Notes</h3>
          {insp.notes ? (
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{insp.notes}</p>
          ) : (
            <p className="text-xs text-zinc-600">— no notes yet —</p>
          )}
        </section>
        <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">Style tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {((insp.style_tags ?? []) as string[]).length === 0 ? (
              <span className="text-xs text-zinc-600">— none —</span>
            ) : (
              ((insp.style_tags ?? []) as string[]).map((t) => (
                <Badge key={t} variant="tag">
                  {t}
                </Badge>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Matched components */}
      <section>
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Matched components
          </h2>
          <Badge variant="count">{matched.length}</Badge>
        </header>

        {matched.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-900/60 bg-zinc-950/30 backdrop-blur p-6 text-center">
            <p className="text-xs text-zinc-500">
              No master_components have been mapped to this inspiration yet. Hand-curate via SQL or
              wait for the matching pipeline.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matched.map((c) => (
              <SpotlightCard key={c.id} href={`/components-browser/${c.id}`}>
                <code className="text-[11px] font-mono text-zinc-500 truncate block mb-2">{c.id}</code>
                <h4 className="text-base font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors">
                  {c.name}
                </h4>
                {c.description ? (
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">{c.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {c.library ? <Badge variant="library">{c.library}</Badge> : null}
                  {c.quality_grade ? <Badge variant="quality" grade={c.quality_grade as 'A' | 'B' | 'C'} /> : null}
                </div>
              </SpotlightCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
