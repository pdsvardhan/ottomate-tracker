-- 0011 - H1 provenance columns on master_components (Stage 4, graduation).
--
-- HAND-WRITTEN, hand-journaled. Do NOT run drizzle-kit generate/migrate: migrations 0002-0006 were
-- hand-applied and never journaled, so generate() would try to recreate existing DDL.
--
-- Additive only. All nullable, no backfill, and deliberately NO default on the provenance fields:
-- a NULL here means "we never captured this", which is precisely what the S3 quarantine gate reads.
-- Defaulting spdx_id to anything would launder an unknown licence into a known one.
--
-- Six of H1's columns did not exist. `source_url` and `quality_grade` already did, so they are absent
-- here; `quality_grade` widens A-C -> A-F in TypeScript only (the enum is TS/zod, no SQL CHECK).
--
-- `provenance_debt` is the seventh and is an owner decision (2026-07-27): rows predating the rule are
-- GRANDFATHERED with a visible flag rather than quarantined, so the gap stays visible and payable
-- instead of removing a quarter of the catalog from lookups overnight.
--
-- Each statement is separated by a breakpoint: the Drizzle migrator executes one statement per call
-- and rejects a multi-statement string outright (learned the hard way on the first attempt).
ALTER TABLE `master_components` ADD `spdx_id` text;--> statement-breakpoint
ALTER TABLE `master_components` ADD `author` text;--> statement-breakpoint
ALTER TABLE `master_components` ADD `attribution` text;--> statement-breakpoint
ALTER TABLE `master_components` ADD `licence_url` text;--> statement-breakpoint
ALTER TABLE `master_components` ADD `retrieved_at` integer;--> statement-breakpoint
ALTER TABLE `master_components` ADD `trademark_flag` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `master_components` ADD `provenance_debt` integer DEFAULT 0;
