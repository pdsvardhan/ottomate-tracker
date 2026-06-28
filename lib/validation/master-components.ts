// zod schemas for master_components extended fields (Task 4 — Stage 4 component-pick).

import { z } from 'zod';
import { CATEGORY_ID_TUPLE } from '@/lib/categories';

// Single source of truth: lib/categories.ts (taxonomy-refine 2026-06-29).
const categoryEnum = z.enum(CATEGORY_ID_TUPLE);

const qualityEnum = z.enum(['A', 'B', 'C']);

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
  // ── 2026-05-19 expansion ──
  library: z.string().max(80).nullish(),
  source_url: z.string().url().nullish(),
  quality_grade: qualityEnum.nullish(),
  ingestion_method: z.string().max(40).nullish(),
  primary_file: z.string().max(120).nullish(),
  license_note: z.string().max(200).nullish(),
  // ── B.4 modal helpers (NOT stored in DB; route writes them to filesystem) ──
  // If `source_code` + `primary_file` are provided, the route writes the file to
  //   /asset-library/<id>/<primary_file>
  // and sets source_paths = ['/asset-library/<id>/<primary_file>'].
  source_code: z.string().max(500_000).nullish(),
});

// PUT body: same schema minus id, all optional. Lets the user fill source_code etc. one field at a time.
export const MasterComponentPatchSchema = MasterComponentCreateSchema.omit({ id: true }).partial();

export const PickComponentSchema = z.object({
  component_id: z.string().min(1),
  variant_name: z.string().nullish(),
  notes: z.string().nullish(),
});
