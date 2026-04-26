# Decisions Log — Chronological

Every locked design decision throughout the conversation, in order. Use this when re-reading why something is the way it is.

---

## D1 — Pipeline naming convention (LOCKED early)
**User-driven.** Type 1 / Type 2 / F1-F4 / ND1 / SO1 / T2P. User explicitly proposed this convention; AI endorsed.

## D2 — Anti-gaslighting as #1 priority
**User-driven.** Multiple sessions established this. Drives every design choice.

## D3 — 4-stage pipeline (Preprocessing → Stage 1 → Stage 2 → Stage 3 → Stage 4)
**Iterative.** Stage 5 deferred. User confirmed at multiple checkpoints.

## D4 — 7 SO1 docs (Doc 6 Inspirations dropped)
**User-driven.** User explicitly dropped Inspirations. Sample sites flow to central asset repo + ND1 preferences.

## D5 — Lock-in gate at Stage 4.3 (the most novel piece)
**User-driven.** User said: "pick from what I asked, create feature reqs/bugs/modifications, then build from what created." Spawned the lock-in gate concept that became the anti-gaslighting bedrock.

## D6 — Verifier sub-agent for Stage 3 + Stage 4
**Co-driven.** User wanted "AI to verify it's actually built"; AI proposed independent sub-agent pattern. Codex P0 #4 refined it (input contract = locked items + acceptance criteria + expected_artifacts manifest, NOT coder claims).

## D7 — Storage hybrid: DB canonical + YAML mirror
**AI-proposed, user-approved.** "Structured data → DB, narrative → git files."

## D8 — Tracker stays separate from tasks-dashboard (REVERSED earlier merge plan)
**User-driven (emphatic).** User reversed earlier "extend tasks-dashboard" plan with: "TASKS IS MY TO DO LIST NOT TECHNICAL STUFF, FUCK YOU DONT MAKE IT TRACKER." Tasks stays as personal todo. Tracker built fresh. Optional webhook bridge.

## D9 — Risks resolve, don't delete (Codex P1 #10)
**Codex-driven, user-approved.** Earlier "delete on resolve" was lossy. Resolved status with `resolved_at` + `resolution_summary`, hidden by default.

## D10 — Bearer auth on mutations (Codex Round 2 #2)
**Codex-driven.** Even single-user, POST/PATCH/DELETE need bearer token.

## D11 — Migration-first DB bootstrap (Codex Round 2 #1)
**Codex-driven.** Don't copy tasks-dashboard's `_sqlite-before-runBootstrap` race. Use promise mutex.

## D12 — Tracker port 8110 (NOT 8101)
**Codex-driven.** 8101 collides with cricket-stats. New port 8110, env var `TRACKER_API_BASE`.

## D13 — Localhost-bound Docker (Codex P1 #8)
**Codex-driven.** `127.0.0.1:8110:3000` (not `8110:3000`). Cloudflare Tunnel handles external access.

## D14 — Doc 5 (Data) split into Stage 1 conceptual + Stage 2 contract (Codex P1 #9)
**Codex-driven.** Earlier Doc 5 had schema/indexes/DB engine in Stage 1 — that's tech, contradicts "no tech in Stage 1." Split.

## D15 — Verifier allowlist + escape hatch (Codex Round 2 #6)
**Codex-driven.** "Any TODO is hard fail" was too blunt — caught legitimate backlog/test/doc comments. Allowlist for `tests/`, `docs/`, etc. Plus `@intentional-placeholder` annotation requiring user lock-in approval.

## D16 — Free / self-hosted only (no Snyk; use Trivy/Grype/OSV-Scanner)
**User constraint** ("no topic should not be spent here"). Codex P1 #11 specifically replaced Snyk.

## D17 — Stage4-lite mode for legacy projects (Codex P1 #6)
**Codex-driven.** Most existing projects don't have Stage 3-quality tests. Reduced Stage 4 mode until tests + acceptance criteria exist.

## D18 — Mandatory historical-doc secret scan (Codex P1 #7)
**Codex-driven.** BOTB CLAUDE.md has PDF passwords. ALL existing CLAUDE.md must be scanned + redacted before tracker DB ingest.

## D19 — Polymorphic FKs replaced with explicit per-target tables (Codex P2 #17)
**Codex-driven.** SQLite can't enforce polymorphic FKs. Use explicit tables: `risk_instance_features`, `risk_instance_pages`, etc.

