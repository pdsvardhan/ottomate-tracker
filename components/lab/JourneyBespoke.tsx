// Bake-off Style C — bespoke annotated journey. Numbered left→right stages, each
// an actor-coloured card (action as the title, result as the caption), joined by
// arrow connectors. Pure presentational, content-driven from flow_steps
// (actor · action · result) — no diagram engine, fully on-brand and legible.

type Step = { sort_order: number; actor: 'user' | 'system'; action: string; result: string };

const ACTOR: Record<Step['actor'], { hue: string; label: string }> = {
  user: { hue: '#a855f7', label: 'User' },
  system: { hue: '#22d3ee', label: 'System' },
};

export function JourneyBespoke({ steps }: { steps: Step[] }) {
  const ordered = [...steps].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-5 overflow-x-auto">
      <ol className="flex items-stretch gap-0 min-w-max">
        {ordered.map((s, i) => {
          const a = ACTOR[s.actor];
          return (
            <li key={s.sort_order} className="flex items-stretch">
              <div
                className="relative flex w-[240px] flex-col rounded-xl border p-4"
                style={{
                  borderColor: `color-mix(in srgb, ${a.hue} 40%, transparent)`,
                  background: `color-mix(in srgb, ${a.hue} 7%, #0f1220)`,
                }}
              >
                <span className="absolute left-0 top-0 h-full w-[3px] rounded-l-xl" style={{ background: a.hue }} />
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="grid size-6 place-items-center rounded-full text-[11px] font-bold"
                    style={{ background: a.hue, color: '#0a0a0f' }}
                  >
                    {i + 1}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: a.hue }}>
                    {a.label}
                  </span>
                </div>
                <div className="text-[13.5px] font-semibold leading-snug text-zinc-100">{s.action}</div>
                <div className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-zinc-400">
                  <span aria-hidden style={{ color: a.hue }}>↳</span>
                  <span>{s.result}</span>
                </div>
              </div>
              {i < ordered.length - 1 && (
                <div className="flex items-center px-1.5" aria-hidden>
                  <span className="text-lg" style={{ color: '#52525b' }}>→</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
