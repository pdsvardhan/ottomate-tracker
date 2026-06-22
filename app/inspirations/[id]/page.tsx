// /inspirations/[id] — single visual reference.
// iter-7 #63: the "matched components" section was removed (the field held github
// URLs, not catalog ids; Stage 2 never consumed it).

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

export default async function InspirationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();
  const insp = db.select().from(schema.inspirations).where(eq(schema.inspirations.id, id)).get();
  if (!insp) notFound();

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
      <div className="grid gap-6 md:grid-cols-3">
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
    </div>
  );
}
