-- Migration 0005: Add _provenance + current_phase + derived_from_sketch_id columns
-- to entity tables. Anti-gaslight bedrock requires these per CC-7 ledger design
-- and Stage 0.4 / 1.x source-substring rules.

-- ============================================================================
-- features
-- ============================================================================
ALTER TABLE features ADD COLUMN IF NOT EXISTS _provenance TEXT;            -- JSON
ALTER TABLE features ADD COLUMN IF NOT EXISTS derived_from_sketch_id TEXT;
ALTER TABLE features ADD COLUMN IF NOT EXISTS derived_from_nd1_version INTEGER;
ALTER TABLE features ADD COLUMN IF NOT EXISTS current_phase TEXT NOT NULL DEFAULT 'PROPOSED';
-- Phase values: NONE | PROPOSED | SPECCED | BUILD_READY | BUILDING | VERIFIED | INTEGRATED | REGRESSED | DROPPED

-- Acceptance criteria quality scoring
-- (already exists in feature_acceptance_criteria; if not, add)
-- ALTER TABLE feature_acceptance_criteria ADD COLUMN IF NOT EXISTS quality_score REAL;

-- ============================================================================
-- flows
-- ============================================================================
ALTER TABLE flows ADD COLUMN IF NOT EXISTS _provenance TEXT;
ALTER TABLE flows ADD COLUMN IF NOT EXISTS derived_from_sketch_id TEXT;
ALTER TABLE flows ADD COLUMN IF NOT EXISTS current_phase TEXT NOT NULL DEFAULT 'DRAFT';
-- Phase values: NONE | DRAFT | STEPS-LOCKED | LINKED | TESTED | INTEGRATED | REGRESSED | DROPPED

-- ============================================================================
-- pages
-- ============================================================================
ALTER TABLE pages ADD COLUMN IF NOT EXISTS _provenance TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS current_phase TEXT NOT NULL DEFAULT 'PROPOSED';
-- Phase values: NONE | PROPOSED | LAYOUT_LOCKED | COMPONENTS_PICKED | BUILT | DEPLOYED | REGRESSED

-- ============================================================================
-- components
-- ============================================================================
ALTER TABLE components ADD COLUMN IF NOT EXISTS _provenance TEXT;
ALTER TABLE components ADD COLUMN IF NOT EXISTS picked_provenance TEXT;        -- JSON: options offered, why picked
ALTER TABLE components ADD COLUMN IF NOT EXISTS skip_reason TEXT;              -- if picked=false, mandatory reason
ALTER TABLE components ADD COLUMN IF NOT EXISTS picked_at TEXT;
ALTER TABLE components ADD COLUMN IF NOT EXISTS picked_variant TEXT;
ALTER TABLE components ADD COLUMN IF NOT EXISTS current_phase TEXT NOT NULL DEFAULT 'PROPOSED';
-- Phase values: NONE | PROPOSED | COMPONENT_PICKED | STAGE_2_VERIFIED | BUILT | DEPLOYED | SKIPPED

-- ============================================================================
-- risk_instances
-- ============================================================================
ALTER TABLE risk_instances ADD COLUMN IF NOT EXISTS _provenance TEXT;
ALTER TABLE risk_instances ADD COLUMN IF NOT EXISTS resolved_at TEXT;          -- per Codex P1 #10
ALTER TABLE risk_instances ADD COLUMN IF NOT EXISTS resolved_by_session TEXT;
ALTER TABLE risk_instances ADD COLUMN IF NOT EXISTS resolution_summary TEXT;
ALTER TABLE risk_instances ADD COLUMN IF NOT EXISTS hidden_by_default INTEGER NOT NULL DEFAULT 0;
-- Note: status enum already includes 'open' | 'accepted' | 'resolved'

-- ============================================================================
-- iteration_items
-- ============================================================================
ALTER TABLE iteration_items ADD COLUMN IF NOT EXISTS source_substring TEXT;    -- anti-hallucination
ALTER TABLE iteration_items ADD COLUMN IF NOT EXISTS user_edited INTEGER NOT NULL DEFAULT 0;
ALTER TABLE iteration_items ADD COLUMN IF NOT EXISTS confidence REAL;
ALTER TABLE iteration_items ADD COLUMN IF NOT EXISTS _provenance TEXT;

-- ============================================================================
-- iterations
-- ============================================================================
ALTER TABLE iterations ADD COLUMN IF NOT EXISTS lock_in_audit TEXT;            -- per Codex P2 #14
ALTER TABLE iterations ADD COLUMN IF NOT EXISTS trace_report TEXT;             -- Stage 4.8 output
-- Note: status enum should include 'pending_user_review' per Codex P2 #15
-- If not already present, ALTER would need to handle enum update; in SQLite,
-- enum-as-CHECK constraint may need full table rebuild. Defer if expensive.

-- ============================================================================
-- projects
-- ============================================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS held_code_path TEXT;             -- /staging/code/<slug>/
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inspirations_notes TEXT;         -- JSON array
ALTER TABLE projects ADD COLUMN IF NOT EXISTS doc1_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_1_completed_at TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_2_completed_at TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deployed_at TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deploy_commit_sha TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_session_at TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT;                        -- JSON array
ALTER TABLE projects ADD COLUMN IF NOT EXISTS needs_stage_1_catchup INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS onboarding_mode TEXT;             -- lite | standard | full | archive
ALTER TABLE projects ADD COLUMN IF NOT EXISTS onboarding_status TEXT;           -- pending | in_progress | complete | failed
ALTER TABLE projects ADD COLUMN IF NOT EXISTS onboarding_notes TEXT;

-- Backfill phase columns to reasonable defaults for existing data
-- (Migration script should run this manually if existing data has rows)
-- UPDATE features SET current_phase = 'INTEGRATED' WHERE project_slug IN (SELECT slug FROM projects WHERE current_status = 'shipped');
-- UPDATE features SET current_phase = 'SPECCED' WHERE current_phase = 'PROPOSED' AND id IN (SELECT feature_id FROM verification_reports WHERE recommendation_overall = 'APPROVE');
-- (etc. — see MIGRATION_GUIDE.md for full backfill recipe)
