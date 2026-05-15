-- 0008_feature_claims_deploy_artifacts_test_runs.sql
-- Adds the three ledger tables that anti-gaslight Rules 1/4/5 depend on
-- (per worksheet § 0). Applied 2026-05-13 by the skill review pass.
--
-- Apply: sqlite3 /opt/homeserver/ottomate/data/ottomate.db < 0008_*.sql
-- Idempotent (IF NOT EXISTS everywhere).

-- ============================================================================
-- test_runs — every CI test invocation
-- Created first because deploy_artifacts FKs into it via smoke_test_run_id.
-- ============================================================================
CREATE TABLE IF NOT EXISTS test_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  commit_sha TEXT NOT NULL,
  branch TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  result TEXT CHECK (result IN ('passed','failed','partial','errored','running')),
  total INTEGER,
  passed INTEGER,
  failed INTEGER,
  skipped INTEGER,
  per_test_results TEXT, -- JSON
  triggered_by TEXT CHECK (triggered_by IN ('push','schedule','manual','iteration')),
  iteration_id INTEGER REFERENCES iterations(id) ON DELETE SET NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_tr_proj ON test_runs(project_slug, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_tr_commit ON test_runs(commit_sha);
CREATE INDEX IF NOT EXISTS idx_tr_result ON test_runs(result);

-- ============================================================================
-- deploy_artifacts — what's actually shipped to a URL
-- ============================================================================
CREATE TABLE IF NOT EXISTS deploy_artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  feature_ids TEXT NOT NULL, -- JSON array of feature.id strings
  commit_sha TEXT NOT NULL,
  deploy_url TEXT NOT NULL,
  deployed_at TEXT NOT NULL,
  deployed_by_session TEXT,
  smoke_test_passed INTEGER, -- 0/1; SQLite has no real boolean
  smoke_test_run_id INTEGER REFERENCES test_runs(id) ON DELETE SET NULL,
  rollback_of INTEGER REFERENCES deploy_artifacts(id) ON DELETE SET NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_da_proj ON deploy_artifacts(project_slug, deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_da_commit ON deploy_artifacts(commit_sha);

-- ============================================================================
-- feature_claims — every "this feature is done" assertion (anti-gaslight Rule 1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  claimed_at TEXT NOT NULL,
  claimed_by_session TEXT NOT NULL,
  claim_text TEXT,
  source TEXT NOT NULL CHECK (source IN ('coder-agent','user','iteration-summary','chat','skill-auto')),
  reconciled_with TEXT CHECK (reconciled_with IN ('verified','partial','stub-detected','dropped','unreconciled')) DEFAULT 'unreconciled',
  reconciled_at TEXT,
  reconciler_id INTEGER  -- FK to verification_reports.id; loose coupling (no FK constraint enforced)
);
CREATE INDEX IF NOT EXISTS idx_fc_feature ON feature_claims(feature_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fc_unreconciled ON feature_claims(feature_id) WHERE reconciled_with = 'unreconciled';
CREATE INDEX IF NOT EXISTS idx_fc_session ON feature_claims(claimed_by_session);
