-- Migration 0007: skill_events table (cross-cutting timeline log)
-- Generic event log for audit timeline. Every major skill action emits a row.
-- Powers the tracker UI /audit/<slug> timeline.

CREATE TABLE IF NOT EXISTS skill_events (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug        TEXT,
  event_type          TEXT NOT NULL,            -- stage_0_start | stage_1_consume | stage_2_handoff | etc.
  event_at            TEXT NOT NULL,
  session_id          TEXT,

  -- Context (optional fields used per event_type)
  iteration_id        INTEGER,
  feature_id          TEXT,
  flow_id             TEXT,
  page_id             TEXT,
  component_id        INTEGER,

  -- Generic payload
  evidence            TEXT,                     -- JSON
  notes               TEXT,

  FOREIGN KEY (project_slug) REFERENCES projects(slug) ON DELETE SET NULL,
  FOREIGN KEY (iteration_id) REFERENCES iterations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_se_proj_at ON skill_events(project_slug, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_se_event_type ON skill_events(event_type);
CREATE INDEX IF NOT EXISTS idx_se_session ON skill_events(session_id);

-- Common event_type values:
-- stage_0_start
-- stage_0_journey_detected
-- stage_0_doc_translation_complete
-- stage_0_intent_capture_complete
-- stage_0_sketches_generated
-- nd1_finalized
-- stage_1_consume
-- stage_1_doc1_complete
-- stage_1_features_locked
-- stage_1_flows_locked
-- stage_1_pages_locked
-- stage_1_data_locked
-- stage_1_risks_locked
-- stage_1_adr_finalized
-- stage_1_verification_passed
-- stage_1_handoff
-- stage_2_input_validation
-- stage_2_ui_master_plan_locked
-- stage_2_components_grow
-- stage_2_components_picked
-- stage_2_tech_locked
-- stage_2_diagrams_rendered
-- stage_2_build_plan_locked
-- stage_2_verification_passed
-- stage_3_scaffold_complete
-- stage_3_pipeline_setup
-- stage_3_reformat_plan_locked
-- stage_3_codegen_started_<feat>
-- stage_3_verifier_dispatched_<feat>
-- stage_3_verifier_result_<feat>
-- stage_3_auto_fix_<feat>_iter_<n>
-- stage_3_deploy_pre_gate_passed
-- stage_3_deploy_complete
-- stage_3_smoke_passed
-- stage_3_reports_generated
-- stage_4_intake
-- stage_4_classified
-- lock_in_gate_locked
-- stage_4_route_<item>
-- stage_4_component_pick_<item>
-- stage_4_mini_staging_<item>
-- stage_4_mini_build_<item>
-- stage_4_verifier_dispatched_<item>
-- stage_4_verifier_result_<item>
-- stage_4_integrate
-- stage_4_complete
-- pack_up_start
-- pack_up_drift_detected
-- pack_up_drift_resolved
-- pack_up_complete
-- session_resumed
