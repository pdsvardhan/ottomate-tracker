// Sidebar navigation — server component (just links).

import Link from 'next/link';

const NAV: Array<{ label: string; href: string; section?: string }> = [
  { label: 'Projects', href: '/' },
  { label: 'Bug Inbox', href: '/inbox' },
  { label: 'Coverage', href: '/coverage' },
  { label: 'Risks', href: '/risks' },
  { label: 'Components', href: '/components-browser' },
  { label: 'Search', href: '/search' },
];

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-zinc-800/80 bg-zinc-950/60 backdrop-blur">
      <div className="px-5 py-6">
        <Link href="/" className="block">
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            Ottomate
          </span>
        </Link>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">
          Web project pipeline
        </p>
      </div>

      <nav className="px-3 pb-6 space-y-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto px-5 py-4 text-[11px] text-zinc-600 border-t border-zinc-800/80">
        <div>v0.1.0 · :8110</div>
        <div className="truncate">VAULT7A · localhost-bound</div>
      </div>
    </aside>
  );
}
