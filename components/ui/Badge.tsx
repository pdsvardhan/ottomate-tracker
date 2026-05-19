import type { ReactNode } from 'react';

type BadgeVariant = 'library' | 'quality' | 'tag' | 'status' | 'count';
type StatusTone = 'building' | 'shipped' | 'ideating' | 'maintained' | 'deprecated' | 'blocked' | 'open' | 'done' | 'neutral';
type QualityGrade = 'A' | 'B' | 'C';

interface BadgeProps {
  variant: BadgeVariant;
  tone?: StatusTone;
  grade?: QualityGrade;
  children?: ReactNode;
  className?: string;
  title?: string;
}

const TONE_STYLES: Record<StatusTone, string> = {
  building:    'bg-cyan-500/10 border-cyan-500/30 text-cyan-200',
  shipped:     'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
  ideating:    'bg-violet-500/10 border-violet-500/30 text-violet-200',
  maintained:  'bg-zinc-500/10 border-zinc-500/30 text-zinc-300',
  deprecated:  'bg-zinc-700/30 border-zinc-700 text-zinc-500',
  blocked:     'bg-rose-500/10 border-rose-500/30 text-rose-200',
  open:        'bg-amber-500/10 border-amber-500/30 text-amber-200',
  done:        'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
  neutral:     'bg-zinc-900/60 border-zinc-800 text-zinc-300',
};

const QUALITY_DOT: Record<QualityGrade, string> = {
  A: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
  B: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  C: 'bg-zinc-500',
};

/**
 * Single badge component used everywhere. Picks a visual treatment based on `variant`.
 * - library: violet pill (for catalog library names like "magicui")
 * - quality: grade dot + letter
 * - tag: uppercase micro chip (for arbitrary tag strings)
 * - status: tone-colored pill (project lifecycle / item status)
 * - count: mono numeric chip
 */
export function Badge({ variant, tone, grade, children, className = '', title }: BadgeProps) {
  switch (variant) {
    case 'library':
      return (
        <span
          title={title}
          className={
            'inline-flex items-center rounded-md bg-violet-500/10 border border-violet-500/20 ' +
            'text-violet-300 text-[10px] font-mono px-1.5 py-0.5 ' +
            className
          }
        >
          {children}
        </span>
      );

    case 'quality': {
      const g = grade ?? 'C';
      return (
        <span
          title={title ?? `Quality grade ${g}`}
          className={
            'inline-flex items-center gap-1 rounded-full bg-zinc-900/60 border border-zinc-800 ' +
            'px-1.5 py-0.5 text-[9px] font-mono text-zinc-300 ' +
            className
          }
        >
          <span className={'size-1.5 rounded-full ' + QUALITY_DOT[g]} />
          {children ?? g}
        </span>
      );
    }

    case 'tag':
      return (
        <span
          title={title}
          className={
            'text-[10px] uppercase tracking-wider rounded-full bg-zinc-900/60 ' +
            'border border-zinc-800/60 text-zinc-500 px-1.5 py-0.5 ' +
            className
          }
        >
          {children}
        </span>
      );

    case 'status': {
      const t = tone ?? 'neutral';
      return (
        <span
          title={title}
          className={
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ' +
            TONE_STYLES[t] + ' ' +
            className
          }
        >
          {children}
        </span>
      );
    }

    case 'count':
      return (
        <span
          title={title}
          className={
            'rounded-full bg-zinc-900/60 backdrop-blur border border-zinc-800 ' +
            'px-2.5 py-0.5 text-[11px] font-mono text-zinc-400 ' +
            className
          }
        >
          {children}
        </span>
      );

    default:
      return <span className={className}>{children}</span>;
  }
}
