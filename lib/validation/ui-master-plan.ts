// zod schema for the UI Master Plan singleton (Stage 2.2).

import { z } from 'zod';

const animationLevelEnum = z.enum(['none', 'subtle', 'smooth', 'playful']);

export const PaletteSchema = z.object({
  bg: z.string().optional(),
  fg: z.string().optional(),
  accents: z.array(z.string()).max(8).optional(),
  border: z.string().optional(),
  card: z.string().optional(),
}).passthrough(); // designers may add extra named tokens

export const FontsSchema = z.object({
  heading: z.string().optional(),
  body: z.string().optional(),
  mono: z.string().optional(),
}).passthrough();

// ── Design decision-ledger (Task 2) ──────────────────────────────────────────
// The A→B→C visual loop's state. Deliberately permissive (passthrough) so the method can evolve
// without a migration, and deliberately WITHOUT any string length cap — truncating a design
// rationale is exactly the failure this replaces (project_todos.title's 300-char cap bit twice).

export const DesignDecisionSchema = z.object({
  id: z.string().optional(),
  axis: z.string().optional(),            // the decision this isolates (interaction / palette / layout)
  component: z.string().optional(),
  chosen: z.string().optional(),
  mixed_from: z.array(z.string()).optional(), // "1A's meta + 2C's button"
  rationale: z.string().optional(),       // NO .max() — uncapped by design
  locked: z.boolean().optional(),
  round: z.number().int().optional(),
  ts: z.string().optional(),
  source_mc_ids: z.array(z.string()).optional(), // master_components the variant came from
}).passthrough();

export const DesignLedgerSchema = z.object({
  context: z.object({
    audience: z.string().optional(),
    use_cases: z.union([z.string(), z.array(z.string())]).optional(),
    brand_tone: z.string().optional(),
    primary_screen: z.string().optional(),
  }).passthrough().optional(),
  worklist: z.array(z.unknown()).optional(),
  ladder: z.object({ rung: z.string().optional() }).passthrough().optional(),
  colour_budget: z.unknown().optional(),
  decisions: z.array(DesignDecisionSchema).optional(),
  open: z.array(z.unknown()).optional(),
  preview_url: z.string().optional(),     // the ONE evolving Artifact URL
  tokens: z.array(z.unknown()).optional(), // theme-from-content output (per-item accents)
}).passthrough();

export const UiMasterPlanUpsertSchema = z.object({
  aspect_ratios: z.array(z.string()).optional(),
  palette_dark: PaletteSchema.nullish(),
  palette_light: PaletteSchema.nullish(),
  fonts: FontsSchema.nullish(),
  animation_level: animationLevelEnum.nullish(),
  layout_style: z.string().nullish(),
  design_ledger: DesignLedgerSchema.nullish(),
});
