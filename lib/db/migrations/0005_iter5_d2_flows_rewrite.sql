-- Iteration #5 D.2: rewrite ottomate flows as granular UI-level user flows.
-- Replaces the 20 vague flows (item 20) with ~50 concrete clickable journeys
-- organized by page. Each flow is a single user action with an expected outcome —
-- granular enough to test and report bugs against. (User's transcript: "view all
-- the projects, view the overview statistics, open the home page of projects,
-- landing page of projects tab, click on individual project, and in each individual
-- project, multiple tabs, and in some tabs, there might be interactive elements".)

BEGIN;

-- Clean up join + parent linkages first.
DELETE FROM flow_features WHERE flow_id IN (SELECT id FROM flows WHERE project_slug = 'ottomate');
DELETE FROM flows WHERE project_slug = 'ottomate';

INSERT INTO flows (id, project_slug, title, trigger, expected_outcome, type, priority) VALUES
  -- /projects landing
  ('flow-projects-grid', 'ottomate', 'View projects grid', 'Open /', 'Project cards render with name + tagline + status badge + tags.', 'ui', 'important'),
  ('flow-projects-status-strip', 'ottomate', 'Read status breakdown strip', 'Scan top of /', 'Pill row shows count per lifecycle (building / shipped / ideating / maintained / archived).', 'ui', 'important'),
  ('flow-projects-activity-strip', 'ottomate', 'Read recent activity strip', 'Scan / for the activity panel', 'Last 5 events render with timestamp + actor + target.', 'ui', 'important'),
  ('flow-projects-category-filter', 'ottomate', 'Filter projects by personal/cv', 'Click personal or cv chip on /', 'Grid filters to projects with matching tag in tags JSON column.', 'ui', 'important'),
  ('flow-projects-click-card', 'ottomate', 'Click a project card to open overview', 'Click any card on /', 'Routes to /projects/<slug> overview tab.', 'ui', 'important'),

  -- /projects/<slug> overview
  ('flow-project-overview-pipeline', 'ottomate', 'Read pipeline progress widget', 'Open /projects/<slug>', 'PipelineProgress widget shows 5 stages with done/remaining count per stage.', 'ui', 'important'),
  ('flow-project-overview-key-context', 'ottomate', 'Read key-context panels', 'Scroll Overview', 'Three glass cards render must-haves / non-goals / preferences from projects.preferences JSON.', 'ui', 'important'),
  ('flow-project-overview-public-url', 'ottomate', 'Open public URL', 'Click public_url in Overview header', 'Opens deployed site in new tab.', 'ui', 'important'),
  ('flow-project-overview-repo-url', 'ottomate', 'Open repo link', 'Click repository_url in Overview', 'Opens Gitea repo in new tab.', 'ui', 'important'),
  ('flow-project-overview-todo', 'ottomate', 'Add a project todo', 'Type into "+ add task" input on Overview', 'New row inserted in project_todos; checklist re-renders.', 'ui', 'important'),
  ('flow-project-overview-todo-toggle', 'ottomate', 'Toggle a todo as done', 'Click checkbox on a todo row', 'project_todos.done flips; row gets struck-through styling.', 'ui', 'important'),
  ('flow-project-overview-activity-preview', 'ottomate', 'Read activity preview', 'Scroll bottom of Overview', 'Last 7 ActivityItem rows render with verb + target.', 'ui', 'important'),
  ('flow-project-overview-docs-rail', 'ottomate', 'Browse public_docs rail', 'Click the Docs rail tabs', 'architecture-summary / feature-spec-public / adr-summary bodies render inline.', 'ui', 'important'),
  ('flow-project-overview-blockers', 'ottomate', 'Read blockers panel', 'Scan blockers card on Overview', 'Open risks (risk_instances.status=open) render with severity colour.', 'ui', 'important'),

  -- /projects/<slug>/architecture
  ('flow-architecture-process', 'ottomate', 'Read process flow diagram', 'Open Architecture tab', 'First Mermaid diagram (kind=process) renders.', 'ui', 'important'),
  ('flow-architecture-topology', 'ottomate', 'Read system topology diagram', 'Scroll Architecture', 'topology kind diagram renders + adjacent ADR cards anchored_to=topology.', 'ui', 'important'),
  ('flow-architecture-data', 'ottomate', 'Read data model diagram', 'Scroll Architecture (only if has_data_layer)', 'data kind diagram renders; section hides when no data layer.', 'ui', 'important'),
  ('flow-architecture-adr-expand', 'ottomate', 'Expand an ADR card', 'Click an ADR card', 'Card expands to show body markdown rendered.', 'ui', 'important'),

  -- /projects/<slug>/iterations
  ('flow-iterations-list', 'ottomate', 'Browse iterations list', 'Open Iterations tab', 'All iterations render as SpotlightCards with status + item counts.', 'ui', 'important'),
  ('flow-iterations-click-card', 'ottomate', 'Open an iteration detail', 'Click an iteration card', 'Routes to /iterations/<id> lock-in gate or trace report.', 'ui', 'important'),
  ('flow-iterations-submit-cta', 'ottomate', 'Click submit-report CTA from iterations tab', 'Click "+ Submit a report" on iterations tab', 'Routes to /inbox?action=new with SubmitBugModal open.', 'ui', 'important'),

  -- /projects/<slug>/components-pick (Stage 2.4)
  ('flow-pick-status-rollup', 'ottomate', 'Read picker status rollup', 'Open /projects/<slug>/components-pick', 'Header shows picked / skipped / unresolved / total counts + ready_for_stage_3 badge.', 'ui', 'important'),
  ('flow-pick-card', 'ottomate', 'Pick a component for a slot', 'Click one of 3 SpotlightCards in a slot', 'POST /api/components/<id>/pick; slot card transitions to picked state with picked badge.', 'ui', 'important'),
  ('flow-pick-skip', 'ottomate', 'Skip a slot with a reason', 'Click "Skip with reason" + enter >=10 chars + save', 'POST /api/components/<id>/pick {skip_reason}; slot transitions to skipped state.', 'ui', 'important'),

  -- /iterations/<id>
  ('flow-iteration-detail-items', 'ottomate', 'View extracted items at lock gate', 'Open /iterations/<id>', 'All iteration_items render with source_substring proof + confidence.', 'ui', 'important'),
  ('flow-iteration-detail-lock', 'ottomate', 'Lock the iteration', 'Click "Lock & build" on /iterations/<id>', 'POST /api/iterations/<id>/lock; iteration.status -> building; coder dispatch starts.', 'ui', 'important'),
  ('flow-iteration-detail-edit-item', 'ottomate', 'Edit an item before lock', 'Click edit on an item, change fields, save', 'PATCH /api/iterations/<id>/items/<itemId>; user_edited=true.', 'ui', 'important'),
  ('flow-iteration-detail-reject-item', 'ottomate', 'Reject an item before lock', 'Click reject on an item, confirm', 'DELETE soft-rejects (status=rejected); item still in trace report.', 'ui', 'important'),
  ('flow-iteration-detail-trace', 'ottomate', 'Read trace report post-integrate', 'Open /iterations/<id> after integrate', 'Trace report block renders with original message + locked items + per-item evidence.', 'ui', 'important'),

  -- /inbox
  ('flow-inbox-list', 'ottomate', 'Browse the bug inbox', 'Open /inbox', 'Report cards render filtered to current status tab (default pending).', 'ui', 'important'),
  ('flow-inbox-filter-status', 'ottomate', 'Filter inbox by status', 'Click a status pill', 'Page re-fetches with ?status=<x>; cards re-render.', 'ui', 'important'),
  ('flow-inbox-submit-modal', 'ottomate', 'Submit a bug via modal', 'Click "+ Submit bug", fill form, click Submit', 'POST /api/projects/<slug>/reports; modal closes; inbox refreshes with new pending row.', 'ui', 'important'),

  -- /coverage
  ('flow-coverage-heatmap', 'ottomate', 'Read coverage heatmap', 'Open /coverage', 'Page-by-flow matrix renders; cells colour-coded passing/failing/not-tested.', 'ui', 'important'),
  ('flow-coverage-cell-drill', 'ottomate', 'Drill into a coverage cell', 'Click a heatmap cell', 'Flow test-run history renders for that flow.', 'ui', 'important'),

  -- /components-browser
  ('flow-components-grid', 'ottomate', 'Browse the components catalog', 'Open /components-browser', '193 SpotlightCards render across 18 category sections.', 'ui', 'important'),
  ('flow-components-search', 'ottomate', 'Search the catalog', 'Type into search input + click Filter', 'Filtered grid re-renders matching name / id / description / tags / library.', 'ui', 'important'),
  ('flow-components-filter-library', 'ottomate', 'Filter components by library', 'Select a library in dropdown + Filter', 'Grid filters to that library only; chip count updates.', 'ui', 'important'),
  ('flow-components-filter-quality', 'ottomate', 'Filter components by quality grade', 'Select A / A+B / C in quality dropdown', 'Grid filters by quality_grade.', 'ui', 'important'),
  ('flow-components-jump-category', 'ottomate', 'Jump to a category', 'Click a category chip at the top', 'Page anchors to #cat-<id>; category section in view.', 'ui', 'important'),
  ('flow-components-add', 'ottomate', 'Add a new component to catalog', 'Click "+ Add component", fill form, Save', 'POST /api/master-components; new card appears in the right category; source file written to /asset-library/components/<id>/<file>.', 'ui', 'important'),
  ('flow-components-click-card', 'ottomate', 'Open a component detail', 'Click a card on /components-browser', 'Routes to /components-browser/<id>; live preview tab loaded.', 'ui', 'important'),

  -- /components-browser/<id>
  ('flow-component-detail-preview', 'ottomate', 'Toggle preview tab', 'Click Preview tab', 'iframe srcdoc renders the HTML bundle (or shows the deferred-state stub for TSX).', 'ui', 'important'),
  ('flow-component-detail-source', 'ottomate', 'Browse source code tabs', 'Click Source tab, then a file tab', 'File content renders in <pre>; file tabs cycle through index.tsx / styles.css / etc.', 'ui', 'important'),
  ('flow-component-detail-feedback', 'ottomate', 'Record component feedback', 'In FeedbackWidget pick project + verdict + optional note, click Record', 'POST /api/component-feedback; history list appends new row.', 'ui', 'important'),

  -- /inspirations
  ('flow-inspirations-grid', 'ottomate', 'Browse the inspirations gallery', 'Open /inspirations', '27 inspiration SpotlightCards render with thumbnails + style tags.', 'ui', 'important'),
  ('flow-inspirations-filter-domain', 'ottomate', 'Filter inspirations by domain', 'Select a domain in dropdown + Filter', 'Grid filters to that domain (e.g. dashboard/finance).', 'ui', 'important'),
  ('flow-inspirations-filter-source', 'ottomate', 'Filter inspirations by source type', 'Select dribbble / figma-community / etc.', 'Grid filters by source_type.', 'ui', 'important'),
  ('flow-inspirations-click-card', 'ottomate', 'Open an inspiration detail', 'Click an inspiration card', 'Routes to /inspirations/<id> with matched master_components list.', 'ui', 'important'),
  ('flow-inspiration-detail-matched', 'ottomate', 'Open a matched master_component from inspiration', 'Click a matched-component card on /inspirations/<id>', 'Routes to /components-browser/<mc_id>.', 'ui', 'important'),

  -- Backend flows (Stage 4 mini-pipeline)
  ('flow-classify-report', 'ottomate', 'Skill classifies a raw report', 'Skill invokes POST /api/reports/<id>/classify with extracted items', 'Server creates an iteration row + iteration_items[]; source_substring stored per item.', 'backend', 'important'),
  ('flow-verifier-result', 'ottomate', 'Verifier sub-agent posts a result', 'Verifier sub-agent calls POST /api/iterations/<id>/items/<itemId>/verifier-result', 'verification_reports row inserted; item.verifier_result updated; recommendation captured.', 'backend', 'important'),
  ('flow-integrate', 'ottomate', 'Skill integrates a completed iteration', 'POST /api/iterations/<id>/integrate', 'All items must be verified; iteration.integrated_at set; trace_report blob saved.', 'backend', 'important'),
  ('flow-pack-up-mirror', 'ottomate', 'Pack-up writes YAML mirrors', 'npm run mirror:write -- <slug>', 'flows.yaml + features.yaml + ... regenerated from DB; hash-checked, skipped if unchanged.', 'backend', 'important'),
  ('flow-drift-watcher', 'ottomate', 'Watcher detects YAML drift', 'User manually edits /repos/<slug>/ottomate/<doc>.yaml', 'Chokidar fires; DriftBanner appears on next /projects/<slug> load with reconcile dialog.', 'automated', 'important');

COMMIT;
