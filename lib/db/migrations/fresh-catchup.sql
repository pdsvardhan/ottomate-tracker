-- fresh-catchup.sql — GENERATED from the live schema (ground truth) 2026-06-10.
-- Applied by lib/db/client.ts ensureFreshSchema() ONLY when a fresh DB is detected
-- (sentinel: feature_claims table absent). No-op on the live/migrated DB.
-- Reproduces the un-journaled delta migrations (0002-0006 + audit-*) deterministically.

CREATE TABLE IF NOT EXISTS component_feedback (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  mc_id        TEXT NOT NULL REFERENCES master_components(id) ON DELETE CASCADE,
  verdict      TEXT NOT NULL,    -- 'good' | 'bad' | 'needs-fix' | 'classification-wrong'
  note         TEXT,
  created_at   INTEGER DEFAULT (unixepoch())
);
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
CREATE TABLE IF NOT EXISTS diagram_artifacts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  kind         TEXT NOT NULL,   -- 'process' | 'topology' | 'data' | 'ux' | 'api'
  mermaid_src  TEXT NOT NULL,
  caption      TEXT,
  position     INTEGER DEFAULT 0,
  updated_at   INTEGER DEFAULT (unixepoch())
);
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
CREATE TABLE IF NOT EXISTS flow_test_runs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id   TEXT NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  status    TEXT NOT NULL,         -- 'passing' | 'failing' | 'not-tested'
  ran_at    INTEGER DEFAULT (unixepoch()),
  ran_by    TEXT,                  -- 'user' | 'automated'
  notes     TEXT
);
CREATE TABLE IF NOT EXISTS inspirations (
  id                            TEXT PRIMARY KEY,
  title                         TEXT NOT NULL,
  source_url                    TEXT NOT NULL,
  source_type                   TEXT NOT NULL,   -- 'dribbble' | 'figma-community' | 'behance' | 'mobbin' | 'other'
  domain                        TEXT,            -- 'dashboard' | 'crm' | 'fintech' | 'hr' | 'iot' | 'ecom' | 'auth' | 'marketing'
  style_tags                    TEXT,            -- JSON array
  thumbnail_url                 TEXT,
  notes                         TEXT,
  matched_master_component_ids  TEXT,            -- JSON array of mc-* ids
  match_confidence              TEXT,            -- 'high' | 'medium' | 'low' | 'unmatched'
  added_at                      INTEGER DEFAULT (unixepoch()),
  used_in_projects              TEXT             -- JSON array of project slugs
);
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
CREATE TABLE IF NOT EXISTS project_docs (
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  doc_name     TEXT NOT NULL,
  body         TEXT NOT NULL,
  source_hash  TEXT,
  mirrored_at  INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (project_slug, doc_name)
);
CREATE TABLE IF NOT EXISTS project_todos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  done         INTEGER DEFAULT 0,
  sort_order   INTEGER DEFAULT 0,
  created_at   INTEGER DEFAULT (unixepoch()),
  updated_at   INTEGER DEFAULT (unixepoch())
);
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

