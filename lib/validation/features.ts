// zod schemas for Doc 3 (Features) + acceptance_criteria child.

import { z } from 'zod';

const featureTypeEnum = z.enum(['ui', 'backend', 'automated', 'hybrid']);
const featureStatusEnum = z.enum(['planned', 'building', 'done', 'blocked', 'dropped']);
const priorityEnum = z.enum(['P0', 'P1', 'P2', 'P3']);
const sizeEnum = z.enum(['XS', 'S', 'M', 'L']);
const testStatusEnum = z.enum(['passing', 'partial', 'failing', 'not-tested']);

export const FeatureCreateSchema = z.object({
  id: z.string().min(1).max(80),
  parent_id: z.string().nullish(),
  title: z.string().min(1),
  short_description: z.string().nullish(),
  type: featureTypeEnum.nullish(),
  status: featureStatusEnum.optional(),
  priority: priorityEnum.optional(),
  size: sizeEnum.nullish(),
  test_status: testStatusEnum.optional(),
  notes: z.string().nullish(),
});

export const FeaturePatchSchema = FeatureCreateSchema.omit({ id: true }).partial();

const acceptanceTestStatusEnum = z.enum(['passing', 'failing', 'not-tested']);

export const AcceptanceCriterionCreateSchema = z.object({
  content: z.string().min(1).max(500),
  sort_order: z.number().int().min(0).optional(),
  test_status: acceptanceTestStatusEnum.optional(),
  linked_test: z.string().nullish(),
});
export const AcceptanceCriterionPatchSchema = AcceptanceCriterionCreateSchema.partial();
