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

export const UiMasterPlanUpsertSchema = z.object({
  aspect_ratios: z.array(z.string()).optional(),
  palette_dark: PaletteSchema.nullish(),
  palette_light: PaletteSchema.nullish(),
  fonts: FontsSchema.nullish(),
  animation_level: animationLevelEnum.nullish(),
  layout_style: z.string().nullish(),
});
