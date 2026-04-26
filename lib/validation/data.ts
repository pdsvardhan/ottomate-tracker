// zod schemas for Doc 5 (Data) — concepts + sources + contracts (Codex P1 #9 split).

import { z } from 'zod';

const retentionPolicyEnum = z.enum([
  'forever', 'N-days', 'N-years', 'rotate-on-size', 'archive-after-period',
]);
const freshnessTargetEnum = z.enum(['email', 'log', 'silent', 'glitchtip']);

export const DataConceptsUpsertSchema = z.object({
  has_data_layer: z.boolean().optional(),
  retention_policy_type: retentionPolicyEnum.nullish(),
  retention_duration: z.string().nullish(),
  retention_reason: z.string().nullish(),
  freshness_threshold_hours: z.number().int().nullish(),
  freshness_notification_target: freshnessTargetEnum.nullish(),
});

const sourceTypeEnum = z.enum([
  'csv-upload', 'external-api', 'scraped-website', 'user-input',
  'iot-device', 'manual-entry', 'generated',
]);
const authMethodEnum = z.enum([
  'anonymous', 'api-key', 'oauth', 'basic-auth', 'bearer-token',
]);
const ingestionMethodEnum = z.enum([
  'one-time-upload', 'scheduled-fetch', 'webhook-receive',
  'real-time-stream', 'user-triggered', 'manual',
]);
const failureHandlingEnum = z.enum([
  'retry-with-backoff', 'alert-and-skip', 'alert-and-abort', 'silent-skip',
]);
const refreshStrategyEnum = z.enum([
  'full-refresh', 'incremental', 'append-only', 'upsert',
]);
const dedupStrategyEnum = z.enum([
  'primary-key', 'hash-based', 'last-write-wins', 'none',
]);

export const DataSourceCreateSchema = z.object({
  name: z.string().min(1),
  source_type: sourceTypeEnum,
  url_or_path: z.string().nullish(),
  authentication: authMethodEnum.nullish(),
  ingestion_method: ingestionMethodEnum.nullish(),
  ingestion_frequency: z.string().nullish(),
  ingestion_endpoint: z.string().nullish(),
  failure_handling: failureHandlingEnum.nullish(),
  refresh_strategy: refreshStrategyEnum.nullish(),
  watermark_field: z.string().nullish(),
  deduplication_strategy: dedupStrategyEnum.nullish(),
  backfill_supported: z.boolean().optional(),
});
export const DataSourcePatchSchema = DataSourceCreateSchema.partial().extend({
  last_successful_ingest: z.coerce.date().nullish(),
});

const dbEngineEnum = z.enum([
  'sqlite', 'postgres', 'mysql', 'mongodb', 'redis', 'flatfile',
]);
const storageLocationEnum = z.enum([
  'in-project-sqlite', 'external-db', 'volume-mount', 'cloud-blob',
]);
const migrationToolingEnum = z.enum([
  'drizzle', 'prisma', 'kysely', 'raw-sql', 'none',
]);

export const DataContractsUpsertSchema = z.object({
  database_engine: dbEngineEnum.nullish(),
  storage_location: storageLocationEnum.nullish(),
  migration_tooling: migrationToolingEnum.nullish(),
});
