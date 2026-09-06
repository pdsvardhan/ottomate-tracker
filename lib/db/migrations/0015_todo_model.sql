-- 0015_todo_model.sql — the to-do model (ottomate #774 + #530, locked by the owner 2026-09-07).
-- A to-do was one 300-char title + a boolean. Measured over 794 rows: 137 titles at the cap, "DONE" in 126
-- titles, "owner" in 81, 28 ad-hoc [tags] carrying state/origin as prose. These columns give the row real
-- dimensions; every enum has a misc/other bucket that GET counts, so a missing category shows up as a
-- filling bucket instead of vanishing into prose. `done` is kept and synced from `state` for old callers.
-- Fresh-DB guard (verifier a1d4430d, 2026-09-07): project_todos is created by the un-journaled catch-up SQL, which
-- runs AFTER migrate(); on an empty DB this ALTER would otherwise hit "no such table". No-op on the live DB.
CREATE TABLE IF NOT EXISTS project_todos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  done         INTEGER DEFAULT 0,
  sort_order   INTEGER DEFAULT 0,
  created_at   INTEGER DEFAULT (unixepoch()),
  updated_at   INTEGER DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_project_todos_slug ON project_todos(project_slug);
--> statement-breakpoint
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
