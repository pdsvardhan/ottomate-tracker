// Ottomate tracker — Full DB schema (drizzle + better-sqlite3)
// Reflects locked design + Codex P0/P1/P2 + Codex Round 2 fixes:
// - resolved-not-deleted risk lifecycle
// - explicit per-target risk join tables (no polymorphic FKs)
// - explicit external_* columns on Tasks bridge
// - lock_in_audit JSON, pending_user_review enum
// - reports.source field

import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';
import { CATEGORY_ID_TUPLE } from '../categories';

// ═══════════════════════════════════════════════════════════════════
// CROSS-PROJECT TABLES (shared across all projects)
// ═══════════════════════════════════════════════════════════════════

export const risks_catalog = sqliteTable('risks_catalog', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  severity_baseline: text('severity_baseline', { enum: ['low', 'medium', 'high', 'critical'] }),
  mitigation_patterns: text('mitigation_patterns'),
  detection_signals: text('detection_signals'),
  category: text('category', {
    enum: ['auth-access', 'secrets-env', 'data-storage', 'api-external', 'ui-xss', 'performance', 'process'],
  }),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const master_components = sqliteTable('master_components', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // Category taxonomy — single source of truth in lib/categories.ts
  // (taxonomy-refine 2026-06-29). The enum is TS/zod-only (no SQL CHECK), so
  // editing the list is a code change, not a DB migration.
  category: text('category', {
    enum: CATEGORY_ID_TUPLE,
  }),
  description: text('description'),
  source_paths: text('source_paths', { mode: 'json' }).$type<string[]>(),
  variants: text('variants', { mode: 'json' }).$type<string[]>(),
  dark_light_compat: integer('dark_light_compat', { mode: 'boolean' }).default(true),
  responsive: integer('responsive', { mode: 'boolean' }).default(true),
  used_in_projects: text('used_in_projects', { mode: 'json' }).$type<string[]>(),
  // ── Library-enrichment fields (added 2026-04-26 for Stage 4 component-pick flow) ──
  framework_tags: text('framework_tags', { mode: 'json' }).$type<string[]>(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  preview_url: text('preview_url'),
  dependencies: text('dependencies', { mode: 'json' }).$type<string[]>(),
  primary_file: text('primary_file'),
  license_note: text('license_note'),
  // ── 2026-05-19 expansion (library + quality columns) ──
  library: text('library'),                       // e.g. 'magicui', 'react-bits', 'aceternity', 'custom'
  source_url: text('source_url'),                 // upstream URL the source was pulled from
  quality_grade: text('quality_grade', { enum: ['A', 'B', 'C'] }),
  ingestion_method: text('ingestion_method'),     // 'clone' | 'gist' | 'hand-authored' | 'manual'
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Visual inspirations (Dribbble / Figma community / etc.) for Stage 2.2 UI master plan.
// Added 2026-05-19. Each inspiration may reference master_components that implement its style.
export const inspirations = sqliteTable('inspirations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  source_url: text('source_url').notNull(),
  source_type: text('source_type', {
    enum: ['dribbble', 'figma-community', 'behance', 'mobbin', 'other'],
  }).notNull(),
  domain: text('domain'),
  style_tags: text('style_tags', { mode: 'json' }).$type<string[]>(),
  thumbnail_url: text('thumbnail_url'),
  notes: text('notes'),
  matched_master_component_ids: text('matched_master_component_ids', { mode: 'json' }).$type<string[]>(),
  match_confidence: text('match_confidence', { enum: ['high', 'medium', 'low', 'unmatched'] }),
  added_at: integer('added_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  used_in_projects: text('used_in_projects', { mode: 'json' }).$type<string[]>(),
});

// External project mapping (tracker slug ↔ tasks-dashboard slug, etc.)
export const external_project_mappings = sqliteTable('external_project_mappings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tracker_slug: text('tracker_slug').notNull(),
  external_system: text('external_system', { enum: ['tasks-dashboard', 'gitea', 'other'] }).notNull(),
  external_slug: text('external_slug').notNull(),
}, (t) => ({
  uq: uniqueIndex('uq_external_mapping').on(t.tracker_slug, t.external_system),
}));

// ═══════════════════════════════════════════════════════════════════
// PROJECTS — Doc 1 (Project Overview)
// ═══════════════════════════════════════════════════════════════════

export const projects = sqliteTable('projects', {
  slug: text('slug').primaryKey(),
  display_name: text('display_name').notNull(),
  tagline: text('tagline'),
  short_description: text('short_description'),
  core_idea: text('core_idea'),
  current_status: text('current_status', {
    enum: ['building', 'shipped', 'paused', 'archived'],
  }).default('building'),
  lifecycle_phase: text('lifecycle_phase', {
    enum: ['ideating', 'building', 'shipped', 'maintained', 'deprecated'],
  }).default('ideating'),
  scope_size: text('scope_size', { enum: ['nano', 'small', 'medium', 'large', 'xl'] }),
  target_devices: text('target_devices', {
    enum: ['desktop', 'mobile', 'tablet', 'both'],
  }).default('both'),
  hosting_target: text('hosting_target', {
    enum: ['vault7a-docker', 'public-server', 'hybrid'],
  }).default('vault7a-docker'),
  port: integer('port'),
  public_url: text('public_url'),
  repository_url: text('repository_url'),
  problem_statement: text('problem_statement'),
  preferences: text('preferences', { mode: 'json' }).$type<{
    likes: string[];
    dislikes: string[];
    must_haves: string[];
    avoid: string[];
  }>(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  needs_stage_1_catchup: integer('needs_stage_1_catchup', { mode: 'boolean' }).default(false),
  // Added 2026-05-19 (iter-5 C.8 / T6). Single boolean for "is this active or not".
  // Co-exists with lifecycle_phase='deprecated'; backfilled from existing dep rows.
  archived: integer('archived', { mode: 'boolean' }).default(false),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const project_non_goals = sqliteTable('project_non_goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  sort_order: integer('sort_order').default(0),
});

export const project_success_criteria = sqliteTable('project_success_criteria', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  sort_order: integer('sort_order').default(0),
});

// ═══════════════════════════════════════════════════════════════════
// FLOWS — Doc 2 (User Flows)
// ═══════════════════════════════════════════════════════════════════

export const flows = sqliteTable('flows', {
  id: text('id').primaryKey(),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  parent_id: text('parent_id'),
  title: text('title').notNull(),
  trigger: text('trigger'),
  expected_outcome: text('expected_outcome'),
  type: text('type', { enum: ['ui', 'backend', 'automated', 'mixed'] }),
  priority: text('priority', { enum: ['critical', 'important', 'nice-to-have'] }).default('important'),
  test_status: text('test_status', { enum: ['not-tested', 'passing', 'failing', 'partial'] }).default('not-tested'),
  linked_playwright_test: text('linked_playwright_test'),
  last_tested_date: integer('last_tested_date', { mode: 'timestamp' }),
  notes: text('notes'),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const flow_steps = sqliteTable('flow_steps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flow_id: text('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
  sort_order: integer('sort_order').notNull(),
  actor: text('actor', { enum: ['user', 'system'] }).notNull(),
  action: text('action').notNull(),
  result: text('result').notNull(),
});

export const flow_pre_conditions = sqliteTable('flow_pre_conditions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flow_id: text('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  sort_order: integer('sort_order').default(0),
});

export const flow_edge_cases = sqliteTable('flow_edge_cases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flow_id: text('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  sort_order: integer('sort_order').default(0),
});

// ═══════════════════════════════════════════════════════════════════
// FEATURES — Doc 3
// ═══════════════════════════════════════════════════════════════════

export const features = sqliteTable('features', {
  id: text('id').primaryKey(),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  parent_id: text('parent_id'),
  title: text('title').notNull(),
  short_description: text('short_description'),
  type: text('type', { enum: ['ui', 'backend', 'automated', 'hybrid'] }),
  status: text('status', {
    enum: ['planned', 'building', 'done', 'blocked', 'dropped'],
  }).default('planned'),
  priority: text('priority', { enum: ['P0', 'P1', 'P2', 'P3'] }).default('P2'),
  size: text('size', { enum: ['XS', 'S', 'M', 'L'] }),
  test_status: text('test_status', {
    enum: ['passing', 'partial', 'failing', 'not-tested'],
  }).default('not-tested'),
  notes: text('notes'),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const feature_acceptance_criteria = sqliteTable('feature_acceptance_criteria', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  feature_id: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  sort_order: integer('sort_order').default(0),
  test_status: text('test_status', { enum: ['passing', 'failing', 'not-tested'] }).default('not-tested'),
  linked_test: text('linked_test'),
});

// M:N joins
export const flow_features = sqliteTable('flow_features', {
  flow_id: text('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
  feature_id: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.flow_id, t.feature_id] }) }));

