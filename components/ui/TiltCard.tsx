'use client';

// Mouse-tracked 3D tilt card (iter-16b, owner: "use the mc-3d-card effect for
// all components"). A Link surface that rotates in perspective toward the cursor
// and eases back on leave. One card computes at a time (per-element mousemove),
// so it's cheap even across the full catalog.

import { useRef, type ReactNode } from 'react';
import Link from 'next/link';

export function TiltCard({
  href,
  className = '',
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  function handleMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(px - 0.5) * 11}deg`);
    el.style.setProperty('--rx', `${(0.5 - py) * 11}deg`);
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
  }
  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }

  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={
        'tilt-card group relative block overflow-hidden rounded-2xl border border-zinc-800/60 ' +
        'bg-gradient-to-br from-zinc-900/40 via-zinc-900/20 to-zinc-950/40 backdrop-blur-xl p-4 ' +
        className
      }
    >
      {/* cursor glow, tracks --mx/--my */}
      <span aria-hidden className="tilt-card-glow" />
      <div className="relative" style={{ transform: 'translateZ(40px)' }}>
        {children}
      </div>
    </Link>
  );
}
