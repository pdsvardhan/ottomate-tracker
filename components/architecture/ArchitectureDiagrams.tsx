// Client-side tabbed diagram switcher for the Architecture tab.
// Presents the available diagram kinds as named buttons and renders the selected
// kind's diagram(s) in the zoom/pan/fullscreen MermaidView. The bird's-eye view
// (topology, else process) is selected by default.

'use client';

import { useState } from 'react';
import { MermaidView } from '@/components/architecture/MermaidView';
import { Badge } from '@/components/ui/Badge';

export interface DiagramGroup {
  kind: string;
  label: string;
  desc: string;
  legacy: boolean;
  diagrams: { source: string; caption: string | null }[];
}

// Preferred default: topology (the bird's-eye system view) then process.
const DEFAULT_KIND_PRIORITY = ['topology', 'process'];

export function ArchitectureDiagrams({ groups }: { groups: DiagramGroup[] }) {
  const defaultKind =
    DEFAULT_KIND_PRIORITY.find((k) => groups.some((g) => g.kind === k)) ?? groups[0]?.kind;
  const [active, setActive] = useState<string>(defaultKind);

  const activeGroup = groups.find((g) => g.kind === active) ?? groups[0];
  if (!activeGroup) return null;

  return (
    <div className="space-y-5">
      {/* Named diagram tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((g) => {
          const isActive = g.kind === active;
          return (
            <button
              key={g.kind}
              type="button"
              onClick={() => setActive(g.kind)}
              className={
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition-all ' +
                (isActive
                  ? 'border-cyan-700/60 bg-cyan-500/10 text-cyan-200 shadow-[0_0_15px_-5px_rgba(0,212,170,0.4)]'
                  : 'border-zinc-800/60 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700/80 hover:text-zinc-200')
              }
            >
              <span className="font-medium">{g.label}</span>
              <span className={'font-mono text-[10px] ' + (isActive ? 'text-cyan-300/70' : 'text-zinc-600')}>
                {g.diagrams.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active kind */}
      <section>
        <header className="mb-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              {activeGroup.label}
            </h2>
            {activeGroup.legacy && (
              <Badge variant="status" tone="open" title="Legacy filesystem-backed diagram.">
                legacy
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1">{activeGroup.desc}</p>
        </header>

        <div className="space-y-4">
          {activeGroup.diagrams.map((d, i) => (
            <div key={`${activeGroup.kind}-${i}`}>
              {d.caption && <p className="text-xs text-zinc-500 mb-2 font-mono">{d.caption}</p>}
              <MermaidView source={d.source} filename={d.caption ?? `${activeGroup.kind}-${i + 1}.mmd`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