export const feature_dependencies = sqliteTable('feature_dependencies', {
  feature_id: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  depends_on_feature_id: text('depends_on_feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.feature_id, t.depends_on_feature_id] }) }));

// ═══════════════════════════════════════════════════════════════════
// PAGES + COMPONENTS — Doc 4
// ═══════════════════════════════════════════════════════════════════

export const pages = sqliteTable('pages', {
  id: text('id').primaryKey(),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  route: text('route').notNull(),
  purpose: text('purpose'),
  layout_type: text('layout_type', {
    enum: ['dashboard', 'list', 'detail', 'form', 'wizard', 'modal', 'popup'],
  }),
  empty_state: text('empty_state'),
  loading_state: text('loading_state', { enum: ['skeleton', 'spinner', 'progressive'] }),
  error_state: text('error_state'),
  permissions: text('permissions', {
    enum: ['anonymous', 'logged-in', 'admin', 'custom'],
  }).default('anonymous'),
  mobile_handling: text('mobile_handling', {
    enum: ['responsive', 'mobile-only', 'desktop-only', 'N-A'],
  }).default('responsive'),
});

export const page_entry_points = sqliteTable('page_entry_points', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page_id: text('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
});

export const page_features = sqliteTable('page_features', {
  page_id: text('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  feature_id: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.page_id, t.feature_id] }) }));

export const flow_pages = sqliteTable('flow_pages', {
  flow_id: text('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
  page_id: text('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.flow_id, t.page_id] }) }));

export const components = sqliteTable('components', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page_id: text('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  purpose_on_page: text('purpose_on_page'),
  // Loose, free-text category for page-level components — cross-links to
  // master_components but tolerates historical values (the old 18-cat list and
  // the new lib/categories.ts slugs alike), so it is intentionally un-enumed.
  category: text('category'),
  data_consumed: text('data_consumed'),
  data_produced: text('data_produced'),
  picked: integer('picked', { mode: 'boolean' }).default(false),
  asset_library_ref: text('asset_library_ref').references(() => master_components.id),
  // Added across iteration #5 and earlier; surfaced in schema.ts now (DB had them already).
  picked_variant: text('picked_variant'),
  picked_at: text('picked_at'),
  picked_provenance: text('picked_provenance'),
  skip_reason: text('skip_reason'),
  current_phase: text('current_phase').default('PROPOSED'),
});

export const component_variants = sqliteTable('component_variants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  component_id: integer('component_id').notNull().references(() => components.id, { onDelete: 'cascade' }),
  variant_name: text('variant_name').notNull(),
  sort_order: integer('sort_order').default(0),
});

// ═══════════════════════════════════════════════════════════════════
// DATA — Doc 5 (split per Codex P1 #9)
// ═══════════════════════════════════════════════════════════════════

export const project_data_concepts = sqliteTable('project_data_concepts', {
  project_slug: text('project_slug').primaryKey().references(() => projects.slug, { onDelete: 'cascade' }),
  has_data_layer: integer('has_data_layer', { mode: 'boolean' }).default(false),
  retention_policy_type: text('retention_policy_type', {
    enum: ['forever', 'N-days', 'N-years', 'rotate-on-size', 'archive-after-period'],
  }),
  retention_duration: text('retention_duration'),
  retention_reason: text('retention_reason'),
  freshness_threshold_hours: integer('freshness_threshold_hours'),
  freshness_notification_target: text('freshness_notification_target', {
    enum: ['email', 'log', 'silent', 'glitchtip'],
  }),
});

export const data_sources = sqliteTable('data_sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  source_type: text('source_type', {
    enum: ['csv-upload', 'external-api', 'scraped-website', 'user-input', 'iot-device', 'manual-entry', 'generated'],
  }).notNull(),
  url_or_path: text('url_or_path'),
  authentication: text('authentication', {
    enum: ['anonymous', 'api-key', 'oauth', 'basic-auth', 'bearer-token'],
  }),
  ingestion_method: text('ingestion_method', {
    enum: ['one-time-upload', 'scheduled-fetch', 'webhook-receive', 'real-time-stream', 'user-triggered', 'manual'],
  }),
  ingestion_frequency: text('ingestion_frequency'),
  ingestion_endpoint: text('ingestion_endpoint'),
  failure_handling: text('failure_handling', {
    enum: ['retry-with-backoff', 'alert-and-skip', 'alert-and-abort', 'silent-skip'],
  }),
  refresh_strategy: text('refresh_strategy', {
    enum: ['full-refresh', 'incremental', 'append-only', 'upsert'],
  }),
  watermark_field: text('watermark_field'),
  deduplication_strategy: text('deduplication_strategy', {
    enum: ['primary-key', 'hash-based', 'last-write-wins', 'none'],
  }),
  backfill_supported: integer('backfill_supported', { mode: 'boolean' }).default(false),
  last_successful_ingest: integer('last_successful_ingest', { mode: 'timestamp' }),
});

// Stage 2 contract block (filled later)
export const project_data_contracts = sqliteTable('project_data_contracts', {
  project_slug: text('project_slug').primaryKey().references(() => projects.slug, { onDelete: 'cascade' }),
  database_engine: text('database_engine', {
    enum: ['sqlite', 'postgres', 'mysql', 'mongodb', 'redis', 'flatfile'],
  }),
  storage_location: text('storage_location', {
    enum: ['in-project-sqlite', 'external-db', 'volume-mount', 'cloud-blob'],
  }),
  migration_tooling: text('migration_tooling', {
    enum: ['drizzle', 'prisma', 'kysely', 'raw-sql', 'none'],
  }),
});

// ═══════════════════════════════════════════════════════════════════
// RISKS — Doc 7 (Codex P1 #10 — resolved-not-deleted; P2 #17 — explicit per-target joins)
// ═══════════════════════════════════════════════════════════════════

export const risk_instances = sqliteTable('risk_instances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  risk_type_id: text('risk_type_id').notNull().references(() => risks_catalog.id),
  status: text('status', { enum: ['open', 'accepted', 'resolved'] }).default('open'),
  sunset_date: integer('sunset_date', { mode: 'timestamp' }),
  resolved_at: integer('resolved_at', { mode: 'timestamp' }),
  resolution_summary: text('resolution_summary'),
  hidden_by_default: integer('hidden_by_default', { mode: 'boolean' }).default(false),
  severity_override: text('severity_override', { enum: ['low', 'medium', 'high', 'critical'] }),
  notes: text('notes'),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Codex P2 #17 — explicit per-target joins (no polymorphic FKs)
export const risk_instance_features = sqliteTable('risk_instance_features', {
  risk_instance_id: integer('risk_instance_id').notNull().references(() => risk_instances.id, { onDelete: 'cascade' }),
  feature_id: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.risk_instance_id, t.feature_id] }) }));

export const risk_instance_pages = sqliteTable('risk_instance_pages', {
  risk_instance_id: integer('risk_instance_id').notNull().references(() => risk_instances.id, { onDelete: 'cascade' }),
  page_id: text('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.risk_instance_id, t.page_id] }) }));

export const policies = sqliteTable('policies', {
  project_slug: text('project_slug').primaryKey().references(() => projects.slug, { onDelete: 'cascade' }),
  exposure: text('exposure', {
    enum: ['public', 'intranet-only', 'invite-only', 'never-public'],
  }).default('never-public'),
  access_control: text('access_control', {
    enum: ['anonymous-ok', 'auth-required', 'roles-defined'],
  }).default('anonymous-ok'),
  data_sensitivity_tier: text('data_sensitivity_tier', {
    enum: ['none', 'personal-pii', 'financial', 'business-critical', 'mixed'],
  }).default('none'),
  encryption_at_rest: integer('encryption_at_rest', { mode: 'boolean' }),
  encryption_in_transit: integer('encryption_in_transit', { mode: 'boolean' }),
  key_management: text('key_management', {
    enum: ['none', 'env-vars', 'infisical', 'vault', 'aws-kms'],
  }),
  rate_limiting_enabled: integer('rate_limiting_enabled', { mode: 'boolean' }).default(false),
  rate_limit_rpm: integer('rate_limit_rpm'),
});

export const third_party_services = sqliteTable('third_party_services', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  purpose: text('purpose'),
  data_shared: text('data_shared'),
  auth_method: text('auth_method', {
    enum: ['anonymous', 'api-key', 'oauth', 'basic-auth', 'bearer-token'],
  }),
  failure_mode: text('failure_mode'),
  terms_acceptance: text('terms_acceptance', {
    enum: ['accepted', 'pending', 'declined', 'n-a'],
  }),
});

export const auth_config = sqliteTable('auth_config', {
  project_slug: text('project_slug').primaryKey().references(() => projects.slug, { onDelete: 'cascade' }),
  strategy: text('strategy', {
    enum: ['none', 'password', 'magic-link', 'oauth', 'sso', 'custom'],
  }).default('none'),
  providers: text('providers', { mode: 'json' }).$type<string[]>(),
  session_management: text('session_management', {
    enum: ['client-jwt', 'server-session', 'cookie'],
  }),
  mfa_supported: integer('mfa_supported', { mode: 'boolean' }).default(false),
  auth_library: text('auth_library', {
    enum: ['better-auth', 'auth-js', 'lucia', 'clerk', 'supabase-auth', 'custom', 'n-a'],
  }),
});

export const project_secrets = sqliteTable('project_secrets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  where_stored: text('where_stored', {
    enum: ['env-vars', 'infisical', 'vault', 'aws-kms', 'env-file'],
  }),
  what_for: text('what_for'),
  rotation_cadence: text('rotation_cadence', {
    enum: ['never', 'monthly', 'quarterly', 'annual', 'ad-hoc'],
  }),
  last_rotated: integer('last_rotated', { mode: 'timestamp' }),
});

// ═══════════════════════════════════════════════════════════════════
// DECISIONS / ADRs — Doc 8 (lightweight index; full ADRs as MD in git)
// ═══════════════════════════════════════════════════════════════════

export const adr_index = sqliteTable('adr_index', {
  id: text('id').primaryKey(),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  status: text('status', { enum: ['proposed', 'accepted', 'deprecated', 'superseded'] }),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  body_path: text('body_path').notNull(),
  superseded_by: text('superseded_by'),
  // Added 2026-05-19 (ADR-010) — pairs the ADR card with a diagram_artifacts.kind region.
  // NULL → renders under the "General decisions" rail on the Architecture tab.
  anchored_to: text('anchored_to', { enum: ['process', 'topology', 'platform', 'data', 'ux', 'api'] }),
});

export const adr_features = sqliteTable('adr_features', {
  adr_id: text('adr_id').notNull().references(() => adr_index.id, { onDelete: 'cascade' }),
  feature_id: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
}, (t) => ({ pk: primaryKey({ columns: [t.adr_id, t.feature_id] }) }));

export const adr_risks = sqliteTable('adr_risks', {
  adr_id: text('adr_id').notNull().references(() => adr_index.id, { onDelete: 'cascade' }),
  risk_instance_id: integer('risk_instance_id').references(() => risk_instances.id, { onDelete: 'set null' }),
  risk_type_id: text('risk_type_id').references(() => risks_catalog.id),
}, (t) => ({ pk: primaryKey({ columns: [t.adr_id] }) }));

// ═══════════════════════════════════════════════════════════════════
// STAGE 2 OUTPUTS
// ═══════════════════════════════════════════════════════════════════

export const ui_master_plans = sqliteTable('ui_master_plans', {
  project_slug: text('project_slug').primaryKey().references(() => projects.slug, { onDelete: 'cascade' }),
  aspect_ratios: text('aspect_ratios', { mode: 'json' }).$type<string[]>(),
  palette_dark: text('palette_dark', { mode: 'json' }),
  palette_light: text('palette_light', { mode: 'json' }),
  fonts: text('fonts', { mode: 'json' }),
  animation_level: text('animation_level', { enum: ['none', 'subtle', 'smooth', 'playful'] }),
  layout_style: text('layout_style'),
});

export const tech_stacks = sqliteTable('tech_stacks', {
  project_slug: text('project_slug').primaryKey().references(() => projects.slug, { onDelete: 'cascade' }),
  framework: text('framework'),
  database: text('database'),
  state_management: text('state_management'),
  styling: text('styling'),
  testing_libs: text('testing_libs', { mode: 'json' }).$type<string[]>(),
});

// ═══════════════════════════════════════════════════════════════════
// STAGE 4 — ITERATIONS (Codex P2 #14, #15 fixes)
// ═══════════════════════════════════════════════════════════════════

export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  flow_id: text('flow_id').references(() => flows.id),
  raw_text: text('raw_text').notNull(),
  source: text('source', {
    enum: ['tracker-flow-bug', 'tracker-mega-prompt', 'chat', 'auto-feedback'],
  }).notNull(),
  status: text('status', {
    enum: ['pending', 'classified', 'failed', 'ignored'],
  }).default('pending'),
  submitted_at: integer('submitted_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  classified_at: integer('classified_at', { mode: 'timestamp' }),
  classified_by_session: text('classified_by_session'),
});

export const iterations = sqliteTable('iterations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  iteration_number: integer('iteration_number').notNull(),
  trigger_source: text('trigger_source', {
    enum: ['tracker-flow-bug', 'tracker-mega-prompt', 'chat', 'auto-feedback'],
  }),
  status: text('status', {
    enum: [
      'classification-pending',
      'awaiting-lock',
      'pending_user_review',
      'building',
      'verifying',
      'integrated',
      'cancelled',
    ],
  }).default('classification-pending'),
  raw_text_id: integer('raw_text_id').references(() => reports.id),
  locked_at: integer('locked_at', { mode: 'timestamp' }),
  integrated_at: integer('integrated_at', { mode: 'timestamp' }),
  trace_report: text('trace_report', { mode: 'json' }),
  lock_in_audit: text('lock_in_audit', { mode: 'json' }),
});

