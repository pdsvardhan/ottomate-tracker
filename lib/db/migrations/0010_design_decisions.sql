-- 0010 — design_decisions (Task 2 per-target design ledger).
-- HAND-WRITTEN. Do NOT run drizzle-kit generate/migrate: migrations 0002-0006 were
-- hand-applied and never journaled, so generate() would try to recreate existing DDL.
-- Additive only (CREATE TABLE + indexes); nothing existing is altered.
-- The 0009 blob (ui_master_plans.design_ledger) is retained for loose context.
CREATE TABLE `design_decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`target_id` text NOT NULL,
	`target_kind` text,
	`axis` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`rung` integer,
	`round` integer DEFAULT 1,
	`variants_shown` text,
	`chosen_value` text,
	`mixed_from` text,
	`rejected` text,
	`rationale` text,
	`constraints_applied` text,
	`profile_at_decision` text,
	`snapshot` text,
	`preview_url` text,
	`confirmed` integer DEFAULT false,
	`confirmation_text_shown` text,
	`session_id` text,
	`supersedes` integer,
	`superseded_by` integer,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `design_decisions_project_target_idx` ON `design_decisions` (`project_slug`,`target_id`);
--> statement-breakpoint
CREATE INDEX `design_decisions_project_status_idx` ON `design_decisions` (`project_slug`,`status`);
--> statement-breakpoint
CREATE INDEX `design_decisions_project_profile_idx` ON `design_decisions` (`project_slug`,`profile_at_decision`);
