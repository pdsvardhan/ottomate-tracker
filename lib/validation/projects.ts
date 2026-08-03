// zod schemas for Doc 1 (Projects) + child resources.
// Mirrors lib/db/schema.ts:projects + project_non_goals + project_success_criteria.

import { z } from 'zod';

export const SLUG_RE = /^[a-z][a-z0-9-]+$/;

export const projectStatusEnum = z.enum(['building', 'shipped', 'paused', 'archived']);
export const lifecyclePhaseEnum = z.enum([
  'ideating',
  'building',
  'shipped',
  'maintained',
  'deprecated',
]);
export const scopeSizeEnum = z.enum(['nano', 'small', 'medium', 'large', 'xl']);
export const targetDevicesEnum = z.enum(['desktop', 'mobile', 'tablet', 'both']);
export const hostingTargetEnum = z.enum(['vault7a-docker', 'public-server', 'hybrid']);
// Phase 3 ship-gate ramp (migration 0012). off = advisory only; warn = SOFT
// anti-gaslight violations; block = HARD violations the deploy gate refuses on.
export const verifyGateEnum = z.enum(['off', 'warn', 'block']);

// All four arrays required; pass empty array to clear. DB column type is strict.
export const PreferencesSchema = z.object({
  likes: z.array(z.string()),
  dislikes: z.array(z.string()),
  must_haves: z.array(z.string()),
  avoid: z.array(z.string()),
});

export const ProjectCreateSchema = z.object({
  slug: z.string().regex(SLUG_RE, 'slug must match ^[a-z][a-z0-9-]+$').min(3).max(40),
  display_name: z.string().min(1),
  tagline: z.string().nullish(),
  short_description: z.string().nullish(),
  core_idea: z.string().nullish(),
  current_status: projectStatusEnum.optional(),
  lifecycle_phase: lifecyclePhaseEnum.optional(),
  scope_size: scopeSizeEnum.nullish(),
  target_devices: targetDevicesEnum.optional(),
  hosting_target: hostingTargetEnum.optional(),
  port: z.number().int().min(1).max(65535).nullish(),
  public_url: z.string().url().nullish(),
  repository_url: z.string().url().nullish(),
  problem_statement: z.string().nullish(),
  preferences: PreferencesSchema.nullish(),
  tags: z.array(z.string()).nullish(),
  needs_stage_1_catchup: z.boolean().optional(),
  verify_gate: verifyGateEnum.optional(),
  // Phase 4 doc-freshness ramp (migration 0013); same {off,warn,block} values.
  doc_gate: verifyGateEnum.optional(),
});

// Slug is immutable; everything else is partial-updatable.
export const ProjectPatchSchema = ProjectCreateSchema.omit({ slug: true }).partial();

export const NonGoalCreateSchema = z.object({
  content: z.string().min(1).max(500),
  sort_order: z.number().int().min(0).optional(),
});

export const NonGoalPatchSchema = NonGoalCreateSchema.partial();

export const SuccessCriterionCreateSchema = NonGoalCreateSchema;
export const SuccessCriterionPatchSchema = NonGoalPatchSchema;

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectPatch = z.infer<typeof ProjectPatchSchema>;
export type NonGoalCreate = z.infer<typeof NonGoalCreateSchema>;