## D20 — overview.yaml (not manifest.yaml) (Codex P2 #13)
**Codex-driven.** Pick one name. Used `overview.yaml` to match the doc name "Project Overview."

## D21 — Tasks bridge: explicit external columns (Codex Round 2 #3)
**Codex-driven.** NOT JSON `external_ref`. Explicit `external_system`, `external_kind`, `external_id`, `external_url` columns + unique index for dedupe.

## D22 — Tasks priority mapping (Codex Round 2 #4)
**Codex-driven.** Tasks doesn't have "medium". Map P0→critical, P1→high, P2→chill, P3→chill.

## D23 — Webhook in patchTask() path (Codex Round 2 #5)
**Codex-driven.** Tasks completion happens via `PATCH /api/tasks/[id]`. NOT a separate `/webhooks/task-completed` route. Webhook fires INSIDE `patchTask()` on status→done.

## D24 — `pending_user_review` enum + `lock_in_audit` JSON column (Codex P2 #14, #15)
**Codex-driven.** Iteration status needs `pending_user_review`. Lock-in audit needs explicit JSON column for the review trail.

## D25 — `reports.source` field (Codex P2 #16)
**Codex-driven.** Reports need to know they came from tracker-flow-bug / tracker-mega-prompt / chat / auto-feedback. Explicit field.

## D26 — Skill = worker, Tracker = state store (Codex P0 #3)
**Codex-driven.** Tracker doesn't orchestrate builds. Skill polls iteration status; runs builds itself; writes results back.

## D27 — Context-packet endpoint (Codex Round 2 token saver)
**Codex-driven.** `GET /api/projects/[slug]/context-packet?item_id=&scope=` — Claude receives compact scoped packets (~5-10K tokens) instead of full SO1 docs (~50K).

## D28 — Tracker name "Ottomate" (LOCKED in build phase)
**User-driven.** "name the tracker website as Ottomate."

## D29 — Tracker domain `ottomate.vault7a.xyz`
**User-driven.** Confirmed via question option pick.

## D30 — Skill plugin location `~/.claude/plugins/ottomate-v2/`
**User-driven.** "create a new skill called ottomate." Implemented as parallel plugin so existing `ottomate` plugin remains as backup.

## D31 — Skill name within plugin: `ottomate`
**User-driven.** New skill, named after the system. Invocation becomes `/ottomate`.

## D32 — Repository `ottomate-tracker-v3` for tracker
**Pragmatic.** `ottomate` repo exists (skill system). `ottomate-tracker` was v2. Used `-v3` for parallel development.

## D33 — Build order: skill scaffolding + tracker scaffolding first
**User-driven.** "Foundations first: skill scaffolding + tracker scaffolding."

## D34 — Pilot scope: 3 projects (ottomate-self / BOTB / tasks)
**User-driven.** "tasks, balls of the bull, news dashboard (if present)" — news-dashboard doesn't exist on server. Pilot adjusted to ottomate-self (meta) + BOTB + tasks.

## D35 — Tasks onboarded as TRACKED PROJECT (NOT merged with tracker)
**User-driven.** Reaffirmed user's earlier reversal. Tasks-dashboard at port 8507 unchanged. Only metadata tracked in Ottomate.

## D36 — Stage 5 deferred (DONE — captured in TODO Phase 14)
**User-driven.** "WHATEVER TASKS REMAINING INCLUDING STAGE 5 DESIGN PUT INTO TODO."

## D37 — Use `AskUserQuestion` tool for choices, not prose
**User-driven, captured early.** All clarifying choices use clickable MCQ.

## D38 — Be opinionated; recommend; don't list options
**User-driven.** "Recommend, don't just list options." Skill must propose defaults.

## D39 — Critique, don't rubber-stamp
**User-driven.** "Read the entire transcript and critique everything I'm saying rather than blindly following."

## D40 — Trigger phrases bypass dialog confirmations
**User-driven.** "Detect 'let's move on', 'next', etc." User explicitly designed this for pacing control.

## D41 — Universal SO1 set scoped to 8 mandatory + 3 conditional
**User-driven (after multiple iterations).** Final list narrowed to: manifest, features, flows, ui, data, risks, decisions, with conditionals for code-audit / migration-plan / etc.

## D42 — `target_devices` field added to Doc 1 (post-Codex)
**User-driven.** Mobile/desktop decision was earlier "in product overview" — formalized as a manifest field.