export const iteration_items = sqliteTable('iteration_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  iteration_id: integer('iteration_id').notNull().references(() => iterations.id, { onDelete: 'cascade' }),
  item_type: text('item_type', {
    enum: [
      'bug',
      'new_feature_request',
      'feature_modification',
      'flow_modification',
      'page_modification',
      'component_modification',
      'risk_addition',
      're_wire',
      'revamp',
      'observation',
      'question',
    ],
  }),
  title: text('title').notNull(),
  description: text('description'),
  target_kind: text('target_kind', {
    enum: ['feature', 'flow', 'page', 'component', 'integration', 'secret'],
  }),
  target_id: text('target_id'),
  proposed_change: text('proposed_change', { mode: 'json' }),
  confidence: real('confidence'),
  user_edited: integer('user_edited', { mode: 'boolean' }).default(false),
  status: text('status', {
    enum: ['pending-review', 'locked', 'building', 'verified', 'integrated', 'rejected'],
  }).default('pending-review'),
  verifier_result: text('verifier_result', { mode: 'json' }),
  user_test_completed_at: integer('user_test_completed_at', { mode: 'timestamp' }),
  notes: text('notes'),
});

// Bugs + feature requests linked to iterations
export const bugs = sqliteTable('bugs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  flow_id: text('flow_id').references(() => flows.id),
  title: text('title').notNull(),
  description: text('description'),
  severity: text('severity', { enum: ['blocker', 'major', 'minor', 'cosmetic'] }),
  status: text('status', {
    enum: ['open', 'triaged', 'in-progress', 'fixed', 'closed'],
  }).default('open'),
  original_report_id: integer('original_report_id').references(() => reports.id),
  iteration_item_id: integer('iteration_item_id').references(() => iteration_items.id),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  resolved_at: integer('resolved_at', { mode: 'timestamp' }),
});

