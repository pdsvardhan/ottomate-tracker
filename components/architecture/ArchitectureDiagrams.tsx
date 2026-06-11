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

function SectionHeader({ index, label, desc, legacy }: {
  index: number;
  label: string;
  desc: string;
  legacy?: boolean;
}) {
  return (
    <header className="mb-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-mono text-xs text-cyan-500/70">{String(index).padStart(2, '0')}</span>
        <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          {label}
        </h2>
        {legacy && (
          <Badge variant="status" tone="open" title="Legacy filesystem-backed diagram.">
            legacy
          </Badge>
        )}
      </div>
      <p className="text-xs text-zinc-500 mt-1">{desc}</p>
    </header>
  );
}

function DiagramList({ section }: { section: DiagramSection }) {
  return (
    <div className="space-y-4">
      {section.diagrams.map((d, i) => (
        <div key={`${section.kind}-${i}`}>
          {d.caption && <p className="text-xs text-zinc-500 mb-2 font-mono">{d.caption}</p>}
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
  const anchors = [
    ...sections.map((s) => ({ id: s.kind, label: s.label })),
    { id: 'decisions', label: 'Decisions' },
  ];
  const detailCount = details.reduce((n, s) => n + s.diagrams.length, 0);
  const decisionsIndex = sections.length + 1;

  return (
    <div className="space-y-10">
      {/* In-page layer nav */}
      <nav className="flex flex-wrap items-center gap-2" aria-label="Architecture layers">
        {anchors.map((a, i) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800/60 bg-zinc-900/40 px-3.5 py-1.5 text-xs text-zinc-400 transition-all hover:border-cyan-700/60 hover:text-cyan-200"
          >
            <span className="font-mono text-[10px] text-zinc-600">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-medium">{a.label}</span>
          </a>
        ))}
      </nav>

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
        {decisions.length === 0 ? (
          <p className="text-xs text-zinc-600">No recorded decisions yet.</p>
        ) : (
          <ol className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-900/60">
            {decisions.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
                <time className="font-mono text-[10px] text-zinc-600 shrink-0">{d.date}</time>
                <span className="text-sm text-zinc-300">{d.title}</span>
                {d.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-500"
                  >
                    {t}
                  </span>
                ))}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Secondary diagrams, collapsed — details beyond the 90-second read */}
      {details.length > 0 && (
        <details className="group rounded-xl border border-zinc-800/60 bg-zinc-900/30">
          <summary className="cursor-pointer select-none px-4 py-3 text-xs text-zinc-400 transition-colors hover:text-zinc-200">
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
