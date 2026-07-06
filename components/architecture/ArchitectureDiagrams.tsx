// Architecture view — stacked progressive sections (iter-16).
// Server component: the only client island is MermaidView. Order mirrors the
// documentation layers: Workflow → System → Platform → Decisions, with the
// secondary diagram kinds (data / ux / api / unknown) collapsed under
// "More detail". Decisions render as a concise curated list (adr-017 carve-out:
// curated decisions are showcase content; rails stay hidden).

import { MermaidView } from '@/components/architecture/MermaidView';
import { Badge } from '@/components/ui/Badge';

export interface DiagramEntry {
  source: string;
  caption: string | null;
}

export interface DiagramSection {
  kind: string;
  label: string;
  desc: string;
  legacy: boolean;
  diagrams: DiagramEntry[];
}

export interface DecisionEntry {
  id: string;
  title: string;
  date: string; // YYYY-MM
  tags: string[];
}

// Curated decision categories (iter-17): only decisions carrying a cat: tag
// render, grouped under recruiter-relevant headings. Untagged decisions stay
// captured in the DB but off the showcase. Projects with no cat: tags at all
// fall back to the flat list (back-compat for un-curated projects).
const CATEGORY_META = [
  { tag: 'cat:product', label: 'Product calls', accent: 'text-amber-300/90', border: 'border-amber-400/40' },
  { tag: 'cat:system', label: 'System design', accent: 'text-purple-300/90', border: 'border-purple-400/40' },
  { tag: 'cat:security', label: 'Security & privacy', accent: 'text-emerald-300/90', border: 'border-emerald-400/40' },
  { tag: 'cat:reliability', label: 'Reliability & quality', accent: 'text-rose-300/90', border: 'border-rose-400/40' },
] as const;

function DecisionRow({ d }: { d: DecisionEntry }) {
  const chips = d.tags.filter((t) => !t.startsWith('cat:') && t !== 'curated');
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
      <time className="font-mono text-[length:var(--t-cap)] text-zinc-500 shrink-0">{d.date}</time>
      <span className="text-[length:var(--t-label)] text-zinc-200">{d.title}</span>
      {chips.map((t) => (
        <span key={t} className="rounded-full border border-zinc-700/60 px-2 py-0.5 text-[length:var(--t-cap)] text-zinc-400">
          {t}
        </span>
      ))}
    </li>
  );
}

function DecisionsBody({ decisions }: { decisions: DecisionEntry[] }) {
  if (decisions.length === 0) {
    return <p className="text-xs text-zinc-600">No recorded decisions yet.</p>;
  }
  const groups = CATEGORY_META
    .map((c) => ({ ...c, items: decisions.filter((d) => d.tags.includes(c.tag)) }))
    .filter((c) => c.items.length > 0);
  // A project counts as curated once any decision carries the 'curated' marker
  // (or a cat: tag) — even if nothing made the showcase cut.
  const isCurated = groups.length > 0 || decisions.some((d) => d.tags.includes('curated'));
  if (!isCurated) {
    // Un-curated project: flat list, as before.
    return (
      <ol className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-900/60 [&>li]:px-4 [&>li]:py-1">
        {decisions.map((d) => <DecisionRow key={d.id} d={d} />)}
      </ol>
    );
  }
  const shown = groups.reduce((n, c) => n + c.items.length, 0);
  const hidden = decisions.length - shown;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 space-y-5">
      {groups.map((c) => (
        <div key={c.tag}>
          <p className={`text-[11px] font-medium uppercase tracking-wide mb-1.5 ${c.accent}`}>
            {c.label}
          </p>
          <ol className={`border-l-2 pl-3 ${c.border}`}>
            {c.items.map((d) => <DecisionRow key={d.id} d={d} />)}
          </ol>
        </div>
      ))}
      {shown === 0 && (
        <p className="text-xs text-zinc-600">
          No showcase-level decisions yet — the meaningful calls so far were build logistics.
        </p>
      )}
      {hidden > 0 && (
        <p className="border-t border-zinc-900/60 pt-3 text-[11px] text-zinc-600">
          {hidden} internal {hidden === 1 ? 'decision' : 'decisions'} hidden — captured in the
          build log, not part of the showcase story.
        </p>
      )}
    </div>
  );
}

function SectionHeader({ index, label, desc, legacy }: {
  index: number;
  label: string;
  desc: string;
  legacy?: boolean;
}) {
  return (
    <header className="mb-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-mono text-[length:var(--t-label)] text-cyan-500/80">{String(index).padStart(2, '0')}</span>
        <h2 className="text-[length:var(--t-title)] font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          {label}
        </h2>
        {legacy && (
          <Badge variant="status" tone="open" title="Legacy filesystem-backed diagram.">
            legacy
          </Badge>
        )}
      </div>
      {/* iter-13: caption was 12px zinc-500 — disappeared into the background */}
      <p className="text-[length:var(--t-label)] text-zinc-400 mt-1.5">{desc}</p>
    </header>
  );
}

function DiagramList({ section }: { section: DiagramSection }) {
  return (
    <div className="space-y-4">
      {section.diagrams.map((d, i) => (
        <div key={`${section.kind}-${i}`}>
          {d.caption && <p className="text-[length:var(--t-label)] text-zinc-400 mb-2 font-mono">{d.caption}</p>}
          <MermaidView source={d.source} filename={d.caption ?? `${section.kind}-${i + 1}.mmd`} />
        </div>
      ))}
    </div>
  );
}

export function ArchitectureView({ sections, details, decisions }: {
  sections: DiagramSection[];
  details: DiagramSection[];
  decisions: DecisionEntry[];
}) {
  const detailCount = details.reduce((n, s) => n + s.diagrams.length, 0);
  const decisionsIndex = sections.length + 1;

  // Un-nested (owner feedback 2026-07-06): the pill jump-nav that used to sit
  // here read as a second tab layer under the page's Engineering tab. The layers
  // already render as stacked sections below, so the nav is dropped entirely.
  return (
    <div className="space-y-10">
      {/* Primary layers: Workflow → System → Platform */}
      {sections.map((s, i) => (
        <section key={s.kind} id={s.kind} className="scroll-mt-24">
          <SectionHeader index={i + 1} label={s.label} desc={s.desc} legacy={s.legacy} />
          <DiagramList section={s} />
        </section>
      ))}

      {/* Decisions — why it is built this way */}
      <section id="decisions" className="scroll-mt-24">
        <SectionHeader
          index={decisionsIndex}
          label="Decisions"
          desc="Why it is built this way — the calls that shaped the system."
        />
        <DecisionsBody decisions={decisions} />
      </section>

      {/* Secondary diagrams, collapsed — details beyond the 90-second read */}
      {details.length > 0 && (
        <details className="group rounded-xl border border-zinc-800/60 bg-zinc-900/30">
          <summary className="cursor-pointer select-none px-4 py-3.5 text-[length:var(--t-label)] text-zinc-300 transition-colors hover:text-zinc-100">
            <span className="font-medium">More detail</span>
            <span className="text-zinc-600">
              {' '}— {details.map((s) => s.label).join(' · ')} ({detailCount}{' '}
              {detailCount === 1 ? 'diagram' : 'diagrams'})
            </span>
          </summary>
          <div className="space-y-10 px-4 pb-5 pt-2">
            {details.map((s, i) => (
              <section key={s.kind}>
                <SectionHeader
                  index={decisionsIndex + 1 + i}
                  label={s.label}
                  desc={s.desc}
                  legacy={s.legacy}
                />
                <DiagramList section={s} />
              </section>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
