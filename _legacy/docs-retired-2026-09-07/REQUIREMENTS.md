# Requirements — Ottomate v2 (skill + tracker)

This is the **definitive list of every requirement** the user has expressed across the conversation. Each is sourced from explicit user statements + implications captured in design discussions. Use this as the master spec.

---

## R0 — Project context (the user's situation)

- Single user, single home server (VAULT7A)
- 13 web projects in flight at `/mnt/storage/websites/*`
- Mixed stacks (Next.js, Vite, FastAPI, mobile-hybrid via Capacitor)
- Tracker website existed (v2) but was barely used — UI dead, mostly null fields
- User going to interviews soon — needs portfolio-grade tracker
- All on home server — Cloudflare Tunnel for public access
- Free / self-hosted tools only — no SaaS subscriptions
- Original `/project` skill (ottomate plugin) had pain points: scope gaslighting, random docs, broken iteration loop, manual unreliable testing

---

## R1 — Anti-gaslighting (HIGHEST PRIORITY)

The user's #1 pain. Drives most of the design.

### R1.1 — Scope gaslighting prevention
Pattern: user asks for 10 features → AI does 3-4 well, 1-2 falsely deferred ("will do later"), rest flat-out lied about ("done").

Required:
- **Scope-lock dialog** before code (Stage 1, Stage 4 lock-in)
- AI must INTERROGATE feature lists, ask clarifying questions, surface obvious missing pieces ("you said e-commerce — no cart?")
- Acceptance criteria mandatory per feature (≥1, max 5)
- Explicit drop-with-reason required if a feature becomes infeasible mid-build (no silent defer)
- Verifier sub-agent independent of coder catches stubs/lies

