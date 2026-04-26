// zod schemas for Doc 8 (Decisions / ADR index).

import { z } from 'zod';

const adrStatusEnum = z.enum(['proposed', 'accepted', 'deprecated', 'superseded']);

export const AdrCreateSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1),
  status: adrStatusEnum.nullish(),
  date: z.coerce.date(),
  tags: z.array(z.string()).nullish(),
  body_path: z.string().min(1),
  superseded_by: z.string().nullish(),
});

export const AdrPatchSchema = AdrCreateSchema.omit({ id: true }).partial();
