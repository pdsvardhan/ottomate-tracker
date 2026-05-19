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
export function FilterBar({ children, action }: FilterBarProps) {
  return (
    <form
      action={action}
      className="mb-6 grid gap-2 md:flex md:flex-wrap md:items-center rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-3"
    >
      {children}
    </form>
  );
}

/**
 * Shared field styles. Apply to <input>, <select> inside FilterBar.
 */
export const FILTER_CONTROL_CLASSES =
  'rounded-xl bg-zinc-900/60 backdrop-blur border border-zinc-800/80 px-3 py-2 text-sm ' +
  'placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none focus:ring-1 focus:ring-cyan-700/40 transition-colors';

/**
 * Primary CTA button styles (for the Filter submit / "+ Add new" actions).
 */
export const PRIMARY_BUTTON_CLASSES =
  'rounded-xl bg-gradient-to-br from-cyan-600/80 to-cyan-700/80 hover:from-cyan-500 hover:to-cyan-600 ' +
  'text-white font-medium px-4 py-2 text-sm transition-all shadow-[0_0_20px_-8px_rgba(0,212,170,0.5)]';

/**
 * Secondary button (Cancel etc.).
 */
export const SECONDARY_BUTTON_CLASSES =
  'rounded-xl bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800 text-zinc-300 ' +
  'font-medium px-4 py-2 text-sm transition-colors';
