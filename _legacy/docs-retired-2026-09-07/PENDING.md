# Pending — Detailed Remaining Work

Granular task list. More detailed than TODO.md. Use this when picking up next session.

Each task has: title, description, files affected, estimated hours, dependencies, priority.

---

## 🔴 Phase 1 — DB Migrations + Seeds (CRITICAL — blocks everything)

**Total: 1-2 sessions**

### 1.1 — Install dependencies on server
**Files:** `/opt/homeserver/ottomate/`
**Time:** 5 min
**Steps:**
```bash
ssh pdsv@192.168.1.10
cd /opt/homeserver/ottomate
npm install
# Verify: ls node_modules/ | wc -l (should be hundreds)
```

### 1.2 — Generate drizzle migrations
**Files:** Generated into `lib/db/migrations/`
**Time:** 5 min
**Command:** `npm run db:generate`
**Verifies:** new SQL files in `lib/db/migrations/` matching schema

### 1.3 — Apply migrations (creates DB)
**Files:** Creates `data/ottomate.db`
**Time:** 5 min
**Command:** `npm run db:migrate`
**Verifies:** `data/ottomate.db` exists; sqlite3 inspect shows ~30 tables

### 1.4 — Seed risks catalog
**Files:** No file changes; populates `risks_catalog` table
**Time:** 5 min
**Command:** `npm run seed:risks`
**Verifies:** 50 rows in `risks_catalog`

### 1.5 — Seed master components
**Files:** No file changes; populates `master_components` table
**Time:** 5 min
**Command:** `npm run seed:components`
**Verifies:** 15 rows in `master_components`

### 1.6 — Generate bearer token (Codex Round 2 #2)
**Files:** Creates `/opt/homeserver/ottomate/.token`
**Time:** 2 min
**Command:**
```bash
openssl rand -hex 32 > /opt/homeserver/ottomate/.token
chmod 600 /opt/homeserver/ottomate/.token
```

### 1.7 — Smoke test (build + boot via Docker)
**Files:** Runs the existing scaffold
**Time:** 10 min
**Command:**
```bash
cd /opt/homeserver/ottomate
docker compose up -d --build
docker logs ottomate
curl http://127.0.0.1:8110/api/health
```
**Verifies:** Health endpoint returns `{"status":"ok","db":"connected",...}`

### 1.8 — Add ANTHROPIC_API_KEY to env (for verifier sub-agent)
**Files:** `.env` (gitignored), referenced in `docker-compose.yml`
**Time:** 5 min
**Note:** Required for verifier sub-agent dispatch in Stage 3/4. Get from existing `~/.anthropic` or environment.

---

## 🟡 Phase 2 — REST API endpoints (~40 endpoints)

**Total: 3-4 sessions** — biggest chunk after UI build.

### 2.1 — Auth middleware (foundational)
**Files:** `lib/auth.ts`, used by all mutating routes
**Time:** 1 hour
**Implementation:**
```typescript
// lib/auth.ts
export function requireBearer(req: Request) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) throw new Response('unauthorized', { status: 401 })
  if (auth.slice(7) !== process.env.TRACKER_API_TOKEN) throw new Response('forbidden', { status: 403 })
}
```

### 2.2 — zod validation schemas
**Files:** `lib/validation/*.ts` (mirror DB schemas)
**Time:** 2-3 hours
**Per doc:** zod schema for create/update/patch payloads.

### 2.3 — Per-doc CRUD (Doc 1 Project Overview)
**Files:**
- `app/api/projects/route.ts` (GET list, POST create)
- `app/api/projects/[slug]/route.ts` (GET, PATCH, DELETE)
- `app/api/projects/[slug]/non_goals/route.ts` (1:N CRUD)
- `app/api/projects/[slug]/success_criteria/route.ts` (1:N CRUD)
**Time:** 3-4 hours
**Validates against:** `overview.schema.yaml`

### 2.4-2.10 — Per-doc CRUD for Docs 2-5, 7, 8
Same pattern. Per doc: list / detail / create / update / delete + subroutes for 1:N children + M:N joins.

**Files (per doc):** `app/api/projects/[slug]/<doc>/...`
**Time per doc:** 3-4 hours
**Total:** ~20 hours for all 7 docs

