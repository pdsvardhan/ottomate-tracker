// zod schemas for Stage 4: reports, iterations, iteration items.
// Verifier reports also live here (Codex P0 #4).

import { z } from 'zod';

const reportSourceEnum = z.enum([
  'tracker-flow-bug', 'tracker-mega-prompt', 'chat', 'auto-feedback',
]);

export const ReportCreateSchema = z.object({
  raw_text: z.string().min(1).max(50_000),
  source: reportSourceEnum,
  flow_id: z.string().nullish(),
});

const itemTypeEnum = z.enum([
  'bug', 'new_feature_request', 'feature_modification', 'flow_modification',
  'page_modification', 'component_modification', 'risk_addition',
  're_wire', 'revamp', 'observation', 'question',
]);

const targetKindEnum = z.enum([
  'feature', 'flow', 'page', 'component', 'integration', 'secret',
]);

export const ClassifiedItemSchema = z.object({
  item_type: itemTypeEnum,
  title: z.string().min(1).max(200),
  description: z.string().nullish(),
  target_kind: targetKindEnum.nullish(),
  target_id: z.string().nullish(),
  proposed_change: z.unknown().nullish(),
  confidence: z.number().min(0).max(1).nullish(),
});

export const ClassifyRequestSchema = z.object({
  classified_by_session: z.string().min(1).max(120),
  items: z.array(ClassifiedItemSchema).min(1).max(50),
});

export const ItemPatchSchema = z.object({
  item_type: itemTypeEnum.optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullish(),
  target_kind: targetKindEnum.nullish(),
  target_id: z.string().nullish(),
  proposed_change: z.unknown().nullish(),
  notes: z.string().nullish(),
});

// Defer-with-reason (post-lock drop): reason is mandatory — enforces bedrock rule 7.
export const DeferItemSchema = z.object({
  reason: z.string().min(1).max(2000),
});

export const UserAuthoredItemSchema = ClassifiedItemSchema.extend({
  // Override: user-authored is always max-confidence + already user_edited.
  confidence: z.literal(1).optional(),
});

export const SplitItemSchema = z.object({
  new_items: z.array(ClassifiedItemSchema).min(2).max(10),
  delete_original: z.boolean().default(true),
});

const buildStatusEnum = z.enum(['building', 'verifier-pending', 'verified', 'failed']);

export const BuildStatusSchema = z.object({
  status: buildStatusEnum,
  notes: z.string().nullish(),
});

export const VerifierResultSchema = z.object({
  pass_a_code_reality: z.string().nullish(),
  pass_b_stub_detection: z.string().nullish(),
  pass_c_data_correctness: z.string().nullish(),
  pass_d_acceptance_criteria: z.string().nullish(),
  recommendation_overall: z.enum(['APPROVE', 'BLOCK', 'ITERATE']),
  recommendation_reason: z.string().min(1),
  mandatory_user_review: z.boolean().default(false),
  full_report: z.unknown().nullish(),
  verifier_session_id: z.string().min(1).max(120),
});

export const LockRequestSchema = z.object({
  // Optional override: ack-skip-confidence allows locking when some items are <0.7
  // confidence — only granted when user has manually edited those items.
  notes: z.string().nullish(),
});

export const IntegrateRequestSchema = z.object({
  trace_report: z.unknown(),
  notes: z.string().nullish(),
});