ALTER TABLE adr_index ADD COLUMN anchored_to TEXT;
ALTER TABLE components ADD COLUMN _provenance TEXT;
ALTER TABLE components ADD COLUMN picked_provenance TEXT;
ALTER TABLE components ADD COLUMN skip_reason TEXT;
ALTER TABLE components ADD COLUMN picked_at TEXT;
ALTER TABLE components ADD COLUMN picked_variant TEXT;
ALTER TABLE components ADD COLUMN current_phase TEXT NOT NULL DEFAULT 'PROPOSED';
ALTER TABLE features ADD COLUMN _provenance TEXT;
ALTER TABLE features ADD COLUMN derived_from_sketch_id TEXT;
ALTER TABLE features ADD COLUMN derived_from_nd1_version INTEGER;
ALTER TABLE features ADD COLUMN current_phase TEXT NOT NULL DEFAULT 'PROPOSED';
ALTER TABLE flows ADD COLUMN _provenance TEXT;
ALTER TABLE flows ADD COLUMN derived_from_sketch_id TEXT;
ALTER TABLE flows ADD COLUMN current_phase TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE iteration_items ADD COLUMN source_substring TEXT;
ALTER TABLE iteration_items ADD COLUMN _provenance TEXT;
ALTER TABLE master_components ADD COLUMN primary_file TEXT;
ALTER TABLE master_components ADD COLUMN license_note TEXT;
ALTER TABLE master_components ADD COLUMN library TEXT;
ALTER TABLE master_components ADD COLUMN source_url TEXT;
ALTER TABLE master_components ADD COLUMN quality_grade TEXT;
ALTER TABLE master_components ADD COLUMN ingestion_method TEXT;
ALTER TABLE pages ADD COLUMN _provenance TEXT;
ALTER TABLE pages ADD COLUMN current_phase TEXT NOT NULL DEFAULT 'PROPOSED';
ALTER TABLE projects ADD COLUMN held_code_path TEXT;
ALTER TABLE projects ADD COLUMN inspirations_notes TEXT;
ALTER TABLE projects ADD COLUMN doc1_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN stage_1_completed_at TEXT;
ALTER TABLE projects ADD COLUMN stage_2_completed_at TEXT;
ALTER TABLE projects ADD COLUMN deployed_at TEXT;
ALTER TABLE projects ADD COLUMN deploy_commit_sha TEXT;
ALTER TABLE projects ADD COLUMN last_session_at TEXT;
ALTER TABLE projects ADD COLUMN onboarding_mode TEXT;
ALTER TABLE projects ADD COLUMN onboarding_status TEXT;
ALTER TABLE projects ADD COLUMN onboarding_notes TEXT;
ALTER TABLE projects ADD COLUMN archived INTEGER DEFAULT 0;
ALTER TABLE risk_instances ADD COLUMN _provenance TEXT;
ALTER TABLE risk_instances ADD COLUMN resolved_by_session TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_external_mapping` ON `external_project_mappings` (`tracker_slug`,`external_system`);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_yaml_mirror` ON `yaml_mirror_state` (`project_slug`,`doc_name`);
CREATE INDEX IF NOT EXISTS idx_fpt_feature ON feature_phase_transitions(feature_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_fpt_session ON feature_phase_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_fpt_evidence ON feature_phase_transitions(evidence_kind);
CREATE INDEX IF NOT EXISTS idx_flpt_flow ON flow_phase_transitions(flow_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_flpt_session ON flow_phase_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_ppt_page ON page_phase_transitions(page_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpt_component ON component_phase_transitions(component_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_rlt_risk ON risk_lifecycle_transitions(risk_instance_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_iit_item ON iteration_item_transitions(iteration_item_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_iit_session ON iteration_item_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_id_status ON intent_drafts(status);
CREATE INDEX IF NOT EXISTS idx_id_session ON intent_drafts(core_idea_raw_session_id);
CREATE INDEX IF NOT EXISTS idx_nda_proj_version ON nd1_archive(project_slug, version DESC);
CREATE INDEX IF NOT EXISTS idx_nda_status ON nd1_archive(status);
CREATE INDEX IF NOT EXISTS idx_scr_proj_ran ON sanity_check_runs(project_slug, ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_scr_phase ON sanity_check_runs(phase);
CREATE INDEX IF NOT EXISTS idx_scr_verdict ON sanity_check_runs(verdict);
CREATE INDEX IF NOT EXISTS idx_scr_session ON sanity_check_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_dr_proj ON drift_resolutions(project_slug, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_dr_unresolved ON drift_resolutions(project_slug) WHERE resolution IS NULL;
CREATE INDEX IF NOT EXISTS idx_se_proj_at ON skill_events(project_slug, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_se_event_type ON skill_events(event_type);
CREATE INDEX IF NOT EXISTS idx_se_session ON skill_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tr_proj ON test_runs(project_slug, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_tr_commit ON test_runs(commit_sha);
CREATE INDEX IF NOT EXISTS idx_tr_result ON test_runs(result);
CREATE INDEX IF NOT EXISTS idx_da_proj ON deploy_artifacts(project_slug, deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_da_commit ON deploy_artifacts(commit_sha);
CREATE INDEX IF NOT EXISTS idx_fc_feature ON feature_claims(feature_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fc_unreconciled ON feature_claims(feature_id) WHERE reconciled_with = 'unreconciled';
CREATE INDEX IF NOT EXISTS idx_fc_session ON feature_claims(claimed_by_session);
CREATE INDEX IF NOT EXISTS idx_master_components_library ON master_components(library);
CREATE INDEX IF NOT EXISTS idx_master_components_quality ON master_components(quality_grade);
CREATE INDEX IF NOT EXISTS idx_inspirations_domain      ON inspirations(domain);
CREATE INDEX IF NOT EXISTS idx_inspirations_source_type ON inspirations(source_type);
CREATE INDEX IF NOT EXISTS idx_inspirations_confidence  ON inspirations(match_confidence);
CREATE INDEX IF NOT EXISTS idx_project_docs_slug ON project_docs(project_slug);
CREATE INDEX IF NOT EXISTS idx_project_todos_slug ON project_todos(project_slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_diagram_artifacts_proj_kind_pos
  ON diagram_artifacts(project_slug, kind, position);
CREATE INDEX IF NOT EXISTS idx_component_feedback_proj ON component_feedback(project_slug);
CREATE INDEX IF NOT EXISTS idx_component_feedback_mc   ON component_feedback(mc_id);
CREATE INDEX IF NOT EXISTS idx_flow_test_runs_flow ON flow_test_runs(flow_id);

-- Visual-QA intake (Task 1, 2026-07-23) — mirrors 0007_report_comments.sql for fresh clones.
CREATE TABLE IF NOT EXISTS report_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  comment_uid TEXT NOT NULL,
  project_slug TEXT NOT NULL,
  page TEXT, url TEXT, title TEXT, target TEXT,
  locator TEXT, provenance TEXT, category TEXT,
  screenshot_path TEXT, selection TEXT,
  text TEXT NOT NULL, ts TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS report_comments_report_id_idx ON report_comments(report_id);
-- 0014 - written-off anti-gaslight violations (2026-08-27, Plan B item B4).
--
-- HAND-WRITTEN, hand-journaled (same discipline as 0007-0013). Do NOT run
-- drizzle-kit generate/migrate.
--
-- WHY. A violation could be true, understood, and deliberately accepted - and there was
-- nowhere to say so. adr-048 wrote off three July deploys with a stated reason and recorded
-- the consequence plainly: "There is no 'written off with a reason' state in the anti-gaslight
-- tool: R5 is a pure query over two tables, so the only ways to clear it are to fabricate test
-- runs or destroy deploy history. Both are worse than a red mark." So the violation stays red
-- forever, and a permanent red trains people to stop reading red - which is the failure this
-- whole subsystem exists to prevent.
--
-- WHAT THIS IS NOT. It is not a way to make a violation go away. A written-off row is still
-- reported; it moves to a separate `written_off` list with its reason and its ADR, and it stops
-- inflating the count. The evidence is preserved, not deleted. Requiring an ADR id is the point:
-- writing one off costs a decision record, which is more friction than fixing it deserves to be.
--
-- Keyed on (rule, project_slug, item_id) so it generalises to any rule, not just R5. item_id is
-- TEXT because rules key on different id shapes (deploy_artifacts.id, feature ids, commit shas).

CREATE TABLE IF NOT EXISTS violation_writeoffs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  rule           TEXT NOT NULL,
  project_slug   TEXT NOT NULL,
  item_id        TEXT NOT NULL,
  reason         TEXT NOT NULL,
  adr_id         TEXT NOT NULL,
  written_off_at TEXT NOT NULL DEFAULT (datetime('now')),
  written_off_by TEXT,
  UNIQUE (rule, project_slug, item_id)
);

CREATE INDEX IF NOT EXISTS idx_violation_writeoffs_lookup
  ON violation_writeoffs (rule, project_slug);
