// Shared back button (iter-16, owner feedback 2026-07-05): the old per-page
// "← all components" text links were tiny and merged into the background. This
// is the single consistent affordance used on every list + detail page.

import Link from 'next/link';

export function BackButton({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.04] px-3.5 py-2 text-[length:var(--t-label)] font-semibold text-zinc-300 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/[0.09] hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#5b8cff)]"
      aria-label={label}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="transition-transform group-hover:-translate-x-0.5"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="mono tracking-wide">{label}</span>
    </Link>
  );
}
