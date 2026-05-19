import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  body?: string;
  cta?: ReactNode;
  className?: string;
}

/**
 * Sunken empty-state panel used for "no flows yet", "no iterations yet", etc.
 * Keep copy terse and generic.
 */
export function EmptyState({ title, body, cta, className = '' }: EmptyStateProps) {
  return (
    <div
      className={
        'rounded-2xl border border-dashed border-zinc-900/60 bg-zinc-950/30 backdrop-blur p-8 text-center ' +
        className
      }
    >
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {body ? <p className="mt-1 text-xs text-zinc-500">{body}</p> : null}
      {cta ? <div className="mt-4 inline-flex">{cta}</div> : null}
    </div>
  );
}