### R1.2 — Verifier sub-agent
- Runs after every feature build (Stage 3.4) and per iteration item (Stage 4.7)
- 4-pass verification: code reality / stub detection / data correctness / acceptance criteria
- Inputs: locked items + acceptance criteria + expected artifacts manifest + branch diff (NOT coder claims — Codex P0 #4)
- Outputs: structured verification_report (schema-validated)
- Stub detection HARD FAILS bypass auto-fix loop (intent ambiguity, mandatory user review)
- Allowlist for legitimate TODO comments (tests/docs/CHANGELOG)
- `@intentional-placeholder` escape hatch with user lock-in approval count

### R1.3 — Stage 4 Lock-In Gate (the most novel piece)
User's exact requirement: "pick from what I asked, create feature reqs/bugs/modifications, then build from what created."

Required flow:
1. User submits raw text (tracker / chat / mega-prompt)
2. AI classifies into structured items (bug / new_feature / feature_modification / re-wire / revamp / observation / question)
3. AI presents extracted items SIDE-BY-SIDE with original raw text
4. User edits / splits / merges / rejects / adds items
5. User clicks "Lock & build" — items frozen, build proceeds from locked list
6. Trace report at integrate shows: raw → items → built per item → verifier verdict per item
7. User can VERIFY what was built matches what they asked

### R1.4 — Lock-in gates throughout pipeline (14 total)
Beyond Stage 4, the pattern applies wherever AI extracts structured items from messy input:
- Stage 1 features/flows extraction (panel before lock)
- T2P artifact decisions (after F1-F4 processing)
- Stage 2 UI Master Plan (theme + all implications)
- Stage 2 per-page component selection
- Stage 3 verifier input (locked manifest, not claims)
- Risk auto-detection confirmation
- ADR draft-and-confirm
- Onboarding mode + backfill plan
- Data/API contract lock (Codex Round 2)
- Build slice lock per feature (Codex Round 2)
- Deferral/drop lock (Codex Round 2)
- Partial-done lock (Codex Round 2)
- Public exposure micro-gate (Codex Round 2)
- Pack-up reconciliation (Codex Round 2)

---

## R2 — Pipeline architecture

### R2.1 — 4 stages
- **Preprocessing → Stage 1 → Stage 2 → Stage 3 → Stage 4**
- Stage 5 (shipping) deferred — designed when single-user/home-server constraints change

### R2.2 — Pipeline naming (user's convention, locked)
- **Type 1** — entry with no docs (project name, rough idea, chat transcripts)
- **Type 2** — entry with some docs (mix of F1/F2/F3/F4)
- **F1** = Code (UI / backend / any)
- **F2** = Docs (any kind — MD/txt/Word)
- **F3** = Sample website (URL)
- **F4** = Data (CSV/JSON)
- **ND1** = Stage 1 input docs (ephemeral)
- **SO1** = Stage 1 output docs (persistent)
- **T2P** = Type 2 Processing

### R2.3 — Trigger phrases (transitions)
"let's move on", "next", "ready", "proceed", "let's go", "let's complete stage 1", "stage 1 done", "ND1 done", "let's get to stage 2", "let me test", "pack up"

### R2.4 — "pack up" session-end ritual
User explicitly named this. Triggers: validate state, sync DB→YAML mirrors, update iteration log, commit + push, auto-push plugin repos, clean temp files, show summary.

---

## R3 — 7 SO1 docs (per-project canonical, persistent)

User curated this list across multiple iterations. Locked at 7 (Doc 6 Inspirations dropped).

### Doc 1 — Project Overview (`overview.yaml` + DB)
14 components: slug, display_name, summary (tagline+short+core_idea), current_status, lifecycle_phase, scope_size, target_devices, hosting_target, port, public_url, repository_url, problem_statement, non_goals (≥1), success_criteria (≥3), preferences (likes/dislikes/must_haves/avoid carried from ND1).

### Doc 2 — User Flows (`flows.yaml` + DB)
18 components: id, parent_id, title, trigger, expected_outcome, type (ui/backend/automated/mixed), priority, test_status, linked_playwright_test, linked_active_bugs, last_tested_date, tags, notes; arrays: steps (ordered actor/action/result, ≥2), pre_conditions, edge_cases; M:N: linked_features (≥1), linked_pages (≥1 for UI flows).

### Doc 3 — Features (`features.yaml` + DB)
15 components: id, parent_id, title, short_description, type, status, priority, size, acceptance_criteria (≥1, max 5), test_status (derived: AND of linked flow statuses), tags, notes; M:N: linked_flows, linked_pages, dependencies.

### Doc 4 — UI Pages & Components (`ui.yaml` + DB)
Pages (13 fields): id, title, route, purpose, layout_type, empty/loading/error states, permissions, mobile_handling, entry_points; M:N linked_features + linked_flows. Components per page (9 fields): name, purpose_on_page, category, possible_variants, data_consumed, data_produced, picked, asset_library_ref; nested under pages in YAML.

### Doc 5 — Data Overview (`data.yaml` + DB) — split per Codex P1 #9
**Stage 1 conceptual:** sources (with R1-R4 recurring fetch fields), retention_policy, seed_data_plan, data_quality_rules, known_quality_issues, freshness_alerts.
**Stage 2 contract:** database_engine, storage_location, migration_tooling, tables (columns/types/nullable/default), indexes, constraints, relationships.

### Doc 7 — Risks (`risks.yaml` + DB)
Risk instances (linked to global catalog), policies (exposure/access/sensitivity/encryption/retention/rate-limit), third-party services, auth_config, secrets (NAMES only, no values).
Lifecycle: `resolved` status (with `resolved_at` + `resolution_summary`, hidden by default) — NOT deletion (Codex P1 #10).
Per-target join tables: risk_instance_features / pages / integrations / secrets / data_tables (Codex P2 #17 — no polymorphic FKs).

### Doc 8 — Decisions / ADRs (`decisions/<date>-<slug>.md` per ADR + DB index)
10 fields: id, title, date, status, tags, linked_features, linked_risks, superseded_by, deprecated_reason, body (markdown sections: Context / Decision / Consequences).

**Doc 6 — Inspirations DROPPED.** Sample sites flow to central UI asset repo + ND1 preferences instead.

---

## R4 — ND1 (Stage 1 INPUT, ephemeral)

28 components, 18 mandatory + 10 conditional. Common schema across Type 1 + Type 2.

Mandatory: proposed_slug, proposed_display_name, journey_type, sanity_check_results, core_idea, problem_statement, target_users, non_goals_initial, success_criteria_initial (≥3), likes, dislikes, must_haves, avoid, features_sketch (≥1), flows_sketch, risk_concerns_initial, created_at, session_id.

Conditional (Type 2 / when applicable): inspirations, F1_code, F2_docs, F3_samples, F4_data, data_sketch, ui_hints, tech_hints, integrations_initial, auth_intent.

Lifecycle: archived to `staging/archive/ND1-<datetime>.yaml` after Stage 1 completes.

---

## R5 — Stage 1 (preprocessing + internal process)

### R5.1 — Type 1 preprocessing (8 steps)
Journey detection → sanity check (gate) → initial intent capture → slug+display name → intent deepening dialog (problem/users/non-goals/success) → preferences dialog (likes/dislikes/must_haves/avoid + optional hints) → AI sketches (features/flows/risks) → trigger + ND1 finalize.

### R5.2 — T2P (13 steps)
Same common pattern + F1/F2/F3/F4 processing per artifact. Each artifact gets an MCQ: overhaul / keep-as-is / selective-tweak / discard / identify-likes. Pre-populates intent + preferences from artifact analysis.

### R5.3 — Stage 1 internal process (11 sub-steps)
Read ND1 → carryover application → produce 7 SO1 docs in order (Doc 1, 3, 2, 4, 5, 7, 8) → 5-pass VERIFICATION (format / mandatory / cross-doc / consistency / interconnection) → handoff.

### R5.4 — Carryover rules (ND1 → SO1)
- intent fields → Doc 1 manifest
- likes/dislikes/must_haves/avoid → Doc 1 `preferences` block (NEW field, Doc 1 grows to 14 components)
- ui_hints → Doc 4 component-shortlist preferences
- tech_hints → Doc 8 staging ADR
- integrations_initial → Doc 7 third_party_services seed
- auth_intent → Doc 7 auth_strategy seed
- inspirations → central UI asset repo + project preferences
- F1-F4 → source files moved to repo + decisions in staging ADR
- features/flows/risks_concerns sketches → refined into final SO1

---

## R6 — Stage 2 (UI + Tech finalization)

### R6.1 — 8 sub-stages
Input validation → UI Master Plan (locked theme, palette, fonts, animation, aspect ratios) → pages walkthrough → master components list build (cross-project scan) → component-by-component selection (≥2-3 options per component, user picks) → tech stack + architecture (Mermaid diagrams) → build plan → verification.

### R6.2 — UI Master Plan requirements
- Aspect ratios: desktop / mobile / tablet / both (default both)
- Dark + light modes (mandatory both, no single-mode sites)
- Min 3 accent colors per palette
- 27" desktop + mobile browser support
- Fonts: heading + body + monospace (configurable; Outfit + JetBrains Mono is house default)
- Animation level: none / subtle / smooth / playful
- Spacing/shadow/radius/iconography systems

### R6.3 — Master Components List (cross-project asset library)
Scan all `/mnt/storage/websites/*` → extract components → categorize → cross-reference asset library → identify gaps → seed `master_components` table. 15 entries seeded from real cross-project usage.

### R6.4 — Tech stack defaults
Next.js + Tailwind + better-sqlite3 + drizzle (matches user's ecosystem). Override allowed but defaults set.

### R6.5 — Architecture diagrams via Mermaid (free, text-based)

---

## R7 — Stage 3 (Build + Test)

### R7.1 — 7 sub-stages with verifier
Scaffolding → pipeline setup → code gen → **VERIFIER SUB-AGENT (mandatory anti-gaslighting)** → multi-tier testing → auto-fix loop → verification & deploy.

### R7.2 — Testing tiers
**Always-run** (every push): Unit (Vitest), Component (Playwright), E2E flows (Playwright), Visual regression (Lost Pixel), a11y (axe).
**First-time + nightly**: Lighthouse perf, Load tests (k6), Security scan (Trivy / Grype / OSV-Scanner — NOT Snyk per Codex P1 #11).

### R7.3 — Auto-fix loop
3 iterations max per failure. Stub-detected → bypass auto-fix, escalate to user.

### R7.4 — Per-feature acceptance criteria as test target
"Use case met or not" = atomic done metric. Tests written FROM acceptance criteria. Anti-gaslighting bedrock.

---

## R8 — Stage 4 (Iterate — the user-testing loop)

### R8.1 — 8 sub-stages with lock-in gate at 4.3
Intake → classify → **🆕 PROPOSE & CONFIRM (LOCK-IN GATE)** → route per item → mini-staging (if needed) → mini-build → verifier per item → integrate + trace report.

### R8.2 — Inputs accepted
- Tracker per-flow bug reports
- Tracker project-level mega-prompts
- Direct chat with Claude
- (future) Auto-feedback from runtime monitoring

### R8.3 — Item types
bug / new_feature_request / feature_modification / flow_modification / page_modification / component_modification / risk_addition / re_wire / revamp / observation / question

### R8.4 — Manual classify trigger
Reports stay `status=pending` until user clicks "Analyze". Saves cost on noise.

### R8.5 — Trace report (the payoff)
Per iteration shows: original raw text → extracted items → built per item (file changes, tests run, verifier verdict) → acceptance criteria regression check → ADR if significant.

### R8.6 — User can keep track of "what I asked vs what got built"
This is THE design driver. Without it, user can't trust the system.

---

## R9 — Sanity check (52 checks across 4 stages)

Pre-gate validation. HARD halts; SOFT warns via `AskUserQuestion`; INFO logs.

8 categories: Infrastructure / Identity / Artifacts / Git / Intent / External / Resources / Schema.

### Stage 1: 31 checks
SSH / tracker API / Gitea / disk / docker / slug format+unique / display name / hosting / port / artifacts (F1-F4) / no malicious patterns / no leaked secrets / git state / intent consistency / external refs / asset library / domain / repo dir / migrations / tables / risks_catalog seeded.

### Stage 2: 7 checks
Stage 1 verified / SO1 present / trigger phrase / Mermaid CLI / scan feasible / Browser MCP / API endpoints ready.

### Stage 3: 8 checks
SO2 verified / repo absent (or revive) / Gitea Actions / npm registry / test images / network / disk / Infisical.

### Stage 4: 6 checks (per iteration)
Past Stage 3 / lifecycle / reports table / verifier available / tests passable / live URL.

---

## R10 — Tracker website (now named "Ottomate")

### R10.1 — Repository + naming
- Repo: `git.vault7a.xyz/pdsv/ottomate-tracker-v3`
- Server path: `/opt/homeserver/ottomate/`
- Container: `ottomate`
- Domain: `ottomate.vault7a.xyz`
- Internal port: 8110 (NOT 8101 per Codex P0 #1 — would collide with cricket-stats)
- Localhost-bound: `127.0.0.1:8110:3000` (Codex P1 #8)

### R10.2 — Stack
Next.js 16+ App Router · TypeScript strict · Tailwind v4 · shadcn-style components · drizzle-orm + better-sqlite3 · zod · chokidar (file watcher) · marked (markdown) · recharts.

### R10.3 — Storage philosophy
- DB canonical for structured data
- YAML mirrors in project repos for narrative + git history
- DB→YAML on commit + on "pack up"
- Reverse direction NOT supported (manual edits flagged via drift detection)
- DB backup before destructive ops (Codex P0 #2)

### R10.4 — Auth
- GET endpoints: no auth (localhost-bound + CF Tunnel)
- POST/PATCH/DELETE: bearer token required (Codex Round 2 #2)
- Token: `openssl rand -hex 32 > .token`, mounted as Docker secret
- Same token used for tasks-dashboard webhook outbound

### R10.5 — Cross-cutting features (all approved)
1. Bug Report Inbox (cross-project pending reports)
2. Test Coverage Dashboard
3. Relationships Graph (Feature ↔ Flow ↔ Page ↔ Component)
4. Cross-doc Search (FTS5)
5. Risk Heatmap (cross-project)
6. Master Components Browser
7. cmdk command palette

### R10.6 — Per-doc views (3-view pattern)
List + Detail + Edit (side-panel from right) for every SO1 doc.

### R10.7 — Stage 4 Lock-In Gate UI
Side-by-side panel: original raw text + extracted items as cards (edit / split / merge / reject / approve). "Lock & build" button. Trace report viewer post-integrate.

---

## R11 — Tasks-dashboard separation (CRITICAL — user emphatic)

User's exact words: "TASKS IS MY TO DO LIST NOT TECHNICAL STUFF, FUCK YOU DONT MAKE IT TRACKER."

### R11.1 — Tasks stays exactly as it is
- Port: 8507 (unchanged)
- Domain: tasks.vault7a.xyz (unchanged)
- Repo: git.vault7a.xyz/pdsv/tasks (unchanged)
- DB: /mnt/storage/tasks/tasks.db (unchanged)
- Categories Personal / CV / VEYSS (unchanged)
- Used for personal/household/family/CV/VEYSS todos

### R11.2 — Tasks is a SEPARATE app from Ottomate tracker
Both are independent siblings. Neither modifies the other.

### R11.3 — Optional thin webhook bridge (user's call)
- Tracker → tasks-dashboard: POST /api/tasks when Stage 4 produces user-testing work
- Tasks-dashboard → tracker: webhook fires inside `patchTask()` when status→done (Codex Round 2 #5 — NOT a separate route)
- Explicit external_* columns in tasks (NOT JSON external_ref) per Codex Round 2 #3
- Priority mapping: P0→critical, P1→high, P2→chill, P3→chill (Codex Round 2 #4 — Tasks doesn't have "medium")
- Bearer auth both directions
- Disabled by default; opt-in via env var

### R11.4 — Tasks ALSO onboarded as a tracked project
Tasks-dashboard's metadata (features, flows, etc.) tracked in Ottomate tracker — but tasks-dashboard the APP stays separate. Pilot 3 onboards it.

---

## R12 — Cost minimization

User's hard rule: "no topic should not be spent here" (zero subscriptions).

All tools must be free / self-hostable. Locked choices:

| Concern | Tool |
|---|---|
| CI | Gitea Actions (already on server) |
| E2E tests | Playwright |
| Unit tests | Vitest |
| a11y | axe-core (axe-playwright) |
| Perf | Lighthouse CI |
| Visual regression | Lost Pixel (self-hosted) |
| Load | k6 / Artillery |
| Security scan | Trivy / Grype / OSV-Scanner (NOT Snyk per Codex P1 #11) |
| Runtime errors | GlitchTip (self-hosted Sentry clone) |
| Analytics | Plausible (self-hosted) |
| Secrets | Infisical (self-hosted) |
| Diagrams | Mermaid CLI |
| Component model | shadcn/ui copy-paste |
| Design tokens | Style Dictionary |

---

## R13 — Tracker token / cost optimization for Claude

User's pain: "let us try to minimize the use of Claude as much as possible."

Required mitigations:
- DB does aggregations (coverage / risks heatmap / cross-doc search) — NOT Claude
- Pre-built prompts in `prompts/` folder (loaded once, not regenerated)
- Schema-driven validation (no Claude double-checking format)
- Sub-agent isolation for verifier (~500-2000 tokens vs 50K+ accumulated)
- Per-item processing (don't batch all items in one prompt)
- Skip-if-unchanged sync
- Mermaid CLI for diagrams (Claude only writes the source)
- External tools handle their domains (tests, security, perf)
- Cached project context (load once per session)
- Trigger phrases skip multi-turn dialogs
- Pre-populate from artifacts in T2P (saves 50-70% dialog turns)
- Templates for common project types
- **`/api/projects/[slug]/context-packet` endpoint** (Codex Round 2) — compact scoped packets
- Deterministic evidence collector before verifier (NOT Claude)
- Tier 0 deterministic verifier (no Claude for trivial changes)

---

## R14 — Onboarding 13 existing projects

### R14.1 — Pilot scope (per user direction): 3 projects first
1. **ottomate-tracker-v3 itself** (meta — dogfood)
2. **balls-of-the-bull (BOTB)** — has RCS blocker as 1st iter
3. **tasks** — onboarded as TRACKED PROJECT (not merged with tracker)

### R14.2 — Onboarding modes
- **Lite** — manifest only; for stable shipped projects
- **Standard** — full SO1 backfill from artifacts; for active builds (DEFAULT)
- **Full** — Standard + Stage 2 backfill (UI Master Plan + tech-stack + architecture diagram); for portfolio showcase
- **Archive** — don't migrate; keep v2 row as historical

### R14.3 — Per-project recommendations (from 13-project audit)
- cricket-stats: Full (best v2 data, pilot candidate before BOTB)
- cap-a: Full (mapping showcase)
- balls-of-the-bull: Standard + secret scan
- desi-skies: Full (live, complex pipeline)
- health: Standard + DB-empty as 1st iter
- home: Standard
- media-dashboard: Full (best test coverage)
- ingest: Standard (Python project)
- paata: Standard (move to Docker)
- tasks: Standard (separate app, only metadata)
- portfolio / sms-receiver / vacayornay-data: Archive (empty)

### R14.4 — Stage4-lite for legacy (Codex P1 #6)
Most existing projects don't have Stage 3-quality tests. Reduced Stage 4 mode until acceptance criteria + baseline tests exist.

### R14.5 — Mandatory historical-doc secret scan (Codex P1 #7)
BOTB CLAUDE.md has PDF passwords for credit cards. ALL existing CLAUDE.md files must be scanned + redacted before tracker DB ingest.

---

## R15 — Stage 5 (DEFERRED design)

Per user: "WHATEVER TASKS REMAINING INCLUDING STAGE 5 DESIGN PUT INTO TODO."

Triggered when single-user/home-server constraints change:
- Multi-user auth + roles
- Public-facing project transitions (private → public lifecycle gate)
- Centralized logging + alerting at scale
- Backup orchestration
- DNS / SSL automation beyond NPM
- Performance budgets across home portal
- Observability stack (Grafana / Prometheus / Tempo)

Not designed yet. Outline in TODO.md Phase 14.

---

## R16 — Codex review feedback (applied)

Two rounds of Codex review surfaced issues. All P0 + P1 + Round 2 items applied to design.

### Round 1 P0 (critical)
1. Port collision (8101 used by cricket-stats) → fixed: tracker on 8110, env var TRACKER_API_BASE
2. DB→YAML sync silent destruction → fixed: drift detection + manual-edit dialog + DB backup
3. Lock & build orchestration → fixed: skill = worker, tracker = state store
4. Verifier reads coder claims → fixed: verifier inputs locked manifest + acceptance criteria + diff
5. Schemas missing → fixed: 10 schemas drafted

### Round 1 P1 (strong)
6. Stage4-lite for legacy projects
7. Historical-doc secret scan
8. Localhost-bound Docker port
9. Doc 5 split (Stage 1 conceptual + Stage 2 contract)
10. Risks resolved-not-deleted
11. Snyk → Trivy/Grype/OSV-Scanner
12. Commit-before-rebuild revised (checkpoint commits on iteration branches)

### Round 1 P2 (cleanup)
13. Pick name overview.yaml (not manifest.yaml)
14. iterations.lock_in_audit JSON column
15. pending_user_review enum
16. reports.source field
17. Polymorphic FKs → explicit per-target tables
18. Mojibake encoding fix (deferred — UTF-8 sweep at deploy)

### Round 2 must-fix
1. Bootstrap migration-first (don't copy tasks-dashboard race)
2. Bearer auth on mutations + webhook
3. Tasks schema explicit external_* columns + unique index
4. Priority mapping P0→critical, P1→high, P2→chill, P3→chill
5. Webhook in patchTask() path (not separate route)
6. Verifier allowlist + @intentional-placeholder escape hatch

### Round 2 lock-in gate additions (6 new gates)
Already in R1.4 above.

### Round 2 token savings
Already in R13 above.

---

## R17 — User behavior preferences

### R17.1 — Use AskUserQuestion tool for choices
Always clickable MCQs, never prose questions. Captured in feedback memory file.

### R17.2 — Critique, don't rubber-stamp
User said: "I really want you to read the entire transcript and critique everything I'm saying rather than blindly following me. So ask me questions."

### R17.3 — Be opinionated
"Recommend, don't just list options."

### R17.4 — Solutionize
User: "I'm very good at solutionizing things." Welcomes detailed engagement.

### R17.5 — Trigger phrases govern pacing
User explicitly designed this. Detect "let's move on", "next", etc. and advance without re-asking confirmations.

### R17.6 — Don't add features unless explicitly asked
User: "DO ALL TASKS BUT PLANNING TO INTEGRATE ONLY FEW WEBSITES FIRST." Respect explicit scope.

---

## R18 — File / repo / domain conventions

| What | Convention |
|---|---|
| Project slugs | kebab-case, `^[a-z][a-z0-9-]+$`, 3-40 chars |
| Domains | `<slug>.vault7a.xyz` via Cloudflare Tunnel + NPM proxy |
| Server paths | `/mnt/storage/websites/<slug>/` for projects; `/opt/homeserver/<service>/` for infra |
| Gitea repos | `git.vault7a.xyz/pdsv/<slug>` |
| Plugin location | `~/.claude/plugins/<plugin-name>/` |
| Skill within plugin | `skills/<skill-name>/SKILL.md` + references/ + schemas/ + prompts/ |
| Memory files | `~/.claude/projects/<project>/memory/*.md` |

---

## R19 — Server access

- SSH: `pdsv@192.0.2.10` (key-only auth; password redacted 2026-06-10)
- All file ops via SSH + SCP
- **Never SSH heredoc for code files** (corrupts via shell escaping)
- **Always commit before docker rebuild** (rebuilds wipe uncommitted)
- **Sub-agents must preserve existing code** (read full file first, modify only target section)

---

## R20 — Things explicitly OUT OF SCOPE

User has said NO to:
- Merging tasks-dashboard with tracker (was almost done, reversed at user's emphatic request)
- Building Stage 5 now (deferred)
- Multi-user auth (single-user only)
- Real-time websockets in v3 (polling is fine; v4 if needed)
- Mobile native apps (web + mobile browser only)
- Offline mode
- SaaS subscriptions (everything self-hosted)
- Migrating empty projects (portfolio, sms-receiver, vacayornay-data — Archive)
- Onboarding all 13 projects in pilot (3 projects first)

---

## R21 — Living rules + master rules

From the original `/project` skill, ported to v2 with refinements:

1. Everything on the server (project files); local files are temp for SCP only
2. DB canonical, YAML mirror — structured data → DB, narrative → git files
3. Be opinionated — recommend, don't list
4. Always pull before, push after
5. Escalate scope explicitly (no silent expansion)
6. Write code via SCP, never SSH heredoc
7. Commit before rebuild (Docker wipes uncommitted; checkpoint commits on iteration branches per Codex Round 2 #12)
8. Sub-agents preserve existing code (read full file first)
9. Clean up temp files after SCP
10. Verifier mandatory (no "small fix, skip verifier")
11. Risks resolve, don't delete
12. Lock-in gate before build (Stage 4.3) — user confirms structured items before any code change
13. Bearer auth on all mutations (Codex Round 2)
14. Migration-first DB bootstrap (Codex P0 #1)
15. Sanity check before any preprocessing dialog

---

## R22 — Master rule (highest cardinality)

User: "I AM MOVING TO ANOTHER SESSION..." — handoff capability is required. The skill must produce documents at every checkpoint that allow a fresh session to pick up exactly where work left off.

This file (REQUIREMENTS.md) is part of that. So is HANDOFF.md, STATUS.md, TODO.md, PENDING.md, DECISIONS.md, DONE.md, SKILL_OVERVIEW.md, TRACKER_OVERVIEW.md.

---

## How to verify a future change against requirements

When making any change to the design / skill / tracker:
1. Find the relevant R-number(s) in this file
2. Check the change is consistent
3. If a change CONFLICTS with a requirement, get explicit user approval
4. If a change EXTENDS a requirement, note it in this file (as RX.Y new sub-item)
5. Update DONE.md / PENDING.md to reflect the change
