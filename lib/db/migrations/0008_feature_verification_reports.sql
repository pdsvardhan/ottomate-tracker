CREATE TABLE `feature_verification_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_slug` text NOT NULL,
	`target_kind` text,
	`target_id` text NOT NULL,
	`ran_at` integer DEFAULT (unixepoch()),
	`verifier_session_id` text,
	`commit_sha` text,
	`cases_total` integer,
	`cases_passed` integer,
	`cases_failed` integer,
	`cases_warned` integer,
	`recommendation_overall` text,
	`recommendation_reason` text,
	`risk_policy` text,
	`mandatory_user_review` integer DEFAULT false,
	`case_matrix` text,
	`evidence_root` text,
	`full_report` text,
	FOREIGN KEY (`project_slug`) REFERENCES `projects`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fvr_project_target_idx` ON `feature_verification_reports` (`project_slug`,`target_id`);
