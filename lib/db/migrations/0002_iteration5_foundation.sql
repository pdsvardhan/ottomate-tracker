-- Iteration #5 — Foundation tables + columns for the Spotlight Glass UI redesign.
-- Applied 2026-05-19. See ITERATION-5-UI-PLAN.md section 4.

-- 1. ADR anchoring for the Architecture-tab pairing (ADR-010)
ALTER TABLE adr_index ADD COLUMN anchored_to TEXT;
--> statement-breakpoint

-- 2. Public docs ingest target (ADR-011)
CREATE TABLE IF NOT EXISTS project_docs (
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  doc_name     TEXT NOT NULL,
  body         TEXT NOT NULL,
  source_hash  TEXT,
  mirrored_at  INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (project_slug, doc_name)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_project_docs_slug ON project_docs(project_slug);
--> statement-breakpoint

-- 3. Per-project to-do list (E.3)
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

-- 4. Mermaid + diagram artifacts for the Architecture tab (E.6)
CREATE TABLE IF NOT EXISTS diagram_artifacts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  kind         TEXT NOT NULL,   -- 'process' | 'topology' | 'data' | 'ux' | 'api'
  mermaid_src  TEXT NOT NULL,
  caption      TEXT,
  position     INTEGER DEFAULT 0,
  updated_at   INTEGER DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS uq_diagram_artifacts_proj_kind_pos
  ON diagram_artifacts(project_slug, kind, position);
--> statement-breakpoint

-- 5. Per-project component feedback (B.6)
CREATE TABLE IF NOT EXISTS component_feedback (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_slug TEXT NOT NULL REFERENCES projects(slug) ON DELETE CASCADE,
  mc_id        TEXT NOT NULL REFERENCES master_components(id) ON DELETE CASCADE,
  verdict      TEXT NOT NULL,    -- 'good' | 'bad' | 'needs-fix' | 'classification-wrong'
  note         TEXT,
  created_at   INTEGER DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_component_feedback_proj ON component_feedback(project_slug);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_component_feedback_mc   ON component_feedback(mc_id);
--> statement-breakpoint

-- 6. Per-flow test runs (E.9)
CREATE TABLE IF NOT EXISTS flow_test_runs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id   TEXT NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  status    TEXT NOT NULL,         -- 'passing' | 'failing' | 'not-tested'
  ran_at    INTEGER DEFAULT (unixepoch()),
  ran_by    TEXT,                  -- 'user' | 'automated'
  notes     TEXT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_flow_test_runs_flow ON flow_test_runs(flow_id);
