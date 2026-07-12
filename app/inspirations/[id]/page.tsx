// /inspirations/[id] — single visual reference.
// iter-16 (owner feedback 2026-07-05): wrapped in the shared Cyber-Den shell so
// the page matches every other one, made it full-width/responsive, swapped the
// tiny back link for the shared BackButton, and dropped the raw id + domain tag.

import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { Badge } from '@/components/ui/Badge';
import { ShaderBackground } from '@/components/project/ShaderBackground';
import { BackButton } from '@/components/ui/BackButton';

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
    <div className="sc">
      <ShaderBackground />
      <div className="sc-veil" aria-hidden />
      <div className="sc-scan" aria-hidden />
      <div className="sc-grain" aria-hidden />
      <div className="sc-wrap px-6 md:px-10 py-10">
        {/* Header — shared back button + title; raw id + domain tag removed */}
        <header className="mb-8 flex items-center gap-4 flex-wrap">
          <BackButton href="/inspirations" label="All inspirations" />
          <h1 className="display pg leading-none">{insp.title}</h1>
          <div className="flex items-center gap-3 md:ml-auto">
            <Badge variant="library">{insp.source_type}</Badge>
            {insp.source_url && (
              <a
                href={insp.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mono text-[length:var(--t-label)]"
                style={{ color: 'var(--cyan)' }}
              >
                Open source ↗
              </a>
            )}
          </div>
        </header>

        {/* Thumbnail panel — iter-65 #525 (owner: 'show it in 16:9, half the image
            is cutoff'): fixed 16:9 frame + object-contain so the full reference is
            always visible, letterboxed on the panel gradient instead of cropped. */}
        <div className="mb-8 rounded-2xl overflow-hidden border border-[var(--line)] bg-gradient-to-br from-violet-500/10 via-zinc-900/30 to-cyan-500/10 backdrop-blur-xl">
          {insp.thumbnail_url ? (
            <div className="aspect-video w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={insp.thumbnail_url}
                alt={insp.title}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-[length:var(--t-cap)] uppercase tracking-wider text-zinc-600">
              {insp.source_type} · thumbnail not stored locally
            </div>
          )}
        </div>

        {/* Notes + style tags */}
        <div className="grid gap-6 md:grid-cols-3">
          <section className="md:col-span-2 card flat">
            <div className="mono text-[length:var(--t-cap)] uppercase tracking-wider mb-2.5" style={{ color: 'var(--dim)' }}>Notes</div>
            {insp.notes ? (
              <p className="text-[length:var(--t-body)] text-zinc-300 leading-relaxed whitespace-pre-line">{insp.notes}</p>
            ) : (
              <p className="text-[length:var(--t-cap)] text-zinc-600">— no notes yet —</p>
            )}
          </section>
          <section className="card flat">
            <div className="mono text-[length:var(--t-cap)] uppercase tracking-wider mb-3" style={{ color: 'var(--dim)' }}>Style tags</div>
            <div className="flex flex-wrap gap-1.5">
              {((insp.style_tags ?? []) as string[]).length === 0 ? (
                <span className="text-[length:var(--t-cap)] text-zinc-600">— none —</span>
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
    </div>
  );
}
