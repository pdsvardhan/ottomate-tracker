-- Iteration #5 E.6: seed ottomate's 5 starter architecture diagrams + anchor ADRs.

BEGIN;

DELETE FROM diagram_artifacts WHERE project_slug = 'ottomate';

INSERT INTO diagram_artifacts (project_slug, kind, mermaid_src, caption, position) VALUES
  ('ottomate', 'process',
   'flowchart TD
  S0[Stage 0: intake — sanity + journey detect + ND1]
  S1[Stage 1: SO1 docs — features + flows + pages + data + risks + ADRs]
  S2[Stage 2: UI + components — master plan + Stage 2.4 picker]
  S3[Stage 3: build + deploy — scaffold + verifier + tests]
  S4[Stage 4: iterate — raw text -> classify -> lock -> build -> verify -> integrate]
  S0 --> S1 --> S2 --> S3 --> S4
  S4 -.loop.-> S4',
   'Ottomate 5-stage pipeline', 0),

  ('ottomate', 'topology',
   'flowchart LR
  User[User / Claude]
  Skill[Ottomate skill plugin]
  subgraph VAULT7A
    direction TB
    API[Ottomate Next.js :8110]
    DB[(SQLite ottomate.db)]
    FS[/asset-library/components/]
    Gitea[Gitea :3300]
    Cloudflare[Cloudflare Tunnel]
  end
  User --> Skill
  Skill --> API
  Skill -. SSH .-> Gitea
  API --> DB
  API --> FS
  API --> Gitea
  Cloudflare -. routes ottomate.vault7a.xyz .-> API',
   'System topology — skill, API container, and storage', 0),

  ('ottomate', 'data',
   'erDiagram
  projects ||--o{ features : has
  projects ||--o{ flows : has
  projects ||--o{ pages : has
  projects ||--o{ iterations : has
  projects ||--o{ project_todos : has
  projects ||--o{ project_docs : has
  projects ||--o{ adr_index : tracks
  projects ||--o{ diagram_artifacts : renders
  pages ||--o{ components : contains
  iterations ||--o{ iteration_items : contains
  iteration_items ||--o| verification_reports : produces
  master_components ||--o{ components : "picked as"
  master_components ||--o{ component_feedback : graded
  master_components ||--o{ inspirations : implements',
   'Core entities and relationships (top tables only)', 0),

  ('ottomate', 'ux',
   'flowchart LR
  Land[Open / projects] --> Pick[Pick a project]
  Pick --> Over[Project Overview]
  Over --> Pipe[Read pipeline progress]
  Over --> Pick2[Click into components-pick]
  Over --> Sub[Click + Submit a report]
  Sub --> Inbox[/inbox]
  Inbox --> Gate[Lock-in gate at /iterations/N]
  Gate --> Build[Coder + verifier dispatch]
  Build --> Trace[Trace report]
  Trace --> Over',
   'User flow — happy path from landing to trace report', 0),

  ('ottomate', 'api',
   'flowchart TB
  subgraph Stage0_1[Stage 0-1 APIs]
    A1[GET /api/projects]
    A2[GET /api/projects/slug/context-packet]
    A3[POST /api/projects/slug/intent-draft]
  end
  subgraph Stage2[Stage 2 APIs]
    B1[GET /api/master-components]
    B2[GET /api/components/id/component-options]
    B3[POST /api/components/id/pick]
    B4[GET /api/projects/slug/components-pick/status]
  end
  subgraph Stage4[Stage 4 APIs]
    C1[POST /api/projects/slug/reports]
    C2[POST /api/reports/id/classify]
    C3[POST /api/iterations/id/lock]
    C4[POST /api/iterations/id/items/id/build-status]
    C5[POST /api/iterations/id/items/id/verifier-result]
    C6[POST /api/iterations/id/integrate]
  end',
   'API surface grouped by stage', 0);

-- Anchor ADRs to the diagram they shaped (ADR-010).
UPDATE adr_index SET anchored_to = 'topology' WHERE id IN (
  'adr-001-no-merge-tasks', 'adr-002-localhost-bound', 'adr-003-bookworm-not-alpine'
);
UPDATE adr_index SET anchored_to = 'api' WHERE id = 'adr-004-bearer-auth';
UPDATE adr_index SET anchored_to = 'data' WHERE id IN (
  'adr-005-risks-resolve-not-delete', 'adr-007-migration-first-bootstrap'
);
-- Leave the rest (adr-006 trivy, adr-008 build plan, adr-009/010/011) at NULL
-- so they render under "General decisions" on the Architecture tab.

COMMIT;
