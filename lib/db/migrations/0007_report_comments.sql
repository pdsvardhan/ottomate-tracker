CREATE TABLE `report_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`comment_uid` text NOT NULL,
	`project_slug` text NOT NULL,
	`page` text,
	`url` text,
	`title` text,
	`target` text,
	`locator` text,
	`provenance` text,
	`category` text,
	`screenshot_path` text,
	`selection` text,
	`text` text NOT NULL,
	`ts` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `report_comments_report_id_idx` ON `report_comments` (`report_id`);
