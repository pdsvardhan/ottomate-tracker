// Stage 2.2 dedicated view: UI Master Plan (theme, palette, fonts, animation).

import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

type Palette = {
  bg?: string; fg?: string; card?: string; border?: string;
  accents?: string[];
  [key: string]: unknown;
};

type Fonts = {
  heading?: string; body?: string; mono?: string;
  [key: string]: unknown;
};

function Swatch({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className="size-8 rounded-md border border-zinc-700 shrink-0"
        style={{ background: value }}
        aria-hidden
      />
      <div>
        <div className="text-zinc-300 font-medium">{label}</div>
        <div className="text-[11px] font-mono text-zinc-500">{value}</div>
      </div>
    </div>
  );
}

function PaletteBlock({ label, palette }: { label: string; palette: Palette | null }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">{label}</h3>
      {palette ? (
        <div className="space-y-3">
          <Swatch label="Background" value={palette.bg} />
          <Swatch label="Foreground" value={palette.fg} />
          <Swatch label="Card" value={palette.card} />
          <Swatch label="Border" value={palette.border} />
          {palette.accents && palette.accents.length > 0 && (
            <div>
              <div className="text-zinc-300 font-medium text-sm mb-2">Accents</div>
              <div className="flex flex-wrap gap-2">
                {palette.accents.map((c, i) => (
                  <span
                    key={`${c}-${i}`}
                    className="inline-block size-6 rounded-md border border-zinc-700"
                    style={{ background: c }}
                    title={c}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">— not set</p>
      )}
    </div>
  );
}

export default async function MasterPlanTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const plan = db.select().from(schema.ui_master_plans)
    .where(eq(schema.ui_master_plans.project_slug, slug)).get();

  if (!plan) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <p className="text-zinc-500">No UI Master Plan locked yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          Run Stage 2.2 in the skill, then save via{' '}
          <code className="px-1.5 py-0.5 rounded bg-zinc-900 text-cyan-300">PUT /api/projects/{slug}/ui-master-plan</code>.
        </p>
      </div>
    );
  }

  const dark = (plan.palette_dark as Palette | null) ?? null;
  const light = (plan.palette_light as Palette | null) ?? null;
  const fonts = (plan.fonts as Fonts | null) ?? null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Animation level</h3>
          <p className="text-2xl font-bold text-cyan-400">{plan.animation_level ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Layout style</h3>
          <p className="text-2xl font-bold text-violet-400">{plan.layout_style ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Aspect ratios</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(plan.aspect_ratios ?? []).length === 0 ? (
              <span className="text-xs text-zinc-600">—</span>
            ) : (
              (plan.aspect_ratios as string[]).map((r) => (
                <span key={r} className="text-[11px] rounded-full bg-zinc-800/80 text-zinc-300 px-2 py-0.5">{r}</span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PaletteBlock label="Dark palette" palette={dark} />
        <PaletteBlock label="Light palette" palette={light} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Typography</h3>
        {fonts ? (
          <dl className="grid gap-3 md:grid-cols-3 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-zinc-500">Heading</dt>
              <dd className="text-zinc-200" style={{ fontFamily: fonts.heading }}>{fonts.heading ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-zinc-500">Body</dt>
              <dd className="text-zinc-200" style={{ fontFamily: fonts.body }}>{fonts.body ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-zinc-500">Mono</dt>
              <dd className="text-zinc-200 font-mono" style={{ fontFamily: fonts.mono }}>{fonts.mono ?? '—'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-zinc-600">— not set</p>
        )}
      </div>
    </div>
  );
}