### 2.11 — Stage 4 endpoints (the lock-in flow)
**Files:**
- `app/api/projects/[slug]/reports/route.ts` (POST submit)
- `app/api/reports/[id]/classify/route.ts` (POST analyze)
- `app/api/iterations/[id]/route.ts` (GET items)
- `app/api/iterations/[id]/items/[itemId]/route.ts` (PATCH edit)
- `app/api/iterations/[id]/items/route.ts` (POST add user-authored)
- `app/api/iterations/[id]/items/[itemId]/split/route.ts` (POST split)
- `app/api/iterations/[id]/lock/route.ts` (POST lock)
- `app/api/iterations/[id]/status/route.ts` (GET — skill polls)
- `app/api/iterations/[id]/items/[itemId]/build-status/route.ts` (POST)
- `app/api/iterations/[id]/items/[itemId]/verifier-result/route.ts` (POST)
- `app/api/iterations/[id]/integrate/route.ts` (POST)
- `app/api/iterations/[id]/trace/route.ts` (GET trace report)
- `app/api/iterations/[id]/cancel/route.ts` (POST cancel)
**Time:** 4-5 hours
**Critical:** This is the anti-gaslighting flow. Test thoroughly.

### 2.12 — Cross-cutting endpoints
**Files:**
- `app/api/inbox/route.ts`
- `app/api/coverage/route.ts`
- `app/api/graph/[slug]/route.ts`
- `app/api/search/route.ts` (FTS5 query)
- `app/api/risks-heatmap/route.ts`
- `app/api/components/route.ts`
- `app/api/sanity-check/route.ts`
- `app/api/pack-up/route.ts`
- `app/api/backup/route.ts`
- `app/api/projects/[slug]/context-packet/route.ts` (Codex Round 2)
**Time:** 3-4 hours

### 2.13 — Webhook endpoints (optional; for tasks-dashboard bridge)
**Files:**
- `app/api/external-task-completed/route.ts`
- `app/api/skill-events/route.ts`
**Time:** 1 hour

### 2.14 — FTS5 setup
**Files:** Migration to add FTS5 virtual table over flows + features + pages + bugs + decisions
**Time:** 2 hours
**Note:** SQLite FTS5; queried by `/api/search`

---

## 🟡 Phase 3 — Skill Stage 2 + Stage 3 references

**Total: 1-2 sessions** — mechanical translation of design to docs

### 3.1 — `references/stage-2-ui-master-plan.md`
**Source:** Memory `ottomate-redesign-state.md` Stage 2 section + `06-tracker-v3-design/deep-analysis-lockin-tokens-tasks.md`
**Time:** 1.5 hours

### 3.2 — `references/stage-2-components.md`
Master components list build + per-component selection (≥2-3 options per component pattern)
**Time:** 1.5 hours

### 3.3 — `references/stage-2-tech-architecture.md`
Stack picker + Mermaid diagram generation + build plan
**Time:** 1.5 hours

### 3.4 — `references/stage-3-scaffolding.md`
Repo init + Docker + NPM proxy + Gitea Actions setup
**Time:** 1 hour

### 3.5 — `references/stage-3-pipeline-setup.md`
CI tools (Playwright, Vitest, axe, Lighthouse, Lost Pixel, Trivy)
**Time:** 1 hour

### 3.6 — `references/stage-3-testing.md`
Multi-tier testing (always-run vs first-time-+-nightly)
**Time:** 1 hour

### 3.7 — `references/stage-1-verification.md`
Extract from stage-1-internal.md sub-step 10 into its own ref
**Time:** 0.5 hour

---

## 🟡 Phase 4 — Tracker UI: Stage 1 doc views

**Total: 3-4 sessions**

### 4.1 — Layout + navigation
**Files:** `app/layout.tsx` (improved), `components/layout/Sidebar.tsx`, `components/layout/TopBar.tsx`
**Time:** 2-3 hours

### 4.2 — Theme provider (dark + light)
**Files:** `components/theme-provider.tsx` (using next-themes)
**Time:** 1 hour

### 4.3 — Project list page (`/`)
**Files:** `app/page.tsx` (replaces placeholder), `components/project/ProjectCard.tsx`
**Time:** 3 hours
**Includes:** filters, sort, search box, cards grid

### 4.4 — Project detail page (`/project/[slug]`)
**Files:** `app/project/[slug]/page.tsx`, `app/project/[slug]/layout.tsx`, `components/project/ProjectTabs.tsx`
**Time:** 2-3 hours

### 4.5-4.11 — Per-doc tab content (one per doc)
Detail + Edit views for each Doc 1-7. Side-panel edit pattern (slides from right).

**Files per doc:** `app/project/[slug]/<doc>/page.tsx`, `components/<doc>/...`
**Time per doc:** 2-3 hours
**Total:** ~14-18 hours

---

## 🟡 Phase 5 — Tracker UI: Stage 2 + 3 views

**Total: 3-4 sessions**

### 5.1 — UI Master Plan view
Theme preview, color swatches, font samples
**Time:** 2 hours

### 5.2 — Component browser per project
Lists picked components + variants + asset library refs
**Time:** 2 hours

