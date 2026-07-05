// Shared back button (iter-16, owner feedback 2026-07-05): the old per-page
// "← all components" text links were tiny and merged into the background. This
// is the single consistent affordance used on every list + detail page.

import Link from 'next/link';

// Shared back button (iter-16b redesign): a light ghost affordance — a circular
// icon chip that slides + brightens on hover, with a plain-sans label (the old
// version was a boxy mono-bordered pill). Consistent on every list + detail page.
export function BackButton({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group inline-flex shrink-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-[length:var(--t-label)] font-medium text-zinc-400 transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#5b8cff)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    >
      <span className="grid size-8 place-items-center rounded-full bg-white/[0.06] ring-1 ring-white/10 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:bg-white/[0.12] group-hover:ring-white/25">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
      <span>{label}</span>
    </Link>
  );
}
