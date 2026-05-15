-- Migration 0002: intent_drafts table (Stage 0.4)
-- Captures core_idea_raw verbatim + extracted_hints + features_sketch.
-- Persisted at capture (not just session memory). Survives session crashes.

CREATE TABLE IF NOT EXISTS intent_drafts (
  project_slug                TEXT PRIMARY KEY,

  -- Stage 0.4 raw capture (immutable after write)
  core_idea_raw               TEXT NOT NULL,
  core_idea_raw_captured_at   TEXT NOT NULL,
  core_idea_raw_session_id    TEXT NOT NULL,

  -- Stage 0.4 hint extraction (Phase 1 mechanical + Phase 2 Claude)
  extracted_hints             TEXT,                 -- JSON
  hints_extracted_at          TEXT,
  hints_session_id            TEXT,

  -- Stage 0.7 refined (default OFF; only on user opt-in)
  core_idea_refined           TEXT,
  core_idea_refined_at        TEXT,
  core_idea_refined_session_id TEXT,

  -- Stage 0.10 sketches
  features_sketch             TEXT,                 -- JSON array
  flows_sketch                TEXT,                 -- JSON array
  risk_concerns_initial       TEXT,                 -- JSON array
  sketches_generated_at       TEXT,

  -- Stage 0.10 hash for cache
  sketch_input_hash           TEXT,
  sketch_cache_hit_count      INTEGER NOT NULL DEFAULT 0,

  -- Anti-gaslight: dropped hallucinations log
  dropped_hallucinations      TEXT,                 -- JSON array

  -- Status: captured | hints_extracted | sketches_done | finalized | consumed
  status                      TEXT NOT NULL DEFAULT 'captured',

  -- Timestamps
  created_at                  TEXT NOT NULL,
  updated_at                  TEXT NOT NULL,

  FOREIGN KEY (project_slug) REFERENCES projects(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_id_status ON intent_drafts(status);
CREATE INDEX IF NOT EXISTS idx_id_session ON intent_drafts(core_idea_raw_session_id);

-- ND1 archive (mirror of finalized staging/ND1.yaml; queryable for cross-session audit)
CREATE TABLE IF NOT EXISTS nd1_archive (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug                TEXT NOT NULL,
  version                     INTEGER NOT NULL DEFAULT 1,
  finalized_at                TEXT NOT NULL,
  finalized_session_id        TEXT NOT NULL,

  -- Full ND1 payload (mirrors staging/ND1.yaml at finalize time)
  payload_json                TEXT NOT NULL,        -- entire ND1 as JSON
  payload_hash                TEXT NOT NULL,        -- sha256 for integrity

  -- Quick-access fields for queries
  journey_type                INTEGER NOT NULL,
  features_sketch_count       INTEGER,
  flows_sketch_count          INTEGER,
  risk_concerns_count         INTEGER,

  -- Status: consumed | archived (post-Stage-1)
  status                      TEXT NOT NULL DEFAULT 'consumed',
  consumed_at                 TEXT,                 -- when Stage 1.1 read it
  archive_path                TEXT,                 -- staging/archive/ND1-<datetime>.yaml

  FOREIGN KEY (project_slug) REFERENCES projects(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nda_proj_version ON nd1_archive(project_slug, version DESC);
CREATE INDEX IF NOT EXISTS idx_nda_status ON nd1_archive(status);
