# Ottomate Skill — Detailed Design Overview

The `/ottomate` skill is the orchestrator. It runs all 4 stages of web project work on VAULT7A. This doc is the comprehensive design overview — read after `REQUIREMENTS.md` and before diving into the actual reference files.

---

## Core philosophy

**The skill exists to prevent gaslighting.** Every design choice traces back to: "user asked for X; AI must deliver X verifiably, not lie about it." Every stage has at least one anti-gaslighting checkpoint.

---

## End-to-end flow

```
USER TYPES /ottomate <something>
         │
         ▼
PHASE 1 — SANITY CHECK (always first)
  └── 31 stage-1 checks · 7 stage-2 · 8 stage-3 · 6 stage-4
  └── HARD halts; SOFT prompts user via AskUserQuestion
         │
         ▼
PHASE 2 — ROUTE (determine session intent)
  └── Query tracker for project state
  └── Pick path: new / resume / iterate / status-check
         │
         ▼
PHASE 3 — WORK (load reference, execute)
  ├── New project (no tracker row, no docs) → Stage 1 — Type 1 preprocessing
  ├── New project (no tracker row, with artifacts) → Stage 1 — T2P
  ├── Resume Stage 1 → Stage 1 internal process (ND1 → SO1)
  ├── Stage 2 ready → UI master plan + components + tech + arch
  ├── Stage 3 ready → scaffold + pipeline + code gen + verifier + tests
  └── Stage 4 (iterate) → mini-pipeline with lock-in gate
         │
         ▼
PHASE 4 — TRIGGER PHRASES (transitions detected at any time)
  └── "let's move on" / "next" / "ready" / "let's complete stage 1" / etc.
         │
         ▼
PHASE 5 — PACK UP (session end)
  └── DB→YAML mirror sync · iteration log · commit + push · plugin sync · cleanup · summary
```

---

## Stage 1 — Preprocessing + Internal Process

### Two preprocessing flows produce the SAME ND1 schema

#### Type 1 (no docs) — 8 steps
1. Journey detection (text-only → Type 1)
2. Sanity check (gate; halt on HARD)
3. Initial intent capture
4. Slug + display name negotiation
5. Intent deepening dialog (problem / users / non-goals / success)
6. Preferences dialog (likes / dislikes / must-haves / avoid)
7. AI sketches (3-10 features, 3-5 flows, initial risks)
8. Trigger + ND1 finalize

#### T2P — Type 2 Processing (with artifacts) — 13 steps
Same backbone + 4 artifact processing steps:
- F1 (code) → MCQ per file: overhaul/keep/tweak/discard/identify-likes
- F2 (docs) → which sections to use/drop
- F3 (sample URLs) → emulate / avoid (also routes to central asset repo)
- F4 (data) → source type + use decision
Plus: pre-population of intent + preferences from artifact analysis.

### ND1 schema (28 components — the LOCKED bridge between preprocessing and Stage 1)

**Mandatory (18):** proposed_slug, proposed_display_name, journey_type, sanity_check_results, core_idea, problem_statement, target_users, non_goals_initial, success_criteria_initial (≥3), likes, dislikes, must_haves, avoid, features_sketch (≥1), flows_sketch, risk_concerns_initial, created_at, session_id.

**Conditional (10):** inspirations, F1_code, F2_docs, F3_samples, F4_data, data_sketch, ui_hints, tech_hints, integrations_initial, auth_intent.

**Lifecycle:** ephemeral. Lives at `staging/ND1.yaml` during preprocessing. Archived to `staging/archive/ND1-<datetime>.yaml` after Stage 1 completes successfully.

### Stage 1 internal process — 11 sub-steps

Consume ND1 → produce 7 SO1 docs.

1. **ND1 consumption** — read, validate, halt if sanity_check.passed=false
2. **Carryover application** — apply ND1→SO1 routing rules
3. **Doc 1 completion** — manifest.yaml fields + preferences carried; AI defaults for status/lifecycle/scope/hosting/port/URLs; user confirms
4. **Doc 3 features refinement** — sketches → full feature entries with acceptance criteria (≥1, max 5)
5. **Doc 2 flows refinement** — sketches → full flows with steps (ordered actor/action/result, ≥2)
6. **Doc 4 pages derivation** — derive pages from features; per page metadata
7. **Doc 4 components per page** — list components per page from feature requirements
8. **Doc 5 data overview** — Stage 1 conceptual block (sources / ingestion / retention) — Stage 2 fills contract block
9. **Doc 7 risks** — match risk_concerns_initial to global catalog → risk_instances; policies; third-party; auth; secrets (names only)
10. **Doc 8 staging ADR** — auto-create initial decision record
11. **Verification** (5-pass) → Handoff