## D43 — Doc 1 grows from 13 to 14 components (preferences carry from ND1)
**Carryover rule.** Likes/dislikes/must_haves/avoid from ND1 land in `manifest.preferences` block.

## D44 — ADR lean from 7 to 10 components (post-audit)
**Audit fix.** Added tags + linked_features + linked_risks. Restores queryability without full bloat.

## D45 — 50 risk types in global catalog (across 6 categories)
**Curated by AI from real cross-project scan.** Auth/Access (8), Secrets/Env (6), Data/Storage (10), API/External (8), UI/XSS (6), Performance (8), Process (4).

## D46 — 15 master components seeded from real cross-project scan
**Curated by AI.** Stat cards (gradient + glass), animated numbers, command palette, sidebar, kanban, etc. — all actually used in 6 sample projects scanned.

## D47 — Mojibake encoding fix DEFERRED (Codex P2 #18)
**Pragmatic.** UTF-8 sweep needed before docs become AI prompts. One-shot fix at deploy time, not now.

## D48 — Master Components Browser feature (cross-cutting tracker UI)
**User + AI co-driven.** Surfaces central asset library. Stage 2 component selection queries this.

## D49 — 4 cross-cutting tracker features approved
**User-driven.** Bug Inbox, Coverage Dashboard, Relationships Graph (Feature ↔ Flow ↔ Page ↔ Component), Cross-doc Search. All to be built (Phase 8).

## D50 — Cmdk command palette in tracker UI
**Inherited pattern from tasks-dashboard.** Used as reference (NOT shared code).

## D51 — Trigger-phrase-based skip for stale prompts
**User-driven.** User can interrupt multi-turn dialogs by typing trigger phrases.

## D52 — Drift detection for manual YAML edits (Codex P0 #2)
**Codex-driven.** Hash-based detection + manual-edit-detected dialog with options (import / overwrite / abort).

## D53 — DB backup before destructive ops (Codex P0 #2)
**Codex-driven.** `POST /api/backup` snapshots DB before cutover, mass migration, schema change, etc.

## D54 — Per-project Onboarding Modes (Lite / Standard / Full / Archive)
**AI-proposed, user-approved.** Different onboarding ceremony per project tier.

## D55 — Stage 1 sanity check is GATE before preprocessing dialog
**User-driven (early)** + AI design. Don't waste 10 min on dialog if environment is broken.

## D56 — Per-stage sanity check (Stage 2 / 3 / 4 transitions)
**AI-proposed.** Each stage transition has its own checks (smaller — 6-8 each).

## D57 — Stage 4 verifier runs PER ITEM, not per iteration
**User-driven.** "Each bug claimed fixed gets independent verification." Anti-gaslighting bedrock for Stage 4.

## D58 — Repository names + naming conventions (LOCKED)
- Project slugs: kebab-case, `^[a-z][a-z0-9-]+$`, 3-40 chars
- Domains: `<slug>.vault7a.xyz`
- Server paths: `/mnt/storage/websites/<slug>/`
- Plugin path: `~/.claude/plugins/<plugin-name>/`

## D59 — Memory file locations
**Pragmatic.** `~/.claude/projects/<project>/memory/<topic>.md`. `MEMORY.md` is index of bullet links.

## D60 — Pack-up reconciliation lock (Codex Round 2 #14 lock-in gate)
**Codex-driven.** Final session-close screen showing done/not-done/deferred/risks/commits before pack-up runs.

---

## Decisions deferred (no decision yet)

- D-pending — Pack-up auto vs manual final review (per-session toggle?)
- D-pending — Visual regression tool: Lost Pixel vs Percy free vs Playwright screenshots (default: Lost Pixel)
- D-pending — Infisical deploy timing (when secrets management painful)
- D-pending — GlitchTip deploy timing (when first project hits Stage 5)
- D-pending — NPM proxy automation (manual via UI vs scripted via API)

These decisions get made at the relevant phase, not preemptively.

---

## How to add a new decision to this log

When making a new design decision in a future session:
1. Add a new D-number entry at the bottom (don't insert mid-list)
2. Note: User-driven / Codex-driven / AI-proposed
3. Note relevant Codex P-flag if applicable
4. Cross-reference REQUIREMENTS.md R-number if applicable
5. Update DONE.md / PENDING.md
6. Commit the decision with message "Decision DXX: <one-line summary>"
