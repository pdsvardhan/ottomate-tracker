'use client';

// Client-only nav links with active highlighting (usePathname). Split out of
// TopNav so TopNav can stay a server component and import the server-side
// PaletteHost without dragging DB code into the client bundle.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV: Array<{ label: string; href: string }> = [
  { label: 'Projects', href: '/' },
  { label: 'Coverage', href: '/coverage' },
  { label: 'Components', href: '/components-browser' },
  { label: 'Inspirations', href: '/inspirations' },
];

export function NavLinks() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/projects') : pathname.startsWith(href);

  return (
    <nav className="hidden sm:flex items-center gap-1">
      {NAV.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={
              'mono text-[12.5px] font-semibold tracking-wide rounded-lg px-3 py-1.5 transition-colors border ' +
              (active
                ? 'text-zinc-100 bg-white/[0.07] border-white/10'
                : 'text-zinc-500 hover:text-zinc-200 border-transparent')
            }
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
