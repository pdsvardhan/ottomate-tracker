// zod schemas for the inspirations catalog write endpoints (iter-7 #63).
// API was GET-only; these back POST / PATCH / DELETE so the gallery can be
// curated through the API (ONE DOOR, adr-018) instead of raw SQL.

import { z } from 'zod';

const sourceTypeEnum = z.enum(['dribbble', 'figma-community', 'behance', 'mobbin', 'other']);
const confidenceEnum = z.enum(['high', 'medium', 'low', 'unmatched']);

export const InspirationCreateSchema = z.object({
  id: z.string().regex(/^insp-[a-z0-9-]+$/, 'id must match ^insp-[a-z0-9-]+$').min(5).max(80),
  title: z.string().min(1).max(200),
  source_url: z.string().url(),
  source_type: sourceTypeEnum,
  domain: z.string().max(80).nullish(),
  style_tags: z.array(z.string()).nullish(),
  // Accepts an absolute URL or a relative serve path (e.g. /api/inspirations/<id>/thumbnail).
  thumbnail_url: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
  matched_master_component_ids: z.array(z.string()).nullish(),
  match_confidence: confidenceEnum.nullish(),
  used_in_projects: z.array(z.string()).nullish(),
});

// PATCH: same minus id, all optional. Lets a caller update one field (e.g. thumbnail_url)
// or clear matches (matched_master_component_ids: []).
export const InspirationPatchSchema = InspirationCreateSchema.omit({ id: true }).partial();
