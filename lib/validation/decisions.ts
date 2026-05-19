// zod schemas for Doc 8 (Decisions / ADR index).

import { z } from 'zod';

const adrStatusEnum = z.enum(['proposed', 'accepted', 'deprecated', 'superseded']);

export const AdrCreateSchema = z.object({
  id: z.string().min(1).max(80).regex(/^adr-\d{3,}-[a-z][a-z0-9-]*$/, "ADR id must match pattern adr-NNN-<short-slug> (e.g., adr-001-cointrail-staging) to avoid global PK collisions"),
  title: z.string().min(1),
  status: adrStatusEnum.nullish(),
  date: z.coerce.date(),
  tags: z.array(z.string()).nullish(),
  body_path: z.string().min(1),
  superseded_by: z.string().nullish(),
});

export const AdrPatchSchema = AdrCreateSchema.omit({ id: true }).partial();