export const feature_requests = sqliteTable('feature_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  flow_id: text('flow_id').references(() => flows.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['proposed', 'accepted', 'building', 'done', 'rejected'],
  }).default('proposed'),
  original_report_id: integer('original_report_id').references(() => reports.id),
  iteration_item_id: integer('iteration_item_id').references(() => iteration_items.id),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// ═══════════════════════════════════════════════════════════════════
// VERIFIER REPORTS (Codex P0 #4)
// ═══════════════════════════════════════════════════════════════════

export const verification_reports = sqliteTable('verification_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  target_kind: text('target_kind', { enum: ['stage-3-feature', 'stage-4-iteration-item'] }),
  target_id: text('target_id').notNull(),
  ran_at: integer('ran_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  verifier_session_id: text('verifier_session_id'),
  pass_a_code_reality: text('pass_a_code_reality'),
  pass_b_stub_detection: text('pass_b_stub_detection'),
  pass_c_data_correctness: text('pass_c_data_correctness'),
  pass_d_acceptance_criteria: text('pass_d_acceptance_criteria'),
  recommendation_overall: text('recommendation_overall', { enum: ['APPROVE', 'BLOCK', 'ITERATE'] }),
  recommendation_reason: text('recommendation_reason'),
  mandatory_user_review: integer('mandatory_user_review', { mode: 'boolean' }).default(false),
  full_report: text('full_report', { mode: 'json' }),
});

