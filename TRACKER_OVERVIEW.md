# Ottomate Tracker — Detailed Design Overview

The companion website to `/ottomate` skill. Renamed from "tracker v3" to "Ottomate" per user direction. This doc is the comprehensive design overview.

---

## What it is

A local Next.js web app that:
- Stores all SO1/SO2/SO3 docs across all VAULT7A web projects (DB canonical)
- Surfaces project state via clean UI (List + Detail + Edit per doc, plus cross-cutting features)
- Hosts the Stage 4 lock-in gate UI (the anti-gaslighting bridge)
- Provides REST API endpoints for the skill to read + write
- Serves as interview prep showcase (user goes to interviews soon)

**Replaces** the existing `tracker-v2` at `/opt/homeserver/tracker-v2/`. Cutover in Phase 13.

---

## Where everything lives

| Concern | Location |
|---|---|
| Code | `/opt/homeserver/ottomate/` (server) |
| Repo | `git.vault7a.xyz/pdsv/ottomate-tracker-v3` |
| Container name | `ottomate` |
| Internal port | 8110 (`127.0.0.1:8110:3000` — localhost-bound per Codex P1 #8) |
| Public domain | `ottomate.vault7a.xyz` (DNS set up in Phase 13) |
| DB | `/opt/homeserver/ottomate/data/ottomate.db` (SQLite via better-sqlite3) |
| Bearer token | `/opt/homeserver/ottomate/.token` (gitignored, mode 600) |

---

## Stack (all free / self-hostable)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16+ (App Router, RSC) | Modern, file-based routing, great DX |
| Language | TypeScript strict | Catches schema mismatches at compile |
| Styling | Tailwind v4 | Matches existing portfolio aesthetic |
| Components | shadcn-style (copy-paste, owned) | No external library upgrade pain |
| Theme | Dark + light (default dark) | User preference |
| Fonts | Outfit + JetBrains Mono | Matches user's existing projects |
| ORM | drizzle-orm | Lightweight, type-safe, code-first |
| DB | better-sqlite3 (SQLite) | Local, fast, single-user |
| Validation | zod | Runtime validation matching TS types |
| Watcher | chokidar | Watch project repos for git pulls + sync |
| Markdown | marked | ADR rendering |
| Charts | recharts | Coverage Dashboard, Risk Heatmap |
| Diagrams | mermaid (CDN-loaded) | Architecture diagrams in tracker UI |

**Deploy:** Docker Compose, NPM proxy host, Cloudflare Tunnel ingress.

---

## Database schema (~30 tables)

Located at `lib/db/schema.ts`. Codex P0/P1/P2 + Round 2 fixes applied.

### Cross-project tables
- `risks_catalog` — global risk type definitions (50 seeded)
- `master_components` — central UI asset library (15 seeded)
- `external_project_mappings` — tracker slug ↔ external system slug

### Per-project canonical tables (FK to `projects.slug`)

**Doc 1 (Project Overview):**
- `projects` (15 fields incl. preferences JSON)
- `project_non_goals` (1:N)
- `project_success_criteria` (1:N)

**Doc 2 (User Flows):**
- `flows` (parent_id self-ref for nesting)
- `flow_steps` (ordered, actor/action/result triples)
- `flow_pre_conditions` (1:N)
- `flow_edge_cases` (1:N)
- `flow_features` (M:N join with features)
- `flow_pages` (M:N join with pages)

**Doc 3 (Features):**
- `features` (parent_id self-ref)
- `feature_acceptance_criteria` (1:N)
- `feature_dependencies` (M:N self-FK)

**Doc 4 (UI Pages + Components):**
- `pages`
- `page_entry_points` (1:N)
- `page_features` (M:N)
- `components` (FK to pages)
- `component_variants` (1:N)

**Doc 5 (Data — split per Codex P1 #9):**
- `project_data_concepts` (Stage 1 conceptual)
- `data_sources` (with R1-R4 recurring fetch fields)
- `project_data_contracts` (Stage 2 contract)

**Doc 7 (Risks — Codex P1 #10 + P2 #17):**
- `risk_instances` (with `resolved` status + `resolved_at` + `resolution_summary`, hidden by default)
- Per-target joins (NO polymorphic FKs):
  - `risk_instance_features`
  - `risk_instance_pages`
  - `risk_instance_integrations` (TODO add)
  - `risk_instance_secrets` (TODO add)
  - `risk_instance_data_tables` (TODO add)
- `policies` (1:1 per project)
- `third_party_services` (1:N)
- `auth_config` (1:1)
- `project_secrets` (1:N — names + storage location only, NO VALUES)

**Doc 8 (ADRs):**
- `adr_index` (lightweight; full markdown body in `decisions/<file>.md` in git)
- `adr_features` (M:N)
- `adr_risks` (M:N)

### Stage 2 outputs
- `ui_master_plans` (1:1 per project)
- `tech_stacks` (1:1)

### Stage 4 (iterations)
- `reports` (raw user text — `source` field per Codex P2 #16)
- `iterations` (with `lock_in_audit` JSON per Codex P2 #14, `pending_user_review` enum per P2 #15)
- `iteration_items` (with `user_test_completed_at` timestamp per Codex Round 2)

### Bug-tracking (NOT git-mirrored)
- `bugs` (linked to flows + iteration_items)
- `feature_requests` (same shape, different status enum)

### Verifier reports (Codex P0 #4)
- `verification_reports` (input contract: locked items + acceptance criteria + expected artifacts + branch_diff)

### Sync state (Codex P0 #2)
- `yaml_mirror_state` (per-doc per-project hash for drift detection)
- `schema_version` (boot validation)

---

## API endpoints (~40)

All under `${TRACKER_API_BASE}` (default `http://127.0.0.1:8110`).

**Per-doc CRUD pattern (consistent across all SO1 docs):**
```
GET    /api/projects                                List
GET    /api/projects/[slug]                         Detail
POST   /api/projects                                Create (bearer required)
PATCH  /api/projects/[slug]                         Update (bearer required)
DELETE /api/projects/[slug]                         Soft-archive (bearer required)
```

Same pattern for: flows, features, pages, components, data, risks, decisions.

**Stage 4 endpoints:**
```
POST   /api/projects/[slug]/reports                 Submit raw text
POST   /api/reports/[id]/classify                   Manual analyze trigger
GET    /api/iterations/[id]                         View items
PATCH  /api/iterations/[id]/items/[itemId]          Edit item
POST   /api/iterations/[id]/items                   Add user-authored item
POST   /api/iterations/[id]/items/[itemId]/split    Split into 2+
DELETE /api/iterations/[id]/items/[itemId]          Reject
POST   /api/iterations/[id]/lock                    🔴 The lock-in moment
GET    /api/iterations/[id]/status                  Skill polls during build
POST   /api/iterations/[id]/items/[itemId]/build-status
POST   /api/iterations/[id]/items/[itemId]/verifier-result
POST   /api/iterations/[id]/integrate
GET    /api/iterations/[id]/trace                   Trace report
POST   /api/iterations/[id]/cancel
```

**Cross-cutting:**
```
GET    /api/inbox                                   Pending reports across projects
GET    /api/coverage                                Test coverage dashboard
GET    /api/graph/[slug]                            Relationships graph
GET    /api/search?q=                               FTS5 cross-doc search
GET    /api/risks-heatmap                           Risk visualization
GET    /api/components                              Master components browser
GET    /api/sanity-check?stage=                     Run DB-level sanity checks
POST   /api/pack-up                                 Skill triggers DB→YAML sync
POST   /api/backup                                  DB snapshot (before destructive ops)
GET    /api/projects/[slug]/context-packet?item_id=&scope=lite|standard|full   (Codex Round 2 — token saver)
```

**Webhook endpoints (optional, for tasks-dashboard bridge):**
```
POST   /api/external-task-completed                 Webhook FROM tasks-dashboard
POST   /api/skill-events                            Generic webhook for skill state
```

---

## Authentication (Codex Round 2 #2)

- **GET endpoints:** no auth (read-only; localhost-bound + CF Tunnel external)
- **POST/PATCH/DELETE:** `Authorization: Bearer <TRACKER_API_TOKEN>` header REQUIRED
- **Webhook outbound (to tasks-dashboard):** uses same bearer token

**Token management:**
```bash
# Generate at install
openssl rand -hex 32 > /opt/homeserver/ottomate/.token
chmod 600 /opt/homeserver/ottomate/.token

# Mounted as Docker secret in compose
# Skill reads from credentials.md / env var TRACKER_API_TOKEN
# Tasks-dashboard side: stores as TRACKER_API_TOKEN_OUTBOUND for webhook
```

Rotation: quarterly, or on compromise.

---

## UI routes (Phase 4-8 of build)

### `/` — Project Dashboard
Cards grid of projects. Filters (status / lifecycle / scope / hosting). Sort. Search.

### `/project/[slug]` — Project Detail
Tabbed view per Doc:
- Overview (Doc 1) — manifest fields, summary, success criteria, non-goals
- Features (Doc 3) — tree or kanban toggle
- Flows (Doc 2) — list + bug-reporting hub at top
- UI (Doc 4) — pages with components nested
- Data (Doc 5) — sources, schema explorer, ingest log
- Risks (Doc 7) — instances, policies, third-party, auth, secrets (tabs within tab)
- Decisions (Doc 8) — ADR list + markdown viewer
- Iterations (Stage 4) — timeline

Edit pattern: side-panel slides from right (list/detail visible behind).

### `/project/[slug]/iterations/[id]` — 🔴 Lock-In Gate UI
The most novel page. Original raw text + extracted items as cards (edit / split / merge / reject / approve / add new). "Lock & build" button. Live build progress after lock. Trace report after integrate.

### `/inbox` — Bug Report Inbox (cross-project)
All `reports` with `status=pending`. Group by project. Per report: snippet, source, age. "Analyze now" button. Batch analyze.

### `/coverage` — Test Coverage Dashboard
Cross-project metrics. % flows tested, top failing, untested by project. Drill-down per project.

### `/graph/[slug]` — Relationships Graph
Force-directed graph. Nodes: features (blue) / flows (green) / pages (yellow) / components (purple). Edges: linkages from M:N joins. Click node → detail.

### `/search` — Cross-doc Search
FTS5-backed. Query matches features / flows / pages / bugs / decisions. Grouped results.

### `/risks` — Risk Heatmap
Cross-project. Matrix: rows = risk types from catalog, cols = projects. Cell intensity = open instance count + severity. Click → drill.

### `/components` — Master Components Browser
Search central asset library. Filters: category / dark-light / responsive / used-in-project. Per component: preview, source code link, variants.

### `/admin` — Settings + Migrations
Schema version + migration runner. Onboarding wizard (Lite/Standard/Full picker). Risks catalog seed/edit. Master components import.

---

## Sync infrastructure (Codex P0 #2)

DB → YAML one-way mirror. Reverse NOT supported.

```typescript
// lib/sync/db-to-yaml.ts
// Triggered by POST /api/pack-up

async function syncDocToYaml(projectSlug: string, docName: string) {
  const filepath = `/repos/${projectSlug}/${docName}.yaml`
  const fileExists = await fs.access(filepath).then(() => true, () => false)

  if (fileExists) {
    const fileHash = sha256OfFile(filepath)
    const lastKnownHash = await db.query.yaml_mirror_state.findFirst({
      where: and(
        eq(yaml_mirror_state.project_slug, projectSlug),
        eq(yaml_mirror_state.doc_name, docName)
      )
    })

    if (lastKnownHash && fileHash !== lastKnownHash.last_yaml_hash) {
      // Manual edit detected
      throw new ManualEditDetectedError({
        filepath,
        fileHash,
        lastKnownHash: lastKnownHash.last_yaml_hash,
        prompt: 'File edited manually. Import or overwrite?'
      })
    }
  }

  const yamlContent = await serializeFromDb(projectSlug, docName)
  await fs.writeFile(filepath, yamlContent)
  await db.update(yaml_mirror_state).set({
    last_yaml_hash: sha256(yamlContent),
    last_synced_at: Date.now(),
  })
}
```

User-facing on drift: "manual edit to `flows.yaml` detected (timestamp X). Options: import to DB / overwrite with DB / abort."

---

## File watcher (chokidar)

Watches `/repos/*/` (all project repos mounted read-only). Events:
- File added / modified outside skill flow → flag potential drift
- Trigger sanity-check status update
- Trigger `yaml_mirror_state.drift_detected_at` update

Not the primary sync mechanism (skill `pack-up` is). Watcher provides BACKUP detection in case user edits files outside skill.

---

## DB bootstrap (Codex P0 #1 — migration-first)

Don't copy tasks-dashboard's `runBootstrap` race (it initializes `_sqlite` BEFORE migrations complete).

```typescript
// lib/db/client.ts
let _db = null
let _bootstrap_promise = null

export async function getDb() {
  if (_db) return _db
  if (_bootstrap_promise) return _bootstrap_promise

  _bootstrap_promise = (async () => {
    const sqlite = new Database(DB_PATH)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')

    const db = drizzle(sqlite, { schema })
    migrate(db, { migrationsFolder: './lib/db/migrations' })  // SYNCHRONOUS — completes before returning

    _db = db
    return db
  })()

  return _bootstrap_promise
}
```

ALL callers MUST `await getDb()`. No module-level `_db` direct usage.

---

## Stage 4 lock-in gate UI (the most novel piece)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ITERATION #N — Project: <slug>                                          │
│  Submitted: <timestamp>  ·  Status: PENDING APPROVAL                     │
├──────────────────────────────────────────────────────────────────────────┤
│  [▾ ORIGINAL MESSAGE (click to expand)]                                  │
│  "the search is broken and we need a dashboard. also when I click..."    │
│                                                                          │
│  EXTRACTED ITEMS — review before locking                                 │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ ITEM 1                                       [edit] [split] [✗] │    │
│  │ Type: BUG                              Confidence: 0.95  ✅     │    │
│  │ Title: Search returns empty results                              │    │
│  │ Affects: flow-search-add  ·  feat-search                         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ ITEM 2                                       [edit] [split] [✗] │    │
│  │ Type: NEW FEATURE                     Confidence: 0.62  ⚠ LOW   │    │
│  │ Title: Dashboard page                                            │    │
│  │ Affects: (new page) page-dashboard                               │    │
│  │                                                                  │    │
│  │ ⚠ Low confidence — Please confirm:                               │    │
│  │   "Did you mean a NEW page, or a metrics widget on existing     │    │
│  │   home page?"                                                    │    │
│  │   [ NEW PAGE ]  [ METRICS WIDGET ON HOME ]  [ I'll edit ]        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  REJECTED EXCERPTS:                                                      │
│  - "this app is so frustrating sometimes"                                │
│    Reason: User frustration; no specific item identified                 │
│                                                                          │
│  ──────────────────────────────────────────────────────────────────      │
│                                                                          │
│   [ + Add item I missed ]                                                │
│   [ ✓ Lock & build ]                                                     │
│   [ ↺ Re-classify ]                                                      │
│   [ ✗ Cancel iteration ]                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

Side-panel pattern for item edit (slides from right; main panel visible behind).

---

## Tasks-dashboard webhook bridge (OPTIONAL — Codex Round 2 corrections)

Tracker can POST to tasks-dashboard when Stage 4 produces user-testing work. **Default: disabled.** Opt-in via env var.

### Outbound from tracker
```http
POST https://tasks.vault7a.xyz/api/tasks
Authorization: Bearer <TRACKER_API_TOKEN>
{
  "title": "Test cricket-stats search bar fix (iter #12)",
  "project": "cricket-stats",
  "priority": "high",                        // P0→critical, P1→high, P2/P3→chill (Codex Round 2 #4)
  "description": "Stage 4 iteration #12 fixed search bar. Verify it returns results...",
  "external_system": "tracker",              // Codex Round 2 #3 — explicit columns NOT JSON ref
  "external_kind": "iteration",
  "external_id": "12",
  "external_url": "https://ottomate.vault7a.xyz/project/cricket-stats/iterations/12"
}
```

### Inbound webhook (when user marks task done in tasks-dashboard)
Webhook fires INSIDE `patchTask()` on status→done if `external_system === 'tracker'` (Codex Round 2 #5 — NOT a separate webhooks/task-completed route).

```http
POST https://ottomate.vault7a.xyz/api/external-task-completed
Authorization: Bearer <TRACKER_API_TOKEN>
{
  "external_kind": "iteration",
  "external_id": "12",
  "completed_at": "2026-04-27T15:30:00Z"
}
```

Tracker updates `iteration_items.user_test_completed_at` (NOT `verified` — Codex Round 2 distinction).

---

## Performance characteristics

At expected scale (13-30 projects, 50-200 features each):
- SQLite handles easily on local NVMe
- Indexes on: `projects.slug`, `*.project_slug` FKs, `flows.test_status`, `features.status`, `bugs.status`, `reports.status`
- Cross-project queries (Coverage / Risks Heatmap) use aggregations — should stay <100ms
- File watcher (chokidar) handles 100s of files easily
- DB size at 30 projects fully populated: ~50-200 MB

If scale grows past this: migrate to PostgreSQL via drizzle (straightforward).

---

## Cutover from v2 (Phase 13 of build)

See `CUTOVER.md` for the detailed step-by-step.

Summary:
1. Verify pilots done
2. DNS: add CNAME `ottomate.vault7a.xyz`
3. Cloudflared ingress: add hostname
4. NPM proxy: add host → ottomate:3000
5. `docker compose up -d --build`
6. Plugin swap: `mv ottomate ottomate-old; mv ottomate-v2 ottomate`
7. Verify
8. Decommission v2 (1-2 weeks delay for safety)

Rollback path documented at every step.

---

## What's NOT IN Tracker (intentionally)

- Tasks-dashboard's task management (separate app)
- Personal todos (user uses tasks-dashboard for that)
- Calendar / scheduling (out of scope)
- Time tracking (out of scope)
- Multi-user auth (single-user only)
- Public-facing project transitions (Stage 5 deferred)
- Real-time / websockets (polling sufficient)
- Mobile native app (web + mobile browser)
- Offline mode (assumes server reachable)

---

## Where the design lives

- This file (`TRACKER_OVERVIEW.md`) — design doc inside plugin
- Memory: `~/.claude/projects/.../memory/ottomate-redesign-state.md`
- Memory: `~/.claude/projects/.../memory/ottomate-implementation-plan.md`
- Codex review folder: `~/Desktop/skill cleanup/CODEX REVIEW FILES - SKILL ISSUE/06-tracker-v3-design/`

If memory and this doc disagree, **memory wins**.
