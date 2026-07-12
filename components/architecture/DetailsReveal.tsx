'use client';

// iter-65 rework (owner screenshot 2026-07-13): React Flow canvases mounted
// inside a CLOSED <details> initialise at zero size — node measurement and the
// initial fitView both run against nothing, so the graphs appeared tiny in a
// corner (or empty) the moment the section was expanded. The ResizeObserver
// refit was racing React Flow's own re-measure and losing on real browsers too.
// Root fix: don't mount the children until the section is first opened — the
// canvases then initialise at full size, the exact same code path as the
// always-visible diagrams. Children stay mounted after that (re-collapse keeps
// state; no re-layout on subsequent toggles).

import { useState, type ReactNode } from 'react';

export function DetailsReveal({ summary, children, className }: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <details
      className={className}
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open) setRevealed(true);
      }}
    >
      {summary}
      {revealed ? children : null}
    </details>
  );
}
