// zod schemas for Doc 7 (Risks) — instances, policies, third-party, auth, secrets.
// Codex P1 #10: risks resolve, don't delete.

import { z } from 'zod';

const riskStatusEnum = z.enum(['open', 'accepted', 'resolved']);
const severityEnum = z.enum(['low', 'medium', 'high', 'critical']);

export const RiskInstanceCreateSchema = z.object({
  risk_type_id: z.string().min(1),
  status: riskStatusEnum.optional(),
  severity_override: severityEnum.nullish(),
  hidden_by_default: z.boolean().optional(),
  notes: z.string().nullish(),
});
export const RiskInstancePatchSchema = RiskInstanceCreateSchema.partial().extend({
  sunset_date: z.coerce.date().nullish(),
});

// Resolve action — sets status='resolved' + resolved_at + resolution_summary
export const RiskResolveSchema = z.object({
  resolution_summary: z.string().min(1).max(2000),
});

const exposureEnum = z.enum(['public', 'intranet-only', 'invite-only', 'never-public']);
const accessControlEnum = z.enum(['anonymous-ok', 'auth-required', 'roles-defined']);
const sensitivityEnum = z.enum(['none', 'personal-pii', 'financial', 'business-critical', 'mixed']);
const keyMgmtEnum = z.enum(['none', 'env-vars', 'infisical', 'vault', 'aws-kms']);

export const PolicyUpsertSchema = z.object({
  exposure: exposureEnum.optional(),
  access_control: accessControlEnum.optional(),
  data_sensitivity_tier: sensitivityEnum.optional(),
  encryption_at_rest: z.boolean().nullish(),
  encryption_in_transit: z.boolean().nullish(),
  key_management: keyMgmtEnum.nullish(),
  rate_limiting_enabled: z.boolean().optional(),
  rate_limit_rpm: z.number().int().min(0).nullish(),
});

const tpAuthEnum = z.enum(['anonymous', 'api-key', 'oauth', 'basic-auth', 'bearer-token']);
const termsEnum = z.enum(['accepted', 'pending', 'declined', 'n-a']);

export const ThirdPartyServiceCreateSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().nullish(),
  data_shared: z.string().nullish(),
  auth_method: tpAuthEnum.nullish(),
  failure_mode: z.string().nullish(),
  terms_acceptance: termsEnum.nullish(),
});
export const ThirdPartyServicePatchSchema = ThirdPartyServiceCreateSchema.partial();

const authStrategyEnum = z.enum(['none', 'password', 'magic-link', 'oauth', 'sso', 'custom']);
const sessionMgmtEnum = z.enum(['client-jwt', 'server-session', 'cookie']);
const authLibEnum = z.enum([
  'better-auth', 'auth-js', 'lucia', 'clerk', 'supabase-auth', 'custom', 'n-a',
]);

export const AuthConfigUpsertSchema = z.object({
  strategy: authStrategyEnum.optional(),
  providers: z.array(z.string()).nullish(),
  session_management: sessionMgmtEnum.nullish(),
  mfa_supported: z.boolean().optional(),
  auth_library: authLibEnum.nullish(),
});

const secretStoreEnum = z.enum(['env-vars', 'infisical', 'vault', 'aws-kms', 'env-file']);
const rotationEnum = z.enum(['never', 'monthly', 'quarterly', 'annual', 'ad-hoc']);

export const SecretCreateSchema = z.object({
  name: z.string().min(1),
  where_stored: secretStoreEnum.nullish(),
  what_for: z.string().nullish(),
  rotation_cadence: rotationEnum.nullish(),
});
export const SecretPatchSchema = SecretCreateSchema.partial().extend({
  last_rotated: z.coerce.date().nullish(),
});
