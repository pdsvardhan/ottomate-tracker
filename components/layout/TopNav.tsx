// Global top navigation (prototype adoption — replaces the left sidebar).
// active-link highlighting lives in the client <NavLinks> child.
// iter-65 #507 (owner: 'delete'): the Search ⌘K button + command palette host
// are gone — the showcase is 9 projects deep, browsing beats searching.

import Link from 'next/link';
import { NavLinks } from './NavLinks';

export function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[rgba(11,12,16,0.85)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-6 md:px-10 h-[72px]">
        <div className="flex items-center gap-8 min-w-0">
          <Link href="/" className="shrink-0 text-[24px] font-extrabold tracking-tight text-zinc-50">
            OTTOMATE<span className="text-accent">.</span>
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-3.5 shrink-0">
          <span className="hidden md:inline-flex items-center gap-2 text-[length:var(--t-cap)] text-zinc-400">
            <span className="size-2 rounded-full bg-emerald-400" />
            live
          </span>
        </div>
      </div>
    </header>
  );
}
