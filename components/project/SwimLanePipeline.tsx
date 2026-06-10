'use client';

import { useState } from 'react';

interface SubTask {
  label: string;
  done: number;
  total: number;
}

export interface StageNode {
  id: string;
  label: string;
  tagline: string;
  status: 'done' | 'in-progress' | 'pending';
  done: number;
  total: number;
  sub_tasks?: SubTask[];
  note?: string;
}

interface SwimLanePipelineProps {
  stages: StageNode[];
  /** Optional honest one-line headline, e.g. "Stage 3 · 7/13 features shipped". */
  headline?: string;
}

const STATUS_TONE: Record<StageNode['status'], { dot: string; ring: string; bar: string; label: string; pulse: boolean }> = {
  done: {
    dot: 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]',
    ring: 'border-emerald-500/40 bg-emerald-500/5',
    bar: 'bg-emerald-500',
    label: 'text-emerald-300',
    pulse: false,
  },
  'in-progress': {
    dot: 'bg-cyan-400 shadow-[0_0_14px_rgba(0,212,170,0.7)]',
    ring: 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_30px_-10px_rgba(0,212,170,0.45)]',
    bar: 'bg-gradient-to-r from-cyan-500 to-violet-500',
    label: 'text-cyan-200',
    pulse: true,
  },
  pending: {
    dot: 'bg-zinc-700',
    ring: 'border-zinc-800/80 bg-zinc-950/30',
    bar: 'bg-zinc-800',
    label: 'text-zinc-500',
    pulse: false,
  },
};

export function SwimLanePipeline({ stages, headline }: SwimLanePipelineProps) {
  // Default-expand the in-progress stage so users see what's next instantly.
  const inProgressIdx = stages.findIndex((s) => s.status === 'in-progress');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(inProgressIdx >= 0 ? inProgressIdx : null);

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-6">
      <div className="flex items-baseline justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-baseline gap-3 min-w-0">
          <h3 className="text-sm font-semibold bg-gradient-to-r from-cyan-200 via-zinc-100 to-violet-200 bg-clip-text text-transparent">
            Pipeline
          </h3>
          {headline && (
            <span className="text-xs font-medium text-cyan-200/90 truncate" title={headline}>
              {headline}
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-zinc-500 shrink-0">click a stage to drill in</span>
      </div>

      {/* The swim lane — 5 stages connected horizontally */}
      <div className="relative">
        {/* Connector line behind the nodes */}
        <div className="absolute top-[26px] left-[7%] right-[7%] h-px bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" aria-hidden />

        <ol className="relative grid grid-cols-5 gap-3">
          {stages.map((stage, idx) => {
            const tone = STATUS_TONE[stage.status];
            const isActive = idx === expandedIdx;
            const pct = stage.total > 0 ? Math.round((stage.done / stage.total) * 100) : 0;

            return (
              <li key={stage.id}>
                <button
                  type="button"
                  onClick={() => setExpandedIdx(isActive ? null : idx)}
                  className={
                    'group relative w-full rounded-2xl border px-3 py-3 text-left transition-all duration-300 ' +
                    tone.ring + ' ' +
                    (isActive ? 'scale-[1.02] shadow-[0_0_30px_-8px_rgba(0,212,170,0.5)]' : 'hover:scale-[1.01] hover:border-zinc-700/80')
                  }
                >
                  {/* Status dot */}
                  <div className="flex items-center justify-center mb-1.5">
                    <span
                      className={
                        'relative size-3 rounded-full ' + tone.dot +
                        (tone.pulse ? ' before:absolute before:inset-0 before:rounded-full before:bg-cyan-400 before:animate-ping before:opacity-60' : '')
                      }
                    />
                  </div>

                  <div className="text-center">
                    <div className={'text-[10px] font-mono uppercase tracking-wider ' + tone.label}>
                      {stage.label}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 truncate" title={stage.tagline}>
                      {stage.tagline}
                    </div>
                  </div>

                  {/* progress bar */}
                  <div className="mt-2 h-1 rounded-full bg-zinc-900/80 overflow-hidden">
                    <div
                      className={'h-full transition-all duration-500 ' + tone.bar}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-1 text-center text-[10px] font-mono text-zinc-400">
                    {stage.total > 0 ? `${stage.done} / ${stage.total}` : '—'}
                  </div>

                  {/* connector arrow to next stage */}
                  {idx < stages.length - 1 && (
                    <span
                      aria-hidden
                      className="hidden md:block absolute top-[26px] -right-[12px] z-10 text-zinc-600"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M9 4l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Expanded sub-task panel */}
      {expandedIdx !== null && stages[expandedIdx] && (
        <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 backdrop-blur p-5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-cyan-100">{stages[expandedIdx].label}</h4>
              <p className="text-[11px] text-zinc-500">{stages[expandedIdx].tagline}</p>
            </div>
            <button
              type="button"
              onClick={() => setExpandedIdx(null)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              collapse
            </button>
          </div>

          {(stages[expandedIdx].sub_tasks?.length ?? 0) === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              {stages[expandedIdx].note ?? 'No sub-task breakdown for this stage yet.'}
            </p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {stages[expandedIdx].sub_tasks!.map((task, i) => {
                const taskPct = task.total > 0 ? Math.round((task.done / task.total) * 100) : 0;
                const complete = task.done >= task.total && task.total > 0;
                return (
                  <li key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 backdrop-blur px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={'text-xs ' + (complete ? 'text-emerald-300' : 'text-zinc-300')}>{task.label}</span>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {task.done} / {task.total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-zinc-900/80 overflow-hidden">
                      <div
                        className={'h-full transition-all ' + (complete ? 'bg-emerald-500' : 'bg-cyan-500')}
                        style={{ width: `${taskPct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {stages[expandedIdx].note && (stages[expandedIdx].sub_tasks?.length ?? 0) > 0 && (
            <p className="mt-3 pt-3 border-t border-cyan-500/10 text-[11px] text-cyan-200/70 italic">
              {stages[expandedIdx].note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
