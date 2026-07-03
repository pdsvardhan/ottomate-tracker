// Global top navigation (prototype adoption — replaces the left sidebar).
// Server component: imports the server-side PaletteHost (DB-backed ⌘K) directly;
// active-link highlighting lives in the client <NavLinks> child.

import Link from 'next/link';
import { PaletteHost } from '@/components/cmdk/PaletteHost';
import { NavLinks } from './NavLinks';

export function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[rgba(11,12,16,0.85)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-6 md:px-10 h-16">
        <div className="flex items-center gap-7 min-w-0">
          <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-zinc-50">
            OTTOMATE<span className="text-accent">.</span>
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <PaletteHost />
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            live
          </span>
        </div>
      </div>
    </header>
  );
}