### Stage 1 verification — 5 passes
**A. Format** — YAML parses, types conform, enums valid, mirror matches DB
**B. Mandatory completeness** — all required fields populated, ≥1 / ≥3 minimums met
**C. Cross-doc validation** — permissions↔auth (if pages need auth, auth_strategy must exist); risk→affected_artifact; feature→flow links; orphan check
**D. Consistency** — FK references resolve; ADR linked entities exist; DB↔YAML match
**E. Interconnection report** — Feature ↔ Flow ↔ Page ↔ Component graph; flag disconnected subgraphs; user confirms

---

## Stage 2 — UI + Tech Finalization (8 sub-stages)

1. **Input validation** — read SO1, halt if Stage 1 verification didn't pass
2. **UI Master Plan** — AI proposes 2-3 themes; user picks; lock palette/fonts/aspect ratios/animation/spacing/shadow/radius
3. **Pages walkthrough** — per page: 2-3 layout options; user picks/refines
4. **Master Components List build** — scan all `/mnt/storage/websites/*` projects via SSH; categorize components; gap-list vs central asset library
5. **Component-by-component selection** — per page → per component (down to smallest filter/dropdown): query asset library, show ≥2-3 options, user picks
6. **Tech stack + architecture** — defaults Next.js + Tailwind + drizzle + better-sqlite3 + Playwright + Vitest; user overrides
7. **Architecture diagrams** — Mermaid (text, version-controlled) + rendered SVG/PNG
8. **Build plan** — order by dependency; critical path; test integration points

**Stage 2 outputs (SO2):** `ui-master-plan.yaml`, `ui.yaml` refined, `tech-stack.yaml`, `architecture.yaml`, `build-plan.yaml`, `diagrams/*.mermaid`, decisions/, master components updated.

---

## Stage 3 — Build + Test (7 sub-stages WITH VERIFIER)

1. **Project scaffolding** — Gitea repo, framework init, Docker compose, NPM proxy, Gitea Actions workflow
2. **Pipeline setup** — CI tools (one-time per project): Playwright, Vitest, axe-core, Lighthouse CI, Lost Pixel; runtime: GlitchTip, Plausible
3. **Code generation** — per feature in build-plan order; branch per feature; tests run on push
4. **🔴 VERIFIER SUB-AGENT (mandatory anti-gaslighting)** — runs after each feature, before testing. 4 passes:
   - **A. Code reality** — files exist, functions have real bodies, endpoints respond, DB tables created
   - **B. Stub detection** — TODO/FIXME/Lorem ipsum/return null/Math.random/expect(true) — HARD FAILS bypass auto-fix
   - **C. Data correctness** — tests really pass, ingestion works, DB has real data, API responds with real shape
   - **D. Acceptance criteria** — independently runs each Playwright test per criterion
5. **Comprehensive testing tiers**:
   - Always: unit / component / E2E flows / visual regression / a11y
   - First-time + nightly: Lighthouse perf / load tests / Trivy security scan
6. **Auto-fix loop** — bound 3 iterations; coder reads verifier report; verifier re-runs after each fix; stub-detected → bypass auto-fix, escalate to user
7. **Verification + reports** — generate test reports per category, build artifacts, deploy, smoke test

**Stage 3 outputs (SO3):** built code, test reports, build artifacts, code-overview.md (interview-ready), test-coverage.yaml, verification-report.yaml.

---

## Stage 4 — Iterate (8 sub-stages WITH LOCK-IN GATE)

The user-testing-and-fix loop. Runs continuously after Stage 3 ships.

### 4.1 — Intake
Capture raw text → `reports` table (status=pending). Original text ALWAYS preserved verbatim.

### 4.2 — Classify
User triggers manually ("Analyze"). LLM classifier (prompt in `prompts/classify-text.md`) extracts items into structured types: bug / new_feature_request / feature_modification / flow_modification / page_modification / component_modification / risk_addition / re_wire / revamp / observation / question.

Each item gets: title, description, target_kind+id, proposed_change, confidence (0.0-1.0).

Low confidence (<0.7) → AI asks user to clarify before 4.3.

### 4.3 — 🆕 Propose & Confirm — LOCK-IN GATE (THE most important sub-stage)
Tracker UI presents:
- Original raw text (collapsible)
- Extracted items as cards (edit / split / merge / reject / approve / add new)
- Confidence indicators
- Clarification prompts for low-confidence items
- "Lock & build" button (greyed until all items confidence ≥ 0.7 OR user_edited)

