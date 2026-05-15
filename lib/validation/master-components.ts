// zod schemas for master_components extended fields (Task 4 — Stage 4 component-pick).

import { z } from 'zod';

const categoryEnum = z.enum([
  'input', 'display', 'navigation', 'feedback', 'layout', 'overlay',
  'selection', 'button-action', 'animation', 'transition',
  'dataviz', 'media', 'modern-specialty', 'interactive', 'forms-validation',
]);

export const MasterComponentCreateSchema = z.object({
  id: z.string().regex(/^mc-[a-z0-9-]+$/, 'id must match ^mc-[a-z0-9-]+$').min(4).max(80),
  name: z.string().min(1).max(120),
  category: categoryEnum.nullish(),
  description: z.string().nullish(),
  source_paths: z.array(z.string()).nullish(),
  variants: z.array(z.string()).nullish(),
  dark_light_compat: z.boolean().optional(),
  responsive: z.boolean().optional(),
  used_in_projects: z.array(z.string()).nullish(),
  // ── enrichment fields ──
  framework_tags: z.array(z.string()).nullish(),
  tags: z.array(z.string()).nullish(),
  preview_url: z.string().url().nullish(),
  dependencies: z.array(z.string()).nullish(),
});

// PUT body: same schema minus id, all optional. Lets the user fill source_code etc. one field at a time.
export const MasterComponentPatchSchema = MasterComponentCreateSchema.omit({ id: true }).partial();

export const PickComponentSchema = z.object({
  component_id: z.string().min(1),
  variant_name: z.string().nullish(),
  notes: z.string().nullish(),
});
