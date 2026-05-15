-- Migration 0006: drift_resolutions table (CC-1, Pack-up drift handling)
-- Records every drift detection + user resolution for audit.
-- Per Codex P0 #2.

CREATE TABLE IF NOT EXISTS drift_resolutions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug        TEXT NOT NULL,
  detected_at         TEXT NOT NULL,
  detected_session_id TEXT NOT NULL,

  file_path           TEXT NOT NULL,            -- e.g. /mnt/storage/websites/cricket-stats/flows.yaml
  doc_kind            TEXT NOT NULL,            -- overview | flows | features | ui | data | risks | other

  -- Hash comparison
  db_canonical_hash   TEXT NOT NULL,            -- sha256 of DB-derivable serialization
  file_hash           TEXT NOT NULL,            -- sha256 of actual file contents
  last_synced_hash    TEXT,                     -- previous known-good hash (if any)

  -- Resolution
  resolution          TEXT,                     -- import | overwrite | abort
  resolved_at         TEXT,
  resolved_session_id TEXT,
  notes               TEXT,

  FOREIGN KEY (project_slug) REFERENCES projects(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dr_proj ON drift_resolutions(project_slug, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_dr_unresolved ON drift_resolutions(project_slug) WHERE resolution IS NULL;