// ═══════════════════════════════════════════════════════════════════
// SYNC STATE (Codex P0 #2 — drift detection)
// ═══════════════════════════════════════════════════════════════════

export const yaml_mirror_state = sqliteTable('yaml_mirror_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  doc_name: text('doc_name').notNull(),
  last_db_version: integer('last_db_version').default(0),
  last_synced_at: integer('last_synced_at', { mode: 'timestamp' }),
  last_yaml_hash: text('last_yaml_hash'),
  drift_detected_at: integer('drift_detected_at', { mode: 'timestamp' }),
}, (t) => ({
  uq: uniqueIndex('uq_yaml_mirror').on(t.project_slug, t.doc_name),
}));

// ═══════════════════════════════════════════════════════════════════
// SCHEMA VERSION (for boot validation)
// ═══════════════════════════════════════════════════════════════════

export const schema_version = sqliteTable('schema_version', {
  version: integer('version').primaryKey(),
  applied_at: integer('applied_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  notes: text('notes'),
});

// ============================================================================
// AUDIT 2026-04-29 ADDITIONS (Phase B)
// ============================================================================
// ============================================================================
// Phase transition tables (CC-7 ledger)
// ============================================================================

export const feature_phase_transitions = sqliteTable('feature_phase_transitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  feature_id: text('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  from_phase: text('from_phase').notNull(),
  to_phase: text('to_phase').notNull(),
  transitioned_at: text('transitioned_at').notNull(),
  session_id: text('session_id').notNull(),
  evidence_kind: text('evidence_kind'),
  evidence_ref: text('evidence_ref'),
  triggered_by: text('triggered_by').notNull().default('skill_auto'),
  notes: text('notes'),
}, (table) => ({
  feature_idx: index('idx_fpt_feature').on(table.feature_id, table.transitioned_at),
  session_idx: index('idx_fpt_session').on(table.session_id),
}));

