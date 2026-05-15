-- Migration 0003: sanity_check_runs table (CC-1, Stage 0.1)
-- Persists every sanity check run for cross-session audit + 30min TTL caching.
-- Phase 0 check 7 (last-session unresolved-halt audit) reads from here.

CREATE TABLE IF NOT EXISTS sanity_check_runs (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug        TEXT,                       -- NULL for bootstrap (no project yet)
  phase               TEXT NOT NULL,              -- bootstrap | identity | intent | external | stage_1_to_2 | etc.
  ran_at              TEXT NOT NULL,
  duration_ms         INTEGER,

  verdict             TEXT NOT NULL,              -- PROCEED | BLOCKED
  results_json        TEXT NOT NULL,              -- the full sanity_check block

  -- Auto-fix audit
  blockers_resolved   TEXT,                       -- JSON: { check_id, action, command, ran_at, success }
  confirms_resolved   TEXT,                       -- JSON: { check_id, user_choice, resolved_at }

  -- Session context
  session_id          TEXT,

  FOREIGN KEY (project_slug) REFERENCES projects(slug) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_scr_proj_ran ON sanity_check_runs(project_slug, ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_scr_phase ON sanity_check_runs(phase);
CREATE INDEX IF NOT EXISTS idx_scr_verdict ON sanity_check_runs(verdict);
CREATE INDEX IF NOT EXISTS idx_scr_session ON sanity_check_runs(session_id);

-- Helper view: most recent run per (project_slug, phase)
CREATE VIEW IF NOT EXISTS sanity_check_runs_latest AS
SELECT
  scr.*
FROM sanity_check_runs scr
WHERE scr.id = (
  SELECT MAX(scr2.id)
  FROM sanity_check_runs scr2
  WHERE COALESCE(scr2.project_slug, '') = COALESCE(scr.project_slug, '')
    AND scr2.phase = scr.phase
);
