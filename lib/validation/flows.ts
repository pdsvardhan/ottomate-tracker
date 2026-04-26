// zod schemas for Doc 2 (Flows) + children: steps, pre_conditions, edge_cases.

import { z } from 'zod';

const flowTypeEnum = z.enum(['ui', 'backend', 'automated', 'mixed']);
const flowPriorityEnum = z.enum(['critical', 'important', 'nice-to-have']);
const flowTestStatusEnum = z.enum(['not-tested', 'passing', 'failing', 'partial']);

export const FlowCreateSchema = z.object({
  id: z.string().min(1).max(80),
  parent_id: z.string().nullish(),
  title: z.string().min(1),
  trigger: z.string().nullish(),
  expected_outcome: z.string().nullish(),
  type: flowTypeEnum.nullish(),
  priority: flowPriorityEnum.optional(),
  test_status: flowTestStatusEnum.optional(),
  linked_playwright_test: z.string().nullish(),
  notes: z.string().nullish(),
});

export const FlowPatchSchema = FlowCreateSchema.omit({ id: true }).partial().extend({
  last_tested_date: z.coerce.date().nullish(),
});

const actorEnum = z.enum(['user', 'system']);

export const FlowStepCreateSchema = z.object({
  sort_order: z.number().int().min(0),
  actor: actorEnum,
  action: z.string().min(1),
  result: z.string().min(1),
});
export const FlowStepPatchSchema = FlowStepCreateSchema.partial();

export const FlowSubItemCreateSchema = z.object({
  content: z.string().min(1),
  sort_order: z.number().int().min(0).optional(),
});
export const FlowSubItemPatchSchema = FlowSubItemCreateSchema.partial();