### 5.3 — Architecture diagram viewer
Renders Mermaid via mermaid.js CDN
**Time:** 1.5 hours

### 5.4 — Build plan checkboxes
Track build progress per project
**Time:** 1 hour

### 5.5 — Stage 3 code overview view
File-tree with descriptions (interview-ready, NOT full code)
**Time:** 2 hours

### 5.6 — Stage 3 test report viewer
Per-tier pass/fail with drill-down
**Time:** 2 hours

### 5.7 — Stage 3 verification report viewer
Per-feature claim-vs-evidence trail
**Time:** 2 hours

### 5.8 — Stub-detection alert banner
Top of project detail if any verifier flagged stubs
**Time:** 1 hour

---

## 🔴 Phase 6 — Stage 4 lock-in gate UI (CRITICAL — anti-gaslighting frontend)

**Total: 2-3 sessions**

### 6.1 — Iteration timeline page
**Files:** `app/project/[slug]/iterations/page.tsx`
**Time:** 2 hours

### 6.2 — Iteration detail page (lock-in gate)
**Files:** `app/project/[slug]/iterations/[id]/page.tsx`
**Time:** 4-5 hours
**Includes:**
- Original raw text panel (collapsible)
- Extracted items as cards (edit / split / merge / reject)
- Low-confidence flag with clarification prompts
- "Add new item" button
- "Lock & build" button (greyed until all items confidence ≥ 0.7 OR user_edited)

### 6.3 — Live build progress view (after lock)
**Files:** Polls `/api/iterations/[id]/status`
**Time:** 2 hours

### 6.4 — Trace report viewer (after integrate)
**Files:** `components/iteration/TraceReport.tsx`
**Time:** 2 hours

---

## 🟡 Phase 7 — Skill Stage 4 implementation

**Total: 1 session**

### 7.1 — Update stage-4-mini-pipeline.md to call concrete tracker endpoints
**Files:** `~/.claude/plugins/ottomate-v2/skills/ottomate/references/stage-4-mini-pipeline.md`
**Time:** 1 hour

### 7.2 — Implement skill polling pattern
Skill polls `/api/iterations/[id]/status`; runs builds; writes results back
**Time:** 2 hours

### 7.3 — Per-item dispatch logic
Coder agent → verifier sub-agent → integrate
**Time:** 2 hours

---

## 🟡 Phase 8 — Cross-cutting tracker features

**Total: 3-4 sessions**

### 8.1 — Bug Inbox (`/inbox`)
Pending reports across projects, batch analyze
**Time:** 2 hours

### 8.2 — Test Coverage Dashboard (`/coverage`)
% flows tested, top failing, untested
**Time:** 2 hours

### 8.3 — Relationships Graph (`/graph/[slug]`)
d3 or react-flow viz of Feature ↔ Flow ↔ Page ↔ Component
**Time:** 4 hours (most novel)

### 8.4 — Cross-doc Search (`/search`)
FTS5-backed grouping by doc type
**Time:** 2 hours

### 8.5 — Risk Heatmap (`/risks`)
Cross-project risk type counts
**Time:** 2 hours

### 8.6 — Master Components Browser (`/components`)
Search central asset library
**Time:** 2 hours

### 8.7 — cmdk command palette
Quick actions from anywhere in tracker
**Time:** 2 hours

---

## 🟡 Phase 9 — File watcher + sync infrastructure

**Total: 2 sessions**

### 9.1 — `lib/sync/db-to-yaml.ts`
Serialize DB rows → YAML mirror
**Time:** 3 hours