**No code changes happen before user clicks Lock.** This is the anti-gaslighting bedrock.

### 4.4 — Route per locked item
- Trivial bug (typo/color) → direct fix path (skip mini-staging)
- Standard bug → mini-build
- New feature → mini-staging + mini-build
- Modification → targeted mini-staging + mini-build
- Re-wire → multi-doc mini-staging + ADR + mini-build
- Revamp → may invoke mini-Stage-2 (UI Master Plan re-run)
- Observation → log only
- Question → respond in chat, no code change

### 4.5 — Mini-staging (when needed)
Update affected SO1/SO2 docs. Auto-create ADR for re-wires (anti-gaslighting: scope shifts must be documented).

### 4.6 — Mini-build
Scoped Stage 3 lite — only changed files; targeted tests (tag-based selection); no full nightly suite per iteration.

### 4.7 — Verifier (MANDATORY per item)
Same 4-pass verification. Per item, not per iteration. Stub-detected → escalate to user.

### 4.8 — Integrate + Trace Report
Merge to main, update tracker:
- Bugs: open → fixed (with verifier evidence)
- Features: proposed → done
- Coverage updated
- Verification report appended

**Trace report:** original raw text → extracted items → built per item (file changes, tests, verifier verdict) → acceptance criteria regression check → ADR if significant.

This is what makes "what I asked vs what got built" verifiable.

---

## 14 lock-in gates (cross-stage anti-gaslighting)

The lock-in pattern (raw → structured → user confirms → build) applies wherever AI extracts items from messy input:

1. Stage 1 features/flows extraction (single panel before lock)
2. T2P artifact decisions (after F1-F4 processing)
3. Stage 2 UI Master Plan (theme + all implications)
4. Stage 2 per-page component selection
5. Stage 3 verifier input contract (locked manifest, NOT claims)
6. Stage 1 risk lock-in (single panel)
7. ADR draft-and-confirm (auto-creation hooks)
8. Onboarding mode + backfill plan
9. Data/API contract lock (Codex Round 2)
10. Build slice lock per feature/iteration item (Codex Round 2)
11. Deferral/drop lock (Codex Round 2)
12. Partial-done lock (Codex Round 2)
13. Public exposure micro-gate (Codex Round 2)
14. Pack-up reconciliation (Codex Round 2)

**Anti-bloat principle:** batch decisions into panels, allow "approve all" default, skip empty gates, trigger phrases bypass with logged consent.

---

## Sanity check (52 checks across 4 stages)

8 categories: Infrastructure / Identity / Artifacts / Git / Intent / External / Resources / Schema.

Run BEFORE any preprocessing dialog. HARD halts with remediation; SOFT warns via AskUserQuestion (proceed/abort/explain); INFO logs only.

Output: `sanity_check_results` block in ND1 (Stage 1) or stage-transition record (Stage 2/3/4).

Implementation: `scripts/sanity-check.sh` (bash-level) + `GET /api/sanity-check?stage=` (DB-level).

---

## Trigger phrases (transition detection)

Detected continuously during work. Bypass dialog confirmations.

| Pattern | Effect |
|---|---|
| "let's move on" / "next" / "ready" / "proceed" / "let's go" | Next sub-step |
| "let's complete stage 1" / "stage 1 done" / "ND1 done" | Finalize ND1 |
| "let's get to stage 2" / "move to stage 2" | Transition Stage 1 → Stage 2 |
| "let's get to stage 3" / "build it" | Transition Stage 2 → Stage 3 |
| "let me test" / "I'll review now" | Transition out of build, ready Stage 4 |
| "analyze" / "classify" / "process this" | Stage 4 step 4.2 |
| "lock & build" / "approve all" | Lock Stage 4 step 4.3 |
| "pack up" / "done" / "good night" / "wrap up" | Session-end ritual |

---

## Pack-up ritual (session end)

Triggered by "pack up" or equivalent. Runs:

1. Validate working state (no half-edited files, no pending dialogs)
2. Sync DB → YAML mirrors for all changed SO1/SO2/SO3 docs
3. Update iteration log per project
4. Commit + push to Gitea
5. Auto-push plugin repos (ottomate + vault7a-ops if changed)
6. Clean temp files (local + server `/tmp/`)
7. Update tracker (`last_session_at` timestamp)
8. Show user session summary

---

## Per-doc schema enforcement

Every SO1/SO2 doc has a JSON Schema (in `schemas/`). The skill validates EVERY write:
- Before sending to tracker API → reject early
- Tracker API validates again with zod (defense in depth)
- File mirror validated on read

10 schemas drafted: nd1, overview, flows, features, ui, data, risks, adr, iterations, verification-report.

