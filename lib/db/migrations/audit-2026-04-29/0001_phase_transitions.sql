-- Migration 0001: Phase transition ledger tables (CC-7)
-- Append-only audit trail of every entity state change.
-- 6 tables, all sharing common shape per references/ledger-tables.md
--
-- Apply via: drizzle-kit migrate (or sqlite3 ottomate.db < 0001_phase_transitions.sql)
--
-- Idempotent: uses IF NOT EXISTS so re-running is safe.

-- ============================================================================
-- 1. feature_phase_transitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_phase_transitions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  feature_id      TEXT NOT NULL,
  from_phase      TEXT NOT NULL,
  to_phase        TEXT NOT NULL,
  transitioned_at TEXT NOT NULL,
  session_id      TEXT NOT NULL,
  evidence_kind   TEXT,
  evidence_ref    TEXT,
  triggered_by    TEXT NOT NULL DEFAULT 'skill_auto',
  notes           TEXT,
  FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fpt_feature ON feature_phase_transitions(feature_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_fpt_session ON feature_phase_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_fpt_evidence ON feature_phase_transitions(evidence_kind);

-- ============================================================================
-- 2. flow_phase_transitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS flow_phase_transitions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id         TEXT NOT NULL,
  from_phase      TEXT NOT NULL,
  to_phase        TEXT NOT NULL,
  transitioned_at TEXT NOT NULL,
  session_id      TEXT NOT NULL,
  evidence_kind   TEXT,
  evidence_ref    TEXT,
  triggered_by    TEXT NOT NULL DEFAULT 'skill_auto',
  notes           TEXT,
  FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_flpt_flow ON flow_phase_transitions(flow_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_flpt_session ON flow_phase_transitions(session_id);

-- ============================================================================
-- 3. page_phase_transitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS page_phase_transitions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id         TEXT NOT NULL,
  from_phase      TEXT NOT NULL,
  to_phase        TEXT NOT NULL,
  transitioned_at TEXT NOT NULL,
  session_id      TEXT NOT NULL,
  evidence_kind   TEXT,
  evidence_ref    TEXT,
  triggered_by    TEXT NOT NULL DEFAULT 'skill_auto',
  notes           TEXT,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ppt_page ON page_phase_transitions(page_id, transitioned_at DESC);

-- ============================================================================
-- 4. component_phase_transitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS component_phase_transitions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id    INTEGER NOT NULL,
  from_phase      TEXT NOT NULL,
  to_phase        TEXT NOT NULL,
  transitioned_at TEXT NOT NULL,
  session_id      TEXT NOT NULL,
  evidence_kind   TEXT,
  evidence_ref    TEXT,
  triggered_by    TEXT NOT NULL DEFAULT 'skill_auto',
  notes           TEXT,
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cpt_component ON component_phase_transitions(component_id, transitioned_at DESC);

-- ============================================================================
-- 5. risk_lifecycle_transitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_lifecycle_transitions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  risk_instance_id INTEGER NOT NULL,
  from_phase      TEXT NOT NULL,        -- open | accepted | resolved
  to_phase        TEXT NOT NULL,
  transitioned_at TEXT NOT NULL,
  session_id      TEXT NOT NULL,
  evidence_kind   TEXT,
  evidence_ref    TEXT,
  triggered_by    TEXT NOT NULL DEFAULT 'skill_auto',
  notes           TEXT,
  FOREIGN KEY (risk_instance_id) REFERENCES risk_instances(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rlt_risk ON risk_lifecycle_transitions(risk_instance_id, transitioned_at DESC);

-- ============================================================================
-- 6. iteration_item_transitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS iteration_item_transitions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  iteration_item_id   INTEGER NOT NULL,
  from_phase          TEXT NOT NULL,
  to_phase            TEXT NOT NULL,
  transitioned_at     TEXT NOT NULL,
  session_id          TEXT NOT NULL,
  evidence_kind       TEXT,
  evidence_ref        TEXT,
  triggered_by        TEXT NOT NULL DEFAULT 'skill_auto',
  notes               TEXT,
  FOREIGN KEY (iteration_item_id) REFERENCES iteration_items(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_iit_item ON iteration_item_transitions(iteration_item_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_iit_session ON iteration_item_transitions(session_id);