export const flow_phase_transitions = sqliteTable('flow_phase_transitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flow_id: text('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
  from_phase: text('from_phase').notNull(),
  to_phase: text('to_phase').notNull(),
  transitioned_at: text('transitioned_at').notNull(),
  session_id: text('session_id').notNull(),
  evidence_kind: text('evidence_kind'),
  evidence_ref: text('evidence_ref'),
  triggered_by: text('triggered_by').notNull().default('skill_auto'),
  notes: text('notes'),
}, (table) => ({
  flow_idx: index('idx_flpt_flow').on(table.flow_id, table.transitioned_at),
}));

export const page_phase_transitions = sqliteTable('page_phase_transitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page_id: text('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  from_phase: text('from_phase').notNull(),
  to_phase: text('to_phase').notNull(),
  transitioned_at: text('transitioned_at').notNull(),
  session_id: text('session_id').notNull(),
  evidence_kind: text('evidence_kind'),
  evidence_ref: text('evidence_ref'),
  triggered_by: text('triggered_by').notNull().default('skill_auto'),
  notes: text('notes'),
}, (table) => ({
  page_idx: index('idx_ppt_page').on(table.page_id, table.transitioned_at),
}));

export const component_phase_transitions = sqliteTable('component_phase_transitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  component_id: integer('component_id').notNull().references(() => components.id, { onDelete: 'cascade' }),
  from_phase: text('from_phase').notNull(),
  to_phase: text('to_phase').notNull(),
  transitioned_at: text('transitioned_at').notNull(),
  session_id: text('session_id').notNull(),
  evidence_kind: text('evidence_kind'),
  evidence_ref: text('evidence_ref'),
  triggered_by: text('triggered_by').notNull().default('skill_auto'),
  notes: text('notes'),
}, (table) => ({
  component_idx: index('idx_cpt_component').on(table.component_id, table.transitioned_at),
}));

