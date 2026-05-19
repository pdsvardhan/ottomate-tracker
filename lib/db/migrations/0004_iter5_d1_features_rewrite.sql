-- Iteration #5 D.1: rewrite ottomate features as real user-facing capabilities.
-- Removes the 14 feat-phase-* internal build entries (item 22). Keeps the 5
-- already-meaningful features (anti-gaslighting / verifier / pack-up / fts5 /
-- bearer-auth) and adds 13 capability-level rows that describe what the
-- ottomate website actually does for its audience (recruiters / friends / public).

BEGIN;

-- Clear the linked join rows for the phase entries before deleting them.
DELETE FROM feature_phase_transitions
  WHERE feature_id IN (
    SELECT id FROM features
    WHERE project_slug = 'ottomate' AND id LIKE 'feat-phase-%'
  );

DELETE FROM flow_features
  WHERE feature_id IN (
    SELECT id FROM features
    WHERE project_slug = 'ottomate' AND id LIKE 'feat-phase-%'
  );

DELETE FROM features
  WHERE project_slug = 'ottomate' AND id LIKE 'feat-phase-%';

-- Real capabilities (status: 'done' for shipped, 'in-progress' for iter-5 partial,
-- 'planned' for queued). Description column = short_description per the schema.
INSERT INTO features (id, project_slug, title, short_description, type, status, priority, size)
VALUES
  ('feat-project-lifecycle',
   'ottomate',
   'Project lifecycle tracking',
   'Per-project Stage 0-4 pipeline progress with done/remaining task counts. Renders as the PipelineProgress widget on every project overview.',
   'ui', 'in-progress', 'P1', 'medium'),

  ('feat-component-catalog',
   'ottomate',
   'Component catalog browser',
   '193 master_components in 18 categories, filterable by library / quality / tag / source. Each card shows library + quality badges + tags. Spotlight Glass cards on /components-browser.',
   'ui', 'done', 'P1', 'medium'),

  ('feat-component-live-preview',
   'ottomate',
   'Live component preview',
   'Per-component detail page renders HTML bundles in an iframe srcdoc; TSX entries show source code with file tabs. Sandpack integration for TSX live preview is deferred.',
   'ui', 'in-progress', 'P1', 'small'),

  ('feat-component-crud',
   'ottomate',
   'Component catalog CRUD',
   'Add modal on /components-browser writes new master_components rows + writes source code to /asset-library/components/<id>/<file>. PUT + DELETE backend live; Edit/Delete UI lands with the sandpack follow-up.',
   'ui', 'in-progress', 'P1', 'small'),

  ('feat-stage-2-4-picker',
   'ottomate',
   'Stage 2.4 component picker',
   'Per-project /components-pick page renders all unpicked component slots grouped by page; each slot surfaces 3 ranked master_components for click-to-pick or skip-with-reason. Stage 2 -> 3 gate enforces unresolved=0.',
   'ui', 'done', 'P1', 'medium'),

  ('feat-stage-4-4-5-iteration-pick',
   'ottomate',
   'Stage 4.4.5 iteration-time component pick',
   'Iteration items with target_kind=component get the same ranked-options + pick flow scoped to the item. Backend endpoints live; UI surfacing inside iteration detail page is pending E.7 redesign.',
   'backend', 'done', 'P1', 'small'),

  ('feat-inspirations-gallery',
   'ottomate',
   'Visual inspirations gallery',
   '/inspirations: 27 Dribbble + Figma references with style tags, domain, matched master_components, and click-through detail page. Stage 2.2 UI master plan pulls from this catalog.',
   'ui', 'done', 'P1', 'small'),

  ('feat-component-feedback',
   'ottomate',
   'Per-project component feedback',
   'On each component detail page, users mark good/bad/needs-fix/classification-wrong from a specific project context. History is project-scoped + influences Stage 2.4 ranking.',
   'ui', 'done', 'P1', 'small'),

  ('feat-bug-inbox',
   'ottomate',
   'Cross-project bug inbox',
   'Submit a report (raw text + optional flow_id) via /inbox or /api/projects/<slug>/reports. Reports route through Stage 4 classifier into structured iteration items.',
   'ui', 'done', 'P1', 'small'),

  ('feat-iteration-lock-in-gate',
   'ottomate',
   'Iteration lock-in gate',
   'Anti-gaslight bridge at Stage 4.3: raw report -> classifier extracts items with source_substring proof -> user edits / locks -> code begins. Items at /iterations/<id> until locked.',
   'mixed', 'done', 'P1', 'large'),

  ('feat-architecture-diagrams',
   'ottomate',
   'Architecture diagrams (Mermaid)',
   'Per-project /architecture tab renders DB-backed Mermaid diagrams grouped by kind (process / topology / data / ux / api). Falls back to filesystem .mmd files for legacy projects.',
   'ui', 'in-progress', 'P1', 'medium'),

  ('feat-adr-tracking',
   'ottomate',
   'ADR tracking with diagram anchoring',
   'Decision records keyed by anchored_to (process / topology / data / ux / api / NULL). Cards pair with the diagram they shaped on the Architecture tab.',
   'ui', 'in-progress', 'P1', 'small'),

  ('feat-public-docs-mirror',
   'ottomate',
   'public_docs/ pack-up mirror',
   'Per repo public_docs/{architecture-summary,feature-spec-public,adr-summary}.md gets ingested into the project_docs table on pack-up. Surfaced as a Docs rail on Overview.',
   'mixed', 'planned', 'P2', 'medium'),

  ('feat-drift-watcher',
   'ottomate',
   'Drift watcher (manual YAML edits)',
   'Watches each /repos/<slug>/ottomate/ for manual edits between sessions; surfaces a Drift banner on the project page so the user can reconcile DB <-> YAML before code runs.',
   'backend', 'done', 'P2', 'small'),

  ('feat-spotlight-glass-ui',
   'ottomate',
   'Spotlight Glass design system',
   'Cross-app design language: glass cards with cursor-following spotlight, gradient typography, dot+aurora background. Shared components at components/ui/ (SpotlightCard, Badge, PageHeader, FilterBar, EmptyState, Modal, TabsBar).',
   'ui', 'in-progress', 'P1', 'large');

COMMIT;