### 9.2 — `lib/sync/drift-detector.ts`
Hash-based detection of manual edits (Codex P0 #2)
**Time:** 2 hours

### 9.3 — `lib/sync/pack-up-orchestrator.ts`
Called by `/api/pack-up`
**Time:** 2 hours

### 9.4 — `lib/sync/backup.ts`
DB snapshot before destructive sync
**Time:** 1 hour

### 9.5 — chokidar watcher
Watches `/repos/*/` for manual changes
**Time:** 2 hours

---

## 🟡 Phase 10 — Pilot onboarding (validate end-to-end)

**Total: 2-3 sessions**

See `PILOT_ONBOARDING.md` for full detail. Three projects:

### 10.1 — Pilot 1: ottomate-tracker-v3 itself (meta)
Time: 1 session — Stage 1 catchup from this codebase, first iteration = applying Phase 1 (migrations + seeds)

### 10.2 — Pilot 2: balls-of-the-bull (BOTB)
Time: 1 session — secret scan first, Standard onboarding, RCS blocker as 1st iter

### 10.3 — Pilot 3: tasks (personal todo, tracked but separate)
Time: 1 session — Standard catchup; optional webhook bridge setup

After pilots: write `pilot-retrospective.md` ADR.

---

## 🟡 Phase 11 — Migration of remaining 6 projects

**Total: 2-3 sessions**

Per `13-projects-audit.md`:
- cricket-stats — Full mode (1 session, best v2 data)
- cap-a — Full (mapping showcase)
- desi-skies — Full (live + complex pipeline)
- media-dashboard — Full (best test coverage)
- health — Standard + DB-empty as 1st iter
- home — Standard
- ingest — Standard (Python project)
- paata — Standard (Docker migration)

Skip: portfolio (empty), sms-receiver (empty), vacayornay-data (empty).

---

## 🟡 Phase 12 — Codex Round 3

**Total: 1 session**

After Phases 1-11:
- Update Codex review folder with current state (working endpoints + UI screenshots)
- Run final Codex review
- Apply Round 3 feedback

---

## 🟡 Phase 13 — Cutover

**Total: 1 session, ~30 min if smooth**

See `CUTOVER.md` for steps. Brief:
1. DNS: add `ottomate.vault7a.xyz` CNAME
2. Cloudflared ingress: add hostname
3. NPM proxy: add host
4. `docker compose up -d --build` on server
5. Plugin swap: `mv ottomate ottomate-old; mv ottomate-v2 ottomate`
6. Verify
7. Decommission v2 (1-2 weeks delay for safety)

---

## 🔵 Phase 14 — Stage 5 design (DEFERRED)

**Trigger:** when single-user/home-server constraints change.

Outline only (don't design until needed):
1. Pre-launch security review (full Trivy + OWASP ZAP + Burp)
2. Multi-environment promotion (staging → prod)
3. Public exposure micro-gate (already in lock-in gates)
4. Monitoring + alerting setup (GlitchTip / Plausible / Uptime Kuma)
5. Backup verification (automated quarterly restore test)
6. Launch announcement (auto-update home portal, social posts)
7. Post-launch observability (first 30/60/90 days)

---

## 🟣 Outstanding decisions (require user input)

- D-pending — Pack-up auto vs manual final review (per-session toggle?)
- D-pending — Visual regression: Lost Pixel vs Percy free vs Playwright screenshots (default: Lost Pixel)
- D-pending — Infisical deploy timing (when secrets management painful)
- D-pending — GlitchTip deploy timing (when first project hits Stage 5)
- D-pending — NPM proxy automation (manual via UI vs scripted via API)
- D-pending — DNS for ottomate.vault7a.xyz (defer until Phase 13)

These get decided at the relevant phase.

---

## 🟢 Maintenance backlog (low priority)

- Mojibake encoding sweep across all docs (Codex P2 #18) — UTF-8 normalize
- Stage4-lite mode implementation (Codex P1 #6) — design exists, not yet coded
- Mandatory historical-doc secret scan (Codex P1 #7) — script exists in concept, not yet coded
- Snyk → Trivy/Grype/OSV-Scanner replacement (Codex P1 #11) — already in stage-3-testing.md design, just needs to be reflected in actual CI workflow when Stage 3 builds run
- Onboarding "manual edit detected — import or overwrite?" dialog UI

---

## How to use this doc

When picking up a new session:
1. Find the next phase you intend to tackle
2. Look at its sub-tasks (1.1, 1.2, etc.)
3. Each has files affected + time estimate
4. Work top-down within the phase
5. After each sub-task: mark done in TODO.md, commit + push
6. After each phase: run smoke test against tracker
7. Update STATUS.md with current phase

---

## Total remaining estimate

| Phase | Hours | Sessions |
|---|---|---|
| 1 — DB migrations + seeds | 1 hour | 0.5 |
| 2 — REST API (~40 endpoints) | 25-30 hours | 3-4 |
| 3 — Skill Stage 2/3 references | 7-9 hours | 1-2 |
| 4 — UI Stage 1 docs | 22-30 hours | 3-4 |
| 5 — UI Stage 2/3 | 13-15 hours | 3-4 |
| 6 — Lock-in gate UI | 10-13 hours | 2-3 |
| 7 — Skill Stage 4 impl | 5 hours | 1 |
| 8 — Cross-cutting features | 16 hours | 3-4 |
| 9 — Sync infrastructure | 10 hours | 2 |
| 10 — Pilot onboarding | 12-15 hours | 2-3 |
| 11 — Migration of 6 | 12-18 hours | 2-3 |
| 12 — Codex Round 3 | 4-6 hours | 1 |
| 13 — Cutover | 1-2 hours | 1 |
| 14 — Stage 5 (deferred) | TBD | TBD |

**Grand total: ~140-170 hours, 25-35 focused sessions.**

Pacing depends on session length. At 4-hour sessions, ~35-45 sessions over 2-3 months realistic.