export const risk_lifecycle_transitions = sqliteTable('risk_lifecycle_transitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  risk_instance_id: integer('risk_instance_id').notNull().references(() => risk_instances.id, { onDelete: 'cascade' }),
  from_phase: text('from_phase').notNull(),
  to_phase: text('to_phase').notNull(),
  transitioned_at: text('transitioned_at').notNull(),
  session_id: text('session_id').notNull(),
  evidence_kind: text('evidence_kind'),
  evidence_ref: text('evidence_ref'),
  triggered_by: text('triggered_by').notNull().default('skill_auto'),
  notes: text('notes'),
}, (table) => ({
  riskIdx: index('idx_rlt_risk').on(table.risk_instance_id, table.transitioned_at),
}));

export const iteration_item_transitions = sqliteTable('iteration_item_transitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  iteration_item_id: integer('iteration_item_id').notNull().references(() => iteration_items.id, { onDelete: 'cascade' }),
  from_phase: text('from_phase').notNull(),
  to_phase: text('to_phase').notNull(),
  transitioned_at: text('transitioned_at').notNull(),
  session_id: text('session_id').notNull(),
  evidence_kind: text('evidence_kind'),
  evidence_ref: text('evidence_ref'),
  triggered_by: text('triggered_by').notNull().default('skill_auto'),
  notes: text('notes'),
}, (table) => ({
  itemIdx: index('idx_iit_item').on(table.iteration_item_id, table.transitioned_at),
  session_idx: index('idx_iit_session').on(table.session_id),
}));

// ============================================================================
// intent_drafts (Stage 0.4)
// ============================================================================

export const intent_drafts = sqliteTable('intent_drafts', {
  project_slug: text('project_slug').primaryKey().references(() => projects.slug, { onDelete: 'cascade' }),

  core_idea_raw: text('core_idea_raw').notNull(),
  core_idea_raw_captured_at: text('core_idea_raw_captured_at').notNull(),
  core_idea_raw_session_id: text('core_idea_raw_session_id').notNull(),

  extracted_hints: text('extracted_hints'), // JSON
  hints_extracted_at: text('hints_extracted_at'),
  hints_session_id: text('hints_session_id'),

  core_idea_refined: text('core_idea_refined'),
  core_idea_refined_at: text('core_idea_refined_at'),
  core_idea_refined_session_id: text('core_idea_refined_session_id'),

  features_sketch: text('features_sketch'), // JSON array
  flows_sketch: text('flows_sketch'),
  risk_concerns_initial: text('risk_concerns_initial'),
  sketches_generated_at: text('sketches_generated_at'),

  sketch_input_hash: text('sketch_input_hash'),
  sketch_cache_hit_count: integer('sketch_cache_hit_count').notNull().default(0),

  dropped_hallucinations: text('dropped_hallucinations'), // JSON

  status: text('status').notNull().default('captured'),

  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => ({
  statusIdx: index('idx_id_status').on(table.status),
  session_idx: index('idx_id_session').on(table.core_idea_raw_session_id),
}));

// ============================================================================
// nd1_archive
// ============================================================================

export const nd1_archive = sqliteTable('nd1_archive', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  finalized_at: text('finalized_at').notNull(),
  finalized_session_id: text('finalized_session_id').notNull(),

  payload_json: text('payload_json').notNull(),
  payload_hash: text('payload_hash').notNull(),

  journey_type: integer('journey_type').notNull(),
  features_sketch_count: integer('features_sketch_count'),
  flows_sketch_count: integer('flows_sketch_count'),
  risk_concerns_count: integer('risk_concerns_count'),

  status: text('status').notNull().default('consumed'),
  consumed_at: text('consumed_at'),
  archive_path: text('archive_path'),
}, (table) => ({
  projVersionIdx: index('idx_nda_proj_version').on(table.project_slug, table.version),
  statusIdx: index('idx_nda_status').on(table.status),
}));

// ============================================================================
// sanity_check_runs (CC-1)
// ============================================================================

export const sanity_check_runs = sqliteTable('sanity_check_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').references(() => projects.slug, { onDelete: 'set null' }),
  phase: text('phase').notNull(),
  ran_at: text('ran_at').notNull(),
  duration_ms: integer('duration_ms'),

  verdict: text('verdict').notNull(),
  results_json: text('results_json').notNull(),

  blockers_resolved: text('blockers_resolved'), // JSON
  confirms_resolved: text('confirms_resolved'), // JSON

  session_id: text('session_id'),
}, (table) => ({
  projRanIdx: index('idx_scr_proj_ran').on(table.project_slug, table.ran_at),
  phaseIdx: index('idx_scr_phase').on(table.phase),
  verdictIdx: index('idx_scr_verdict').on(table.verdict),
  session_idx: index('idx_scr_session').on(table.session_id),
}));

// ============================================================================
// drift_resolutions (CC-1)
// ============================================================================

