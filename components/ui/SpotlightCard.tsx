'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';

interface SpotlightCardProps {
  href?: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  /** Skip the spotlight effect (e.g. for hover-disabled contexts). */
  inert?: boolean;
}

/**
 * Glass card with a cursor-following radial spotlight on hover.
 * The locked surface across every clickable card in Ottomate (Spotlight Glass design language).
 *
 * Render via:
 *   <SpotlightCard href="/some/route"> ... </SpotlightCard>
 *   <SpotlightCard onClick={...}> ... </SpotlightCard>
 *   <SpotlightCard inert> ... </SpotlightCard>   // static panel use
 */
export function SpotlightCard({ href, className = '', children, onClick, inert = false }: SpotlightCardProps) {
  const ref = useRef<HTMLElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function handleMove(e: React.MouseEvent<HTMLElement>) {
    if (inert) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const baseClasses =
    'group relative block overflow-hidden rounded-2xl border border-zinc-800/60 ' +
    'bg-gradient-to-br from-zinc-900/40 via-zinc-900/20 to-zinc-950/40 ' +
    'backdrop-blur-xl p-4 transition-all duration-300 ' +
    (inert ? '' : 'hover:border-zinc-700/80 hover:shadow-[0_0_40px_-15px_rgba(0,212,170,0.25)] ') +
    className;

  const spotlight = !inert && (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={
          pos
            ? {
                background: `radial-gradient(450px circle at ${pos.x}px ${pos.y}px, rgba(0,212,170,0.10), rgba(168,85,247,0.05) 40%, transparent 70%)`,
              }
            : {}
        }
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px -right-px h-px w-1/2 bg-gradient-to-l from-cyan-400/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </>
  );

  if (href) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={() => setPos(null)}
        className={baseClasses}
      >
        {spotlight}
        <div className="relative">{children}</div>
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick}
        onMouseMove={handleMove}
        onMouseLeave={() => setPos(null)}
        className={baseClasses + ' text-left w-full'}
      >
        {spotlight}
        <div className="relative">{children}</div>
      </button>
    );
  }

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos(null)}
      className={baseClasses}
    >
      {spotlight}
      <div className="relative">{children}</div>
    </div>
  );
}
