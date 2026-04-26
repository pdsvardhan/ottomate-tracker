# Ottomate v2 — TODO

Living checklist of remaining work. Order roughly by dependency, but parallelize where possible.

---

## 🟢 Phase 0 — DONE (foundation)

- [x] Skill plugin scaffolded at `~/.claude/plugins/ottomate-v2/`
- [x] All 8 references drafted (sanity-check, stage-1-preprocessing, stage-1-internal, stage-3-verifier, stage-4-mini-pipeline, trigger-phrases, pack-up-ritual, tracker-api, credentials)
- [x] All 10 schemas drafted (nd1, overview, flows, features, ui, data, risks, adr, iterations, verification-report)
- [x] 3 prompts drafted (classify-text, propose-confirm, verifier-prompts)
- [x] Tracker v3 scaffold deployed at `/opt/homeserver/ottomate/`
- [x] Gitea repo `pdsv/ottomate-tracker-v3` created, initial commit pushed
- [x] Drizzle schema (~30 tables) covering all SO1/SO2/SO3 docs
- [x] Migration-first DB bootstrap (Codex P0 #1)
- [x] Bearer auth design (Codex Round 2 #2)
- [x] Risks catalog seed script (50 types)
- [x] Master components seed script (15 cross-project entries)
- [x] Health endpoint
- [x] Docker compose (port 8110, localhost-bound, Codex P1 #8)

---

## 🟡 Phase 1 — Database + Migrations + Seed

**Estimated:** 1-2 sessions

- [ ] On server: `cd /opt/homeserver/ottomate && npm install`
- [ ] Run `npm run db:generate` to produce drizzle migration SQL files
- [ ] Run `npm run db:migrate` to apply migrations + create empty DB
- [ ] Run `npm run seed:risks` to populate `risks_catalog` (50 entries)
- [ ] Run `npm run seed:components` to populate `master_components` (15 entries)
- [ ] Verify schema: `npm run db:studio` (drizzle UI)
- [ ] Test health endpoint: `curl http://127.0.0.1:8110/api/health`

---

## 🟡 Phase 2 — REST API endpoints (the boring layer)

**Estimated:** 3-4 sessions

Per-doc CRUD pattern. See `references/tracker-api.md` for full spec.

### Project Overview (Doc 1)
- [ ] `GET /api/projects` (list with filters)
- [ ] `GET /api/projects/[slug]` (detail)
- [ ] `POST /api/projects` (create — Stage 1 hand-off; bearer required)
- [ ] `PATCH /api/projects/[slug]` (update; bearer required)
- [ ] `DELETE /api/projects/[slug]` (soft-archive; bearer required)
- [ ] Subroutes for non_goals + success_criteria (1:N children)

### Flows (Doc 2)
- [ ] `GET /api/projects/[slug]/flows`
- [ ] `POST /api/projects/[slug]/flows`
- [ ] `GET /api/projects/[slug]/flows/[flowId]`
- [ ] `PATCH /api/projects/[slug]/flows/[flowId]`
- [ ] `DELETE /api/projects/[slug]/flows/[flowId]`
- [ ] Subroutes: flow_steps, flow_pre_conditions, flow_edge_cases, flow_features (M:N), flow_pages (M:N)

### Features (Doc 3)
- [ ] Same CRUD pattern as flows
- [ ] Subroutes: feature_acceptance_criteria, feature_dependencies, joins to flows/pages

### Pages + Components (Doc 4)
- [ ] CRUD per page + per component
- [ ] Subroutes: page_entry_points, component_variants, joins

### Data (Doc 5)
- [ ] CRUD on project_data_concepts (Stage 1 conceptual)
- [ ] CRUD on data_sources
- [ ] CRUD on project_data_contracts (Stage 2)

### Risks (Doc 7)
- [ ] CRUD on risk_instances (with explicit per-target join updates)
- [ ] CRUD on policies
- [ ] CRUD on third_party_services
- [ ] CRUD on auth_config
- [ ] CRUD on project_secrets (NO VALUES, only inventory)

### Decisions (Doc 8)
- [ ] CRUD on adr_index
- [ ] Subroutes: adr_features, adr_risks (M:N joins)
- [ ] File serving: GET /api/projects/[slug]/decisions/[adr_id]/body (reads from git)

### Stage 4 (the lock-in flow)
- [ ] `POST /api/projects/[slug]/reports` (submit raw text)
- [ ] `POST /api/reports/[id]/classify` (manual analyze trigger)
- [ ] `GET /api/iterations/[id]` (view items)
- [ ] `PATCH /api/iterations/[id]/items/[itemId]` (user edits)
- [ ] `POST /api/iterations/[id]/items` (user adds new)
- [ ] `POST /api/iterations/[id]/items/[itemId]/split` (split into multiple)
- [ ] `DELETE /api/iterations/[id]/items/[itemId]` (reject)
- [ ] `POST /api/iterations/[id]/lock` (the lock-in moment)
- [ ] `GET /api/iterations/[id]/status` (skill polls during build)
- [ ] `POST /api/iterations/[id]/items/[itemId]/build-status` (skill writes back)
- [ ] `POST /api/iterations/[id]/items/[itemId]/verifier-result` (skill writes back)
- [ ] `POST /api/iterations/[id]/integrate` (final integrate)
- [ ] `GET /api/iterations/[id]/trace` (trace report)
- [ ] `POST /api/iterations/[id]/cancel`

### Cross-cutting
- [ ] `GET /api/inbox` (pending reports across projects)
- [ ] `GET /api/coverage` (test coverage dashboard data)
- [ ] `GET /api/graph/[slug]` (relationships graph data)
- [ ] `GET /api/search?q=` (FTS5-backed cross-doc search)
- [ ] `GET /api/risks-heatmap` (cross-project risk visualization)
- [ ] `GET /api/components` (master components browser)
- [ ] `GET /api/sanity-check?stage=` (run DB-level sanity checks)
- [ ] `POST /api/pack-up` (skill triggers DB→YAML mirror sync)
- [ ] `POST /api/backup` (DB snapshot before destructive ops)

### Codex Round 2 additions
- [ ] `GET /api/projects/[slug]/context-packet?item_id=&scope=` (compact context for Claude)
- [ ] `POST /api/external-task-completed` (webhook from tasks-dashboard)
- [ ] `POST /api/skill-events` (generic webhook for skill state updates)

### Auth middleware
- [ ] `lib/auth.ts` — bearer token validator
- [ ] Apply to all POST/PATCH/DELETE routes
- [ ] GET routes: no auth required (read-only)

### Validation
- [ ] zod schemas mirroring DB schemas in `lib/validation/`
- [ ] Apply to every POST/PATCH body before DB write

---

## 🟡 Phase 3 — Skill Stage 2 + Stage 3 references (mechanical translation of design)

**Estimated:** 1-2 sessions

- [ ] `references/stage-2-ui-master-plan.md` — extracts color palette, fonts, animation level from intent + design tokens
- [ ] `references/stage-2-components.md` — master components list build + per-component selection (with 2-3 options pattern)
- [ ] `references/stage-2-tech-architecture.md` — stack picker (Next.js / Vite / FastAPI), Mermaid diagram generation, build plan
- [ ] `references/stage-3-scaffolding.md` — repo init, Docker, NPM proxy, Gitea Actions setup
- [ ] `references/stage-3-pipeline-setup.md` — CI tools (Playwright, Vitest, axe, Lighthouse, Lost Pixel, Trivy)
- [ ] `references/stage-3-testing.md` — multi-tier testing (always-run vs first-time-+-nightly)
- [ ] `references/stage-1-verification.md` — extract from stage-1-internal.md sub-step 10

---

## 🟡 Phase 4 — Tracker UI: Stage 1 doc views

**Estimated:** 3-4 sessions

- [ ] Layout: sidebar nav + top breadcrumbs + theme toggle
- [ ] Project list page (`/`) — cards grid with filters/sort
- [ ] Project detail page (`/project/[slug]`) — tabbed view (Overview / Features / Flows / UI / Data / Risks / Decisions / Iterations)
- [ ] Side-panel edit pattern (slides from right; list/detail visible behind)
- [ ] Per-doc List/Detail/Edit components for Doc 1-7
- [ ] Decisions tab: lists ADRs, click opens markdown viewer, edit opens split frontmatter+body editor
- [ ] Dark + light theme support
- [ ] Outfit + JetBrains Mono fonts loaded

---

## 🟡 Phase 5 — Tracker UI: Stage 2 + Stage 3 views

**Estimated:** 3-4 sessions

- [ ] UI Master Plan view (theme preview, color swatches, font samples)
- [ ] Component browser per project (lists picked components + variants)
- [ ] Architecture diagram viewer (renders Mermaid via mermaid.js CDN)
- [ ] Build plan checkboxes (track progress)
- [ ] Stage 3: code overview view (file tree with descriptions, NOT full code — interview-ready)
- [ ] Stage 3: test report viewer (per-tier pass/fail with drill-down)
- [ ] Stage 3: verification report viewer (per-feature claim-vs-evidence trail)
- [ ] Stub-detection alert banner (if any verifier flag stubs)

---

## 🔴 Phase 6 — Stage 4 lock-in gate UI (CRITICAL — anti-gaslighting frontend)

**Estimated:** 2-3 sessions

- [ ] Iteration timeline page (`/project/[slug]/iterations`) — chronological cards
- [ ] Iteration detail page (`/project/[slug]/iterations/[id]`)
- [ ] **Lock-in panel:** original raw text (collapsible) + extracted items as cards
- [ ] Per-item: edit / split / merge / reject / approve actions
- [ ] Add new item (user-authored)
- [ ] Low-confidence flag (red border + clarification prompt) for items < 0.7
- [ ] "Lock & build" button (greyed until all items confidence >= 0.7 OR user_edited)
- [ ] After lock: live build progress (which item processing, verifier status)
- [ ] After integrate: trace report viewer

---

## 🟡 Phase 7 — Skill Stage 4 implementation

**Estimated:** 1 session

- [ ] Update `references/stage-4-mini-pipeline.md` to call concrete tracker API endpoints
- [ ] Skill polls iteration status (worker pattern per Codex P0 #3)
- [ ] Per-item dispatch: scoped coder → verifier sub-agent → integrate

---

## 🟡 Phase 8 — Cross-cutting tracker features

**Estimated:** 3-4 sessions

- [ ] Bug Inbox (`/inbox`) — pending reports across projects, batch analyze
- [ ] Test Coverage Dashboard (`/coverage`) — % flows tested, top failing, untested
- [ ] Relationships Graph (`/graph/[slug]`) — d3 or react-flow viz
- [ ] Cross-doc Search (`/search`) — FTS5 across features/flows/pages/bugs/ADRs
- [ ] Risk Heatmap (`/risks`) — cross-project risk type counts
- [ ] Master Components Browser (`/components`) — search central asset library
- [ ] Cmdk command palette — quick actions

---

## 🟡 Phase 9 — File watcher + sync infrastructure

**Estimated:** 2 sessions

- [ ] `lib/sync/db-to-yaml.ts` — serialize DB rows → YAML mirror
- [ ] `lib/sync/drift-detector.ts` — compute hash of YAML files, detect manual edits (Codex P0 #2)
- [ ] `lib/sync/pack-up-orchestrator.ts` — called by /api/pack-up
- [ ] `lib/sync/backup.ts` — DB snapshot before destructive sync
- [ ] chokidar file watcher subscribing to `/repos/*/`

---

## 🟡 Phase 10 — Pilot onboarding (validate end-to-end)

**Estimated:** 2-3 sessions

See `06-tracker-v3-design/13-projects-audit.md` for per-project mode recommendations.

### Pilot 1: ottomate-tracker-v3 itself (meta — dogfood)

- [ ] Create row in `projects` table for slug `ottomate`
- [ ] Run Stage 1 internal — backfill all 7 SO1 docs from this codebase
- [ ] Validate verifier sub-agent against this very implementation
- [ ] First Stage 4 iteration: implement Phase 1 (DB migrations actually applied)

### Pilot 2: tasks (the personal todo dashboard — onboarded as TRACKED PROJECT, NOT merged)

- [ ] Create `projects` row for slug `tasks`
- [ ] Run Stage 1 catchup (Standard mode) — backfill from existing CLAUDE.md + ITERATION_LOG (231 lines)
- [ ] Note: tasks-dashboard the APP stays at port 8507 — only its project metadata is tracked

### Pilot 3: balls-of-the-bull (BOTB)

- [ ] Create `projects` row for slug `balls-of-the-bull`
- [ ] **Mandatory secret scan + redact** (per Codex P1 #7) — CLAUDE.md has PDF passwords
- [ ] Run Stage 1 catchup (Standard mode) — backfill from CLAUDE.md + 256-line ITERATION_LOG
- [ ] First Stage 4 iteration: RCS / MacroDroid SMS trigger fix

---

## 🟡 Phase 11 — Migration of remaining 6 projects

**Estimated:** 2-3 sessions

Per `13-projects-audit.md`:
- [ ] cricket-stats — Full mode
- [ ] cap-a — Full mode (mapping showcase)
- [ ] desi-skies — Full mode (live + complex pipeline)
- [ ] media-dashboard — Full mode (best test coverage)
- [ ] health — Standard + DB-empty blocker as 1st iter
- [ ] home — Standard
- [ ] ingest — Standard (Python project)
- [ ] paata — Standard (move to Docker as part of onboarding)

Skip: portfolio (empty), sms-receiver (empty), vacayornay-data (empty).

---

## 🟡 Phase 12 — Codex review pass 3

**Estimated:** 1 session

After Phase 1-11 done:
- [ ] Update Codex review folder with current state (full source + working endpoints)
- [ ] Run final Codex review
- [ ] Apply Round 3 feedback

---

## 🟡 Phase 13 — Cutover

**Estimated:** 1 session

- [ ] Set up `ottomate.vault7a.xyz` in Cloudflare DNS
- [ ] NPM proxy host: `ottomate.vault7a.xyz` → `ottomate:3000` (port 8110 internally)
- [ ] Cloudflared ingress route added
- [ ] Old tracker (v2 at port 8100) marked deprecated; redirect tracker.vault7a.xyz → ottomate.vault7a.xyz
- [ ] Plugin: rename `~/.claude/plugins/ottomate/` → `~/.claude/plugins/ottomate-old/`; rename `ottomate-v2` → `ottomate`. Restart Claude Code.
- [ ] Document cutover in ADR

---

## 🔵 Phase 14 — Stage 5 design (DEFERRED per user direction)

> Per user: "WHATEVER TASKS REMAINING INCLUDING STAGE 5 DESIGN PUT INTO TODO" — design when single-user/home-server constraints change.

### Stage 5 — Actual Shipping (deferred design — outline only)

**Trigger:** project lifecycle transitions to `shipped` or `maintained` AND user wants public exposure / multi-user / production-grade infra.

**Out of scope at single-user/home-server:**
- Multi-user auth (Better Auth + role system)
- Public-facing project transitions (private → public lifecycle gate)
- Centralized logging + alerting at scale
- Backup orchestration (currently per-project; Stage 5 = central)
- DNS / SSL automation beyond NPM
- Performance budgets + monitoring across the home portal
- Observability stack (Grafana / Prometheus / Tempo)

**Stage 5 sub-stages (TBD when needed):**
1. **Pre-launch security review** — full Trivy / OWASP ZAP / Burp pass
2. **Multi-environment promotion** — staging → prod with diff tooling
3. **Public exposure micro-gate** (already in Codex Round 2 lock-in gates) — auth + secrets + backups + sensitivity confirmed
4. **Monitoring + alerting setup** — GlitchTip / Plausible / Uptime Kuma per project
5. **Backup verification** — automated quarterly restore test
6. **Launch announcement** — auto-update home portal, social posts (if applicable)
7. **Post-launch observability** — first 30/60/90 days monitoring + iteration

---

## 🟣 Outstanding decisions (require user input)

- [ ] **Domain DNS for ottomate.vault7a.xyz** — when to set up Cloudflare record (defer to Phase 13 cutover)
- [ ] **Bearer token rotation cadence** — quarterly default; user confirm
- [ ] **NPM proxy host setup** — manual via NPM admin UI, or scripted via API?
- [ ] **GlitchTip / Sentry self-hosted** — deploy when first project gets to Stage 5
- [ ] **Infisical self-hosted** — deploy when secrets management becomes painful (currently using `.env` files)
- [ ] **Visual regression tool** — Lost Pixel vs Percy free tier vs Playwright screenshot diffs (default: Lost Pixel)

---

## 🟢 Maintenance backlog (low priority)

- [ ] Mojibake encoding fix across all docs (Codex Round 2 P2 #18) — em-dashes / arrows / box chars showing as `â€"` etc. — UTF-8 sweep
- [ ] Stage4-lite mode for legacy projects without Stage 3 quality (Codex P1 #6) — design + implement
- [ ] Mandatory historical-doc secret scan (Codex P1 #7) — script + onboarding integration
- [ ] Snyk → Trivy/Grype/OSV-Scanner replacement in Stage 3 testing tier (Codex P1 #11)
- [ ] Onboarding "manual edit detected — import or overwrite?" dialog UI

---

## 🔵 Total remaining estimate

- Phase 1: 1-2 sessions
- Phase 2: 3-4 sessions
- Phase 3: 1-2 sessions
- Phase 4: 3-4 sessions
- Phase 5: 3-4 sessions
- Phase 6: 2-3 sessions
- Phase 7: 1 session
- Phase 8: 3-4 sessions
- Phase 9: 2 sessions
- Phase 10: 2-3 sessions
- Phase 11: 2-3 sessions
- Phase 12: 1 session
- Phase 13: 1 session
- Phase 14 (Stage 5): TBD — only when needed

**Total: 25-35 sessions** of focused build time. Phasable across weeks. Pilot validation after Phase 10 catches issues early.
