-- Iteration #5 C.8 (T6): add archived column on projects table.
-- Co-existed with lifecycle_phase='deprecated'; this column makes the binary
-- "is this in the active set" question a single boolean instead of a string
-- compare. Backfilled from existing deprecated rows.

ALTER TABLE projects ADD COLUMN archived INTEGER DEFAULT 0;
--> statement-breakpoint
UPDATE projects SET archived = 1 WHERE lifecycle_phase = 'deprecated';