---

## Sub-agent dispatch model (anti-gaslighting via isolation)

The verifier is dispatched as an INDEPENDENT sub-agent — NOT in the main coder's context.

- Main coder produces code + structured artifact manifest
- Skill dispatches verifier with: locked items + acceptance criteria + expected_artifacts manifest + branch_diff_ref + deploy_url + (optional) coder claims as secondary signal
- Verifier reads ACTUAL code (not coder's summary)
- Verifier outputs structured `verification_report.yaml`
- Skill parses report, decides next action (approve / iterate / block)

**Cost:** verifier sub-agent has ~500-2000 tokens of context (focused) vs main session's 50K+ accumulated. ~95% context savings.

---

## File / repo / mirror layout per project

```
/mnt/storage/websites/<slug>/
├── overview.yaml                                   Doc 1 mirror
├── flows.yaml                                      Doc 2 mirror
├── features.yaml                                   Doc 3 mirror
├── ui.yaml                                         Doc 4 mirror
├── data.yaml                                       Doc 5 mirror
├── risks.yaml                                      Doc 7 mirror
├── decisions/
│   ├── 2026-04-26-initial-staging.md               Doc 8 (ADRs)
│   └── 2026-04-27-iter-1-search-fix.md
├── iterations/
│   └── iteration-1-2026-04-27.yaml                 Stage 4 history
├── staging/
│   ├── ND1.yaml                                    (during preprocessing only)
│   └── archive/
│       └── ND1-2026-04-26-153421.yaml              Archived after Stage 1
├── tests/                                          Project's actual code
├── src/ or app/                                    Project's actual code
├── package.json
├── docker-compose.yml
├── Dockerfile
└── ...                                             (project's existing files)
```

---

## Cost minimization (token + dollar)

**Tools (all free / self-hosted):**
- CI: Gitea Actions
- E2E: Playwright
- Unit: Vitest
- a11y: axe-core
- Perf: Lighthouse CI
- Visual regression: Lost Pixel
- Load: k6
- Security: Trivy / Grype / OSV-Scanner (NOT Snyk)
- Errors: GlitchTip
- Analytics: Plausible
- Secrets: Infisical
- Diagrams: Mermaid CLI
- Component model: shadcn/ui copy-paste

**Claude usage minimization:**
- Tracker DB does aggregations (NOT Claude)
- Pre-built prompts (loaded once, NOT regenerated)
- Schema validation (deterministic, NOT Claude)
- Sub-agent isolation (verifier in fresh context)
- Per-item processing (scoped context per item)
- Skip-if-unchanged sync
- Cached project context (load once per session)
- Trigger phrases skip multi-turn dialogs
- T2P pre-populates from artifacts (50-70% dialog savings)
- Templates for common project types
- `/api/projects/[slug]/context-packet` endpoint (Codex Round 2) — compact scoped packets
- Deterministic evidence collector before verifier (NOT Claude)
- Tier 0 deterministic verifier for trivial changes (NO Claude)

---

## Plugin structure (where everything lives)

```
~/.claude/plugins/ottomate-v2/
├── plugin.json                                     Plugin metadata
├── README.md                                       Top-level doc
├── REQUIREMENTS.md                                 R1-R22 (master spec)
├── SKILL_OVERVIEW.md                               This file
├── TRACKER_OVERVIEW.md                             Tracker design
├── DECISIONS.md                                    Chronological decisions log
├── DONE.md                                         Completion log
├── PENDING.md                                      Remaining work
├── HANDOFF.md                                      Entry point for new session
├── TODO.md                                         13 phases + Stage 5
├── PILOT_ONBOARDING.md                             3 pilot projects
├── CUTOVER.md                                      Phase 13 plan
├── STATUS.md                                       Live progress dashboard
└── skills/
    └── ottomate/
        ├── SKILL.md                                Top-level router (invoke /ottomate)
        ├── references/
        │   ├── stage-1-preprocessing.md            Type 1 + T2P (8 + 13 steps)
        │   ├── stage-1-internal.md                 ND1 → SO1 (11 sub-steps + 5-pass verification)
        │   ├── stage-3-verifier.md                 Anti-gaslighting verifier
        │   ├── stage-4-mini-pipeline.md            Iteration with lock-in gate
        │   ├── sanity-check.md                     52 checks across 4 stages
        │   ├── trigger-phrases.md                  Transition detection
        │   ├── pack-up-ritual.md                   Session-end housekeeping
        │   ├── tracker-api.md                      REST API reference (with bearer auth)
        │   └── credentials.md                      Server access credentials
        ├── schemas/                                Validation source of truth
        │   ├── nd1.schema.yaml
        │   ├── overview.schema.yaml
        │   ├── flows.schema.yaml
        │   ├── features.schema.yaml
        │   ├── ui.schema.yaml
        │   ├── data.schema.yaml
        │   ├── risks.schema.yaml
        │   ├── adr.schema.yaml
        │   ├── iterations.schema.yaml
        │   └── verification-report.schema.yaml
        ├── prompts/                                Reusable AI dialog templates
        │   ├── classify-text.md                    Stage 4 classifier
        │   ├── propose-confirm.md                  Stage 4 lock-in gate UX
        │   └── verifier-prompts.md                 Stage 3.4 / 4.7 verifier
        └── scripts/                                Helper scripts (sanity-check etc.)
```

---

## Skill invocation patterns

```
/ottomate                                Auto-detect intent based on context
/ottomate <project-slug>                 Resume specific project
/ottomate new                            Force new-project flow (Stage 1)
/ottomate status                         Show tracker dashboard, no work
```

Or natural language: "let's work on cricket-stats UI redesign" — skill auto-routes.

---

## What the skill DOES (responsibilities)

1. Orchestrates the 4-stage pipeline
2. Runs sanity checks before destructive ops
3. Reads + validates SO1/SO2/SO3 docs against schemas
4. Dispatches sub-agents (verifier, classifier, coder)
5. Polls tracker for iteration status (skill = worker per Codex P0 #3)
6. Triggers DB→YAML sync via `POST /api/pack-up`
7. Detects trigger phrases and advances stages
8. Runs auto-fix loops with bound (3 iterations)
9. Manages session lifecycle (pack-up ritual)
10. SCP files to/from server (never SSH heredoc for code)

## What the skill DOES NOT do (anti-responsibilities)

1. CRUD operations on tracker docs (tracker UI does this)
2. Storage of project state (tracker DB does this)
3. Cross-project aggregations (tracker queries do this)
4. Mechanical CI (Gitea Actions does this)
5. Test execution (Playwright/Vitest does this)
6. Security scans (Trivy does this)
7. Diagram rendering (Mermaid CLI does this)
8. Manual code editing in tracker UI (user does this)
9. Background jobs / cron (out of scope; deferred)

---

## Where the skill talks to the tracker

All tracker interactions via REST API at `${TRACKER_API_BASE}` (default `http://127.0.0.1:8110`).

GET endpoints: no auth.
POST/PATCH/DELETE: `Authorization: Bearer ${TRACKER_API_TOKEN}` header (Codex Round 2).

See `references/tracker-api.md` for full endpoint catalog.

---

## Anti-gaslighting bedrock (one-page summary)

If you remember nothing else:

1. **Scope-lock dialog** before code (Stage 1, Stage 4 #4.3)
2. **Acceptance criteria** mandatory per feature (≥1, max 5)
3. **Verifier sub-agent** independent of coder (Stage 3.4, Stage 4.7)
4. **Stub detection** as HARD FAIL (Stage 3 + Stage 4)
5. **Trace report** at integrate showing claim-vs-evidence (Stage 4.8)
6. **No silent "will do later"** — explicit drop required, captured as ADR
7. **Locked items contract** — verifier reads locked manifest, NOT coder claims (Codex P0 #4)
8. **Bearer auth on mutations** — even single-user (Codex Round 2)
9. **Risks resolve, don't delete** — history preserved (Codex P1 #10)
10. **Lock-in gate before code** — user confirms structured items before any change

These are NON-NEGOTIABLE. They are why the skill exists.

---

## How a fresh session resumes work

1. Read this `SKILL_OVERVIEW.md` + `REQUIREMENTS.md` + `STATUS.md`
2. Read `TODO.md` to find the next phase
3. Read `PENDING.md` for granular task list
4. Pick a phase, complete it, mark in TODO.md and PENDING.md
5. Update STATUS.md
6. Commit + push
7. End session with "pack up" — even though the tracker isn't running yet, the ritual still applies (manual git commit + plugin auto-push)

---

## Where the design lives

- **Memory files** (canonical for the design):
  - `~/.claude/projects/.../memory/ottomate-redesign-state.md`
  - `~/.claude/projects/.../memory/ottomate-implementation-plan.md`
- **Codex review folder** (snapshot for external review):
  - `~/Desktop/skill cleanup/CODEX REVIEW FILES - SKILL ISSUE/`
- **Plugin docs** (this folder):
  - `~/.claude/plugins/ottomate-v2/`

If memory and plugin docs ever disagree, **memory wins** (it's the canonical source).
