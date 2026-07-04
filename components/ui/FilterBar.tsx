import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  /** Action form attribute (defaults to GET on the current page). */
  action?: string;
}

/**
 * Glass-panel filter bar. Children are typically <input>, <select>, and a submit <button>.
 * Use the .filter-control class on form controls for consistent styling.
 */
// iter-16 (owner: "filter bar + Add button look out of place"): softened the
// panel to match the Cyber-Den glass cards and toned the loud cyan gradient CTA
// down to a ghost-accent button that sits with the rest of the UI.
export function FilterBar({ children, action }: FilterBarProps) {
  return (
    <form
      action={action}
      className="mb-6 grid gap-2 md:flex md:flex-wrap md:items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-2.5"
    >
      {children}
    </form>
  );
}

/**
 * Shared field styles. Apply to <input>, <select> inside FilterBar.
 */
export const FILTER_CONTROL_CLASSES =
  'rounded-lg bg-white/[0.03] backdrop-blur border border-white/[0.08] px-3 py-2 text-[length:var(--t-label)] text-zinc-200 ' +
  'placeholder:text-zinc-600 focus:border-cyan-600/60 focus:outline-none focus:ring-1 focus:ring-cyan-600/30 transition-colors';

/**
 * Primary CTA button styles (for the Filter submit / "+ Add new" actions).
 */
export const PRIMARY_BUTTON_CLASSES =
  'rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 font-semibold px-4 py-2 text-[length:var(--t-label)] ' +
  'hover:bg-cyan-500/20 hover:border-cyan-400/60 transition-colors';

/**
 * Secondary button (Cancel etc.).
 */
export const SECONDARY_BUTTON_CLASSES =
  'rounded-xl bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800 text-zinc-300 ' +
  'font-medium px-4 py-2 text-sm transition-colors';
