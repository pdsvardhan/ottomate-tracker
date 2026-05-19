import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  tagline?: string;
  meta?: ReactNode;
  /** Right-aligned slot for primary CTAs (typically a Link/Button). */
  actions?: ReactNode;
}

/**
 * Standard page header for every top-level route.
 * Renders gradient h1 + optional tagline + meta line + actions slot.
 */
export function PageHeader({ title, tagline, meta, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-cyan-200 via-zinc-100 to-violet-200 bg-clip-text text-transparent">
            {title}
          </h1>
          {tagline ? <span className="text-sm text-zinc-500">{tagline}</span> : null}
        </div>
        {meta ? <p className="mt-2 text-sm text-zinc-400">{meta}</p> : null}
      </div>
      {actions ? <div className="shrink-0 flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
