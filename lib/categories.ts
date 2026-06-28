// Single source of truth for the master_components category taxonomy.
//
// Until 2026-06-29 the category list was duplicated across 7+ files (schema
// enum, zod validation, and five UI components) which drifted apart — the
// schema enum carried 18 categories, the live data used 11, and the showcase
// browser ordered a different set. iter "taxonomy-refine" collapses all of
// them onto THIS list. Add or rename a category here and nowhere else.
//
// The list is intentionally a curated, website-building-oriented taxonomy for a
// SHOWCASE of distinctive/animated components — not an exhaustive primitive
// library. (Older utilitarian categories — auth-screens, dashboard-shells,
// ai-blocks, selection, transition, forms-validation — were retired when the
// catalog was pruned to its distinctive core.)

export const COMPONENT_CATEGORIES = [
  { id: 'buttons-actions', label: 'Buttons & Actions', description: 'Click targets with personality — animated, playful, micro-interactive' },
  { id: 'cards', label: 'Cards', description: 'Card surfaces: 3D tilt, hover-parallax, profile, product, spotlight' },
  { id: 'text-type', label: 'Text & Type', description: 'Animated text and typographic effects — reveals, typewriters, gradients' },
  { id: 'backgrounds-effects', label: 'Backgrounds & Effects', description: 'Ambient backdrops, spotlights, particles, shaders, cursor glow' },
  { id: 'navigation', label: 'Navigation', description: 'Docks, nav bars, steppers, menus — wayfinding' },
  { id: 'media-galleries', label: 'Media & Galleries', description: 'Carousels, galleries, reels, 3D model viewers' },
  { id: 'data-charts', label: 'Data & Charts', description: 'Charts, heatmaps, counters — visualising numbers and series' },
  { id: 'feedback-progress', label: 'Feedback & Progress', description: 'Progress rings, loaders, confetti, status states' },
  { id: 'scroll-motion', label: 'Scroll & Motion', description: 'Scroll-driven reveals, marquees, reusable motion primitives' },
  { id: 'layout', label: 'Layout', description: 'Grids, bento, comparators, structural primitives' },
  { id: 'forms-inputs', label: 'Forms & Inputs', description: 'Inputs, sliders, pickers, form patterns' },
  { id: 'overlays', label: 'Overlays', description: 'Modals, drawers, toasts, command palettes, popovers' },
  { id: 'sections', label: 'Sections', description: 'Hero, pricing, footer, feature blocks — full page sections' },
] as const;

export type CategoryId = (typeof COMPONENT_CATEGORIES)[number]['id'];

/** Ordered list of category slugs. Cast helpers below for drizzle/zod tuples. */
export const CATEGORY_IDS = COMPONENT_CATEGORIES.map((c) => c.id) as CategoryId[];

/** Non-empty tuple form required by drizzle `enum` and `z.enum`. */
export const CATEGORY_ID_TUPLE = CATEGORY_IDS as [CategoryId, ...CategoryId[]];

/** slug → display label. */
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  COMPONENT_CATEGORIES.map((c) => [c.id, c.label]),
);

export function categoryLabel(id: string | null | undefined): string {
  return (id && CATEGORY_LABELS[id]) || id || '—';
}
