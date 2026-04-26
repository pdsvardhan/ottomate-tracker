CREATE TABLE `adr_features` (
	`adr_id` text NOT NULL,
	`feature_id` text NOT NULL,
	PRIMARY KEY(`adr_id`, `feature_id`),
	FOREIGN KEY (`adr_id`) REFERENCES `adr_index`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `adr_index` (
	`id` text PRIMARY KEY NOT NULL,
	`project_slug` text NOT NULL,
	`title` text NOT NULL,
	`status` text,
	`date` integer NOT NULL,
	`tags` text,
	`body_path` text NOT NULL,
	`superseded_by` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `adr_risks` (
	`adr_id` text PRIMARY KEY NOT NULL,
	`risk_instance_id` integer,
	`risk_type_id` text,
	FOREIGN KEY (`adr_id`) REFERENCES `adr_index`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`risk_instance_id`) REFERENCES `risk_instances`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`risk_type_id`) REFERENCES `risks_catalog`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `auth_config` (
	`project_slug` text PRIMARY KEY NOT NULL,
	`strategy` text DEFAULT 'none',
	`providers` text,
	`session_management` text,
	`mfa_supported` integer DEFAULT false,
	`auth_library` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bugs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`flow_id` text,
	`title` text NOT NULL,
	`description` text,
	`severity` text,
	`status` text DEFAULT 'open',
	`original_report_id` integer,
	`iteration_item_id` integer,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`resolved_at` integer,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`original_report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`iteration_item_id`) REFERENCES `iteration_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `component_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`component_id` integer NOT NULL,
	`variant_name` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `components` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` text NOT NULL,
	`project_slug` text NOT NULL,
	`name` text NOT NULL,
	`purpose_on_page` text,
	`category` text,
	`data_consumed` text,
	`data_produced` text,
	`picked` integer DEFAULT false,
	`asset_library_ref` text,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_library_ref`) REFERENCES `master_components`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`name` text NOT NULL,
	`source_type` text NOT NULL,
	`url_or_path` text,
	`authentication` text,
	`ingestion_method` text,
	`ingestion_frequency` text,
	`ingestion_endpoint` text,
	`failure_handling` text,
	`refresh_strategy` text,
	`watermark_field` text,
	`deduplication_strategy` text,
	`backfill_supported` integer DEFAULT false,
	`last_successful_ingest` integer,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `external_project_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracker_slug` text NOT NULL,
	`external_system` text NOT NULL,
	`external_slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_external_mapping` ON `external_project_mappings` (`tracker_slug`,`external_system`);--> statement-breakpoint
CREATE TABLE `feature_acceptance_criteria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feature_id` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	`test_status` text DEFAULT 'not-tested',
	`linked_test` text,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feature_dependencies` (
	`feature_id` text NOT NULL,
	`depends_on_feature_id` text NOT NULL,
	PRIMARY KEY(`feature_id`, `depends_on_feature_id`),
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`depends_on_feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feature_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`flow_id` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'proposed',
	`original_report_id` integer,
	`iteration_item_id` integer,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`original_report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`iteration_item_id`) REFERENCES `iteration_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` text PRIMARY KEY NOT NULL,
	`project_slug` text NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`short_description` text,
	`type` text,
	`status` text DEFAULT 'planned',
	`priority` text DEFAULT 'P2',
	`size` text,
	`test_status` text DEFAULT 'not-tested',
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flow_edge_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flow_id` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flow_features` (
	`flow_id` text NOT NULL,
	`feature_id` text NOT NULL,
	PRIMARY KEY(`flow_id`, `feature_id`),
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flow_pages` (
	`flow_id` text NOT NULL,
	`page_id` text NOT NULL,
	PRIMARY KEY(`flow_id`, `page_id`),
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flow_pre_conditions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flow_id` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flow_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flow_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`result` text NOT NULL,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flows` (
	`id` text PRIMARY KEY NOT NULL,
	`project_slug` text NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`trigger` text,
	`expected_outcome` text,
	`type` text,
	`priority` text DEFAULT 'important',
	`test_status` text DEFAULT 'not-tested',
	`linked_playwright_test` text,
	`last_tested_date` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `iteration_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`iteration_id` integer NOT NULL,
	`item_type` text,
	`title` text NOT NULL,
	`description` text,
	`target_kind` text,
	`target_id` text,
	`proposed_change` text,
	`confidence` real,
	`user_edited` integer DEFAULT false,
	`status` text DEFAULT 'pending-review',
	`verifier_result` text,
	`user_test_completed_at` integer,
	`notes` text,
	FOREIGN KEY (`iteration_id`) REFERENCES `iterations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `iterations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`iteration_number` integer NOT NULL,
	`trigger_source` text,
	`status` text DEFAULT 'classification-pending',
	`raw_text_id` integer,
	`locked_at` integer,
	`integrated_at` integer,
	`trace_report` text,
	`lock_in_audit` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`raw_text_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `master_components` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`description` text,
	`source_paths` text,
	`variants` text,
	`dark_light_compat` integer DEFAULT true,
	`responsive` integer DEFAULT true,
	`used_in_projects` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `page_entry_points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` text NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `page_features` (
	`page_id` text NOT NULL,
	`feature_id` text NOT NULL,
	PRIMARY KEY(`page_id`, `feature_id`),
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_slug` text NOT NULL,
	`title` text NOT NULL,
	`route` text NOT NULL,
	`purpose` text,
	`layout_type` text,
	`empty_state` text,
	`loading_state` text,
	`error_state` text,
	`permissions` text DEFAULT 'anonymous',
	`mobile_handling` text DEFAULT 'responsive',
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `policies` (
	`project_slug` text PRIMARY KEY NOT NULL,
	`exposure` text DEFAULT 'never-public',
	`access_control` text DEFAULT 'anonymous-ok',
	`data_sensitivity_tier` text DEFAULT 'none',
	`encryption_at_rest` integer,
	`encryption_in_transit` integer,
	`key_management` text,
	`rate_limiting_enabled` integer DEFAULT false,
	`rate_limit_rpm` integer,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_data_concepts` (
	`project_slug` text PRIMARY KEY NOT NULL,
	`has_data_layer` integer DEFAULT false,
	`retention_policy_type` text,
	`retention_duration` text,
	`retention_reason` text,
	`freshness_threshold_hours` integer,
	`freshness_notification_target` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_data_contracts` (
	`project_slug` text PRIMARY KEY NOT NULL,
	`database_engine` text,
	`storage_location` text,
	`migration_tooling` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_non_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_secrets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`name` text NOT NULL,
	`where_stored` text,
	`what_for` text,
	`rotation_cadence` text,
	`last_rotated` integer,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_success_criteria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`slug` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`tagline` text,
	`short_description` text,
	`core_idea` text,
	`current_status` text DEFAULT 'building',
	`lifecycle_phase` text DEFAULT 'ideating',
	`scope_size` text,
	`target_devices` text DEFAULT 'both',
	`hosting_target` text DEFAULT 'vault7a-docker',
	`port` integer,
	`public_url` text,
	`repository_url` text,
	`problem_statement` text,
	`preferences` text,
	`tags` text,
	`needs_stage_1_catchup` integer DEFAULT false,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`flow_id` text,
	`raw_text` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'pending',
	`submitted_at` integer DEFAULT (unixepoch()),
	`classified_at` integer,
	`classified_by_session` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risk_instance_features` (
	`risk_instance_id` integer NOT NULL,
	`feature_id` text NOT NULL,
	PRIMARY KEY(`risk_instance_id`, `feature_id`),
	FOREIGN KEY (`risk_instance_id`) REFERENCES `risk_instances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `risk_instance_pages` (
	`risk_instance_id` integer NOT NULL,
	`page_id` text NOT NULL,
	PRIMARY KEY(`risk_instance_id`, `page_id`),
	FOREIGN KEY (`risk_instance_id`) REFERENCES `risk_instances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `risk_instances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`risk_type_id` text NOT NULL,
	`status` text DEFAULT 'open',
	`sunset_date` integer,
	`resolved_at` integer,
	`resolution_summary` text,
	`hidden_by_default` integer DEFAULT false,
	`severity_override` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`risk_type_id`) REFERENCES `risks_catalog`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `risks_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`severity_baseline` text,
	`mitigation_patterns` text,
	`detection_signals` text,
	`category` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `schema_version` (
	`version` integer PRIMARY KEY NOT NULL,
	`applied_at` integer DEFAULT (unixepoch()),
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `tech_stacks` (
	`project_slug` text PRIMARY KEY NOT NULL,
	`framework` text,
	`database` text,
	`state_management` text,
	`styling` text,
	`testing_libs` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `third_party_services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`name` text NOT NULL,
	`purpose` text,
	`data_shared` text,
	`auth_method` text,
	`failure_mode` text,
	`terms_acceptance` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ui_master_plans` (
	`project_slug` text PRIMARY KEY NOT NULL,
	`aspect_ratios` text,
	`palette_dark` text,
	`palette_light` text,
	`fonts` text,
	`animation_level` text,
	`layout_style` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`target_kind` text,
	`target_id` text NOT NULL,
	`ran_at` integer DEFAULT (unixepoch()),
	`verifier_session_id` text,
	`pass_a_code_reality` text,
	`pass_b_stub_detection` text,
	`pass_c_data_correctness` text,
	`pass_d_acceptance_criteria` text,
	`recommendation_overall` text,
	`recommendation_reason` text,
	`mandatory_user_review` integer DEFAULT false,
	`full_report` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `yaml_mirror_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`doc_name` text NOT NULL,
	`last_db_version` integer DEFAULT 0,
	`last_synced_at` integer,
	`last_yaml_hash` text,
	`drift_detected_at` integer,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_yaml_mirror` ON `yaml_mirror_state` (`project_slug`,`doc_name`);