// Per-project accent color — the single source of truth for the identity hue
// used in hero, name dot, stage pill, active tab, and links on each project.
// Accent is for IDENTITY only; status is always encoded with the semantic
// palette (done/wip/todo/risk), never the accent. (ui-overhaul, prototype adoption)

// Curated, distinct hues around the wheel for the known projects.
const ACCENTS: Record<string, string> = {
  ottomate: '#5b8cff',       // indigo-blue
  portfolio: '#ff8a5b',      // coral
  leaploop: '#a88bff',       // violet
  cointrail: '#f5b23c',      // gold
  stateofus: '#40d0b8',      // teal
  'windfall-labs': '#f26d9c',// pink
  'cap-a': '#35c4e8',        // cyan
  mapsofbharat: '#7dd956',   // lime
  ingest: '#8b95a8',         // slate (headless infra)
};

// Deterministic fallback for any unmapped slug: hash → hue, fixed S/L so it
// always lands as a legible mid-tone on the dark bg.
function hashHue(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 360;
  return h;
}

export function projectAccent(slug: string): string {
  return ACCENTS[slug] ?? `hsl(${hashHue(slug)} 70% 66%)`;
}

/** Inline style object that sets the accent CSS vars on a wrapper element.
 *  Everything below it can then use var(--accent) / text-accent / bg-accent. */
export function accentVars(slug: string): React.CSSProperties {
  const accent = projectAccent(slug);
  return { '--accent': accent } as React.CSSProperties;
}
