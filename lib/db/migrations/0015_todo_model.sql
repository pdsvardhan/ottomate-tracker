-- 0015_todo_model.sql — the to-do model (ottomate #774 + #530, locked by the owner 2026-09-07).
-- A to-do was one 300-char title + a boolean. Measured over 794 rows: 137 titles at the cap, "DONE" in 126
-- titles, "owner" in 81, 28 ad-hoc [tags] carrying state/origin as prose. These columns give the row real
-- dimensions; every enum has a misc/other bucket that GET counts, so a missing category shows up as a
-- filling bucket instead of vanishing into prose. `done` is kept and synced from `state` for old callers.
ALTER TABLE project_todos ADD COLUMN body TEXT;
--> statement-breakpoint
ALTER TABLE project_todos ADD COLUMN state TEXT NOT NULL DEFAULT 'open';
--> statement-breakpoint
ALTER TABLE project_todos ADD COLUMN kind TEXT NOT NULL DEFAULT 'misc';
--> statement-breakpoint
ALTER TABLE project_todos ADD COLUMN blocked_on TEXT;
--> statement-breakpoint
ALTER TABLE project_todos ADD COLUMN priority TEXT;
--> statement-breakpoint
ALTER TABLE project_todos ADD COLUMN origin TEXT;
--> statement-breakpoint
ALTER TABLE project_todos ADD COLUMN blocked_by TEXT;
--> statement-breakpoint
ALTER TABLE project_todos ADD COLUMN last_verified_at INTEGER;
--> statement-breakpoint
UPDATE project_todos SET state = 'done' WHERE done = 1;
