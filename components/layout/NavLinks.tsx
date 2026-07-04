'use client';

// Client-only nav links with active highlighting (usePathname). Split out of
// TopNav so TopNav can stay a server component and import the server-side
// PaletteHost without dragging DB code into the client bundle.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Coverage removed from the showcase nav (iter-14) — the one useful number
// (overall pass rate) lives on the home hero + per-project overviews; the route
// stays reachable by URL.
const NAV: Array<{ label: string; href: string }> = [
  { label: 'Projects', href: '/' },
  { label: 'Components', href: '/components-browser' },
  { label: 'Inspirations', href: '/inspirations' },
];

export function NavLinks() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/projects') : pathname.startsWith(href);

  return (
    <nav className="hidden sm:flex items-center gap-1.5">
      {NAV.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={
              'mono text-[length:var(--t-label)] font-semibold tracking-wide rounded-lg px-4 py-2 transition-colors border ' +
              (active
                ? 'text-zinc-50 bg-white/[0.09] border-white/15 shadow-[0_0_18px_rgba(168,85,247,0.25)]'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border-transparent')
            }
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
