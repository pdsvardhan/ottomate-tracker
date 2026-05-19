// PipelineProgress — server component widget showing Stage 0-4 progress per project.
// Renders 5 stage rows with done/remaining + status pill.

import { Badge } from '@/components/ui/Badge';

interface StageRow {
  label: string;
  description: string;
  status: 'done' | 'in-progress' | 'pending';
  done: number;
  total: number;
}

export function PipelineProgress({ stages }: { stages: StageRow[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">Pipeline progress</h3>
      <ol className="space-y-3">
        {stages.map((s, idx) => {
          const pct = s.total > 0 ? Math.min(100, Math.round((s.done / s.total) * 100)) : 0;
          const tone =
            s.status === 'done' ? 'shipped'
            : s.status === 'in-progress' ? 'building'
            : 'neutral';
          return (
            <li key={idx} className="flex items-center gap-3">
              <div className="w-20 shrink-0">
                <div className="text-xs font-semibold text-zinc-300">{s.label}</div>
                <div className="text-[10px] text-zinc-500 truncate">{s.description}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2 rounded-full bg-zinc-900/80 overflow-hidden">
                  <div
                    className={
                      'h-full transition-all ' +
                      (s.status === 'done'
                        ? 'bg-emerald-500'
                        : s.status === 'in-progress'
                        ? 'bg-gradient-to-r from-cyan-500 to-violet-500'
                        : 'bg-zinc-800')
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="shrink-0 w-28 text-right text-[11px] font-mono text-zinc-500">
                {s.total > 0 ? `${s.done} / ${s.total}` : '—'}
              </div>
              <Badge variant="status" tone={tone}>
                {s.status}
              </Badge>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