export const drift_resolutions = sqliteTable('drift_resolutions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  detected_at: text('detected_at').notNull(),
  detected_session_id: text('detected_session_id').notNull(),

  file_path: text('file_path').notNull(),
  doc_kind: text('doc_kind').notNull(),

  db_canonical_hash: text('db_canonical_hash').notNull(),
  file_hash: text('file_hash').notNull(),
  last_synced_hash: text('last_synced_hash'),

  resolution: text('resolution'),
  resolved_at: text('resolved_at'),
  resolved_session_id: text('resolved_session_id'),
  notes: text('notes'),
}, (table) => ({
  projIdx: index('idx_dr_proj').on(table.project_slug, table.detected_at),
}));

// ============================================================================
// skill_events (timeline log)
// ============================================================================

export const skill_events = sqliteTable('skill_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').references(() => projects.slug, { onDelete: 'set null' }),
  event_type: text('event_type').notNull(),
  event_at: text('event_at').notNull(),
  session_id: text('session_id'),

  iteration_id: integer('iteration_id').references(() => iterations.id, { onDelete: 'set null' }),
  feature_id: text('feature_id'),
  flow_id: text('flow_id'),
  page_id: text('page_id'),
  component_id: integer('component_id'),

  evidence: text('evidence'), // JSON
  notes: text('notes'),
}, (table) => ({
  projAtIdx: index('idx_se_proj_at').on(table.project_slug, table.event_at),
  event_typeIdx: index('idx_se_event_type').on(table.event_type),
  session_idx: index('idx_se_session').on(table.session_id),
}));

// ═══════════════════════════════════════════════════════════════════
// ITERATION #5 — FOUNDATION TABLES (added 2026-05-19)
// See migration 0002_iteration5_foundation.sql and ITERATION-5-UI-PLAN.md.
// ═══════════════════════════════════════════════════════════════════

// Public docs ingested by mirror:write from each repo's public_docs/ subdir (ADR-011).
export const project_docs = sqliteTable('project_docs', {
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  doc_name: text('doc_name').notNull(),
  body: text('body').notNull(),
  source_hash: text('source_hash'),
  mirrored_at: integer('mirrored_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({ pk: primaryKey({ columns: [t.project_slug, t.doc_name] }) }));

// Per-project to-do list (E.3) — optional checklist per project.
export const project_todos = sqliteTable('project_todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  done: integer('done', { mode: 'boolean' }).default(false),
  sort_order: integer('sort_order').default(0),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Diagram artifacts (Mermaid sources) shown on the Architecture tab (E.6).
export const diagram_artifacts = sqliteTable('diagram_artifacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['process', 'topology', 'platform', 'data', 'ux', 'api'] }).notNull(),
  mermaid_src: text('mermaid_src').notNull(),
  caption: text('caption'),
  position: integer('position').default(0),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  uq: uniqueIndex('uq_diagram_artifacts_proj_kind_pos').on(t.project_slug, t.kind, t.position),
}));

// Per-project component feedback (B.6) — user verdicts on catalog entries from a specific project lens.
export const component_feedback = sqliteTable('component_feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  project_slug: text('project_slug').notNull().references(() => projects.slug, { onDelete: 'cascade' }),
  mc_id: text('mc_id').notNull().references(() => master_components.id, { onDelete: 'cascade' }),
  verdict: text('verdict', {
    enum: ['good', 'bad', 'needs-fix', 'classification-wrong'],
  }).notNull(),
  note: text('note'),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Per-flow test runs (E.9) — user-reported pass/fail per flow.
export const flow_test_runs = sqliteTable('flow_test_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flow_id: text('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['passing', 'failing', 'not-tested'] }).notNull(),
  ran_at: integer('ran_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  ran_by: text('ran_by', { enum: ['user', 'automated'] }),
  notes: text('notes'),
});

// ============================================================================
// Type exports for convenience
// ============================================================================
export type FeaturePhaseTransition = typeof feature_phase_transitions.$inferSelect;
export type FeaturePhaseTransitionInsert = typeof feature_phase_transitions.$inferInsert;
export type IntentDraft = typeof intent_drafts.$inferSelect;
export type IntentDraftInsert = typeof intent_drafts.$inferInsert;
export type Nd1ArchiveRow = typeof nd1_archive.$inferSelect;
export type SanityCheckRun = typeof sanity_check_runs.$inferSelect;
export type DriftResolution = typeof drift_resolutions.$inferSelect;
export type SkillEvent = typeof skill_events.$inferSelect;

// Iteration #5 foundation types
export type MasterComponent = typeof master_components.$inferSelect;
export type Inspiration = typeof inspirations.$inferSelect;
export type ProjectDoc = typeof project_docs.$inferSelect;
export type ProjectTodo = typeof project_todos.$inferSelect;
export type DiagramArtifact = typeof diagram_artifacts.$inferSelect;
export type ComponentFeedback = typeof component_feedback.$inferSelect;
export type FlowTestRun = typeof flow_test_runs.$inferSelect;
export type AdrIndexRow = typeof adr_index.$inferSelect;
export type SkillEventInsert = typeof skill_events.$inferInsert;
