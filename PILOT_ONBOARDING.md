# Pilot Onboarding Plan

The 3 projects to onboard FIRST as proof-of-concept for the new skill. Per user direction.

## Order of execution

| # | Project | Why this order | Mode |
|---|---|---|---|
| 1 | **ottomate-tracker-v3** (this app, meta) | Dogfood. Proves skill works on its own codebase. | Live-build |
| 2 | **balls-of-the-bull** (BOTB) | Real active project with known blocker (RCS/MacroDroid). Tests Standard onboarding + Stage 4 flow. | Standard + 1st iter on blocker |
| 3 | **tasks** (personal todo) | Tracked as a project (NOT merged with tracker). Tests "non-tracker app onboarded as project" flow. | Standard catchup |

---

## Pilot 1 — `ottomate-tracker-v3` (meta)

**Goal:** the tracker tracks its own development.

### Prerequisites
- Phase 1-2 of TODO.md done (DB migrated, basic API endpoints working)
- Skill v2 invocable as `/ottomate`

### Steps

1. **Manual project row creation** (until Phase 4 UI exists, do via API):
   ```bash
   curl -X POST http://127.0.0.1:8110/api/projects \
     -H "Authorization: Bearer $TRACKER_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "slug": "ottomate",
       "display_name": "Ottomate",
       "tagline": "Web project tracker companion to /ottomate skill",
       "current_status": "building",
       "lifecycle_phase": "building",
       "scope_size": "large",
       "target_devices": "desktop",
       "hosting_target": "vault7a-docker",
       "port": 8110,
       "public_url": "https://ottomate.vault7a.xyz",
       "repository_url": "http://git.vault7a.xyz/pdsv/ottomate-tracker-v3"
     }'
   ```

2. **Run Stage 1 catchup** via skill:
   ```
   /ottomate ottomate
   → "Resume project ottomate. State shows lifecycle=building, no SO1 docs yet. Run Stage 1 catchup?"
   → user: yes
   → Skill invokes Stage 1 internal process, but reads existing files instead of asking from scratch:
     - manifest.yaml fields from this README + TODO.md
     - features.yaml from TODO.md phase list (each phase becomes a feature)
     - flows.yaml from key user flows (project list view, lock-in gate, search, etc.)
     - ui.yaml from app/ directory structure
     - data.yaml from lib/db/schema.ts
     - risks.yaml — auto-detect: no-tests (currently true), no-error-tracking (currently true), no-ci (workflow not set up)
     - decisions/ — copy ADRs from /memory/ files into local decisions/ folder
   ```

3. **First Stage 4 iteration** = build Phase 1 (DB migrate + seed):
   ```
   user: "Apply migrations and run seeds. First iteration."
   → Skill classifies as iteration_item type=feature_modification (existing Phase 1)
   → Lock-in panel: 3 items locked (npm install, run migrate, run seeds)
   → Build via mini-pipeline
   → Verifier checks: migrations applied (DB has tables), seeds inserted (50 risks + 15 components)
   → Integrate
   ```

4. **Validate end-to-end:**
   - All 7 SO1 yaml mirrors present in `/opt/homeserver/ottomate/` (overview.yaml etc.)
   - features.yaml has Phase 1-13 entries
   - First iteration's trace report shows what was built vs what was claimed

### Success criteria
- ottomate project visible in tracker UI (when Phase 4 done) at `/project/ottomate`
- Stage 4 lock-in gate works on a real iteration
- Verifier sub-agent catches at least one stub or partial during build

### Risks
- Schema migrations might fail on first run (tasks-dashboard had `runBootstrap` race; we use migration-first to avoid)
- Sub-agent verifier requires Anthropic API access from server (need to set ANTHROPIC_API_KEY)
- No tests yet → verifier acceptance criteria pass D fails for everything; expect ITERATE recommendations

---

## Pilot 2 — `balls-of-the-bull` (BOTB)

**Goal:** validate Standard onboarding + Stage 4 on a real, active project with a known blocker.

### Prerequisites
- Pilot 1 complete (ottomate-tracker-v3 running + working)
- Phase 4 tracker UI partially working (project list + detail tabs at minimum)

### Steps

1. **🔴 MANDATORY SECRET SCAN FIRST** (Codex P1 #7):
   - BOTB's CLAUDE.md contains credit card PDF passwords (sensitive!)
   - Run secret scan over `/mnt/storage/websites/balls-of-the-bull/`
   - Redact secrets BEFORE backfilling tracker
   - Add to risk_instances: `leaked-secrets-git` instance with status=open, affected=[CLAUDE.md]

2. **Standard onboarding via skill:**
   ```
   /ottomate balls-of-the-bull
   → "Project balls-of-the-bull found at /mnt/storage/websites/balls-of-the-bull. No tracker row. Onboard?"
   → user: yes, Standard mode
   → Skill backfills:
     - manifest.yaml from CLAUDE.md (Step 3 iteration 28, Capacitor for Android, port 8501)
     - features.yaml from app/ + components/ structure (ExpenseTracker, RecurringExpenses, FoodAnalytics, CreditCards, calculators...)
     - flows.yaml from observable navigation (10 main flows: view expenses, classify SMS, calculate FIRE, etc.)
     - ui.yaml from app/expenses/, app/cards/, app/calculators/ directories
     - data.yaml from manual SQLite + ingest service (port 8600) integration
     - risks.yaml: temp-api-key (INGEST_API_KEY), pii-in-logs (financial), unencrypted-storage (financial PII), no-tests (only 3 vitest files)
     - decisions/ folder created with key decisions extracted from CLAUDE.md "Architecture" section
   ```

3. **First Stage 4 iteration** = RCS / MacroDroid blocker:
   ```
   user: "MacroDroid not triggering on RCS messages. Need fix. First iteration."
   → Classify: bug, target=feat-sms-ingestion (auto-created), severity=major
   → Lock-in panel review
   → User locks
   → Skill builds:
     - Sub-agent investigates (read MacroDroid config, RCS detection logic in ingest service)
     - Proposes fix (use Monitor inbox API instead of SMS forwarding)
     - Verifier confirms fix logic is real (not stub) + passes test (send test SMS, count rows)
   → Integrate
   → Trace report shows: original "MacroDroid not triggering" → 1 bug item locked → fix in 2 files → verifier verified → resolved
   ```

### Success criteria
- BOTB visible in tracker with all 7 SO1 docs populated
- Sensitive data scrubbed (no PDF passwords in tracker DB)
- Real blocker resolved as first iteration
- Trace report shows clear what-asked-vs-what-built

### Risks
- Capacitor Android wrap = special target_devices: both — tracker UI must handle this
- Iteration 28's CLAUDE.md is heavy (256 lines) — may need backfill chunking
- Stage4-lite (Codex P1 #6) needed since BOTB has only 3 tests (not Stage 3 quality)

---

## Pilot 3 — `tasks` (personal todo dashboard)

**Goal:** validate tracking a non-tracker app as a project (without merging it with tracker).

### Crucial reminder
**TASKS-DASHBOARD STAYS AS PERSONAL TODO.** This pilot tracks tasks-dashboard's METADATA in tracker (features, flows, etc.) — it does NOT merge tasks-dashboard's functionality into tracker.

### Prerequisites
- Pilots 1 + 2 done
- Phase 4 tracker UI working

### Steps

1. **Standard onboarding via skill:**
   ```
   /ottomate tasks
   → "Project tasks found. Onboard as Standard?"
   → user: yes
   → Skill backfills:
     - manifest.yaml: lifecycle=shipped, scope_size=medium, target_devices=both, port=8507
     - features.yaml: extracted from CLAUDE.md "What's Done" + "Build Progress" — Kanban, List, Tree, Archive, cmdk, Sidebar tree, Projects+Categories hierarchy, Inbox, etc.
     - flows.yaml: from observable behavior — Add task, Drag task between columns, Filter by category, Quick-add via cmdk, Triage inbox, etc.
     - ui.yaml: 19 pages from app/ directory; components from cross-project scan
     - data.yaml: drizzle + SQLite + FTS5 + first-run JSON import
     - risks.yaml: no-auth (single-user), data-retention-unclear, no-rate-limit, runBootstrap-quirk (already documented)
     - decisions/ — port the 9 decisions from CLAUDE.md "Decisions" section into ADR files
   ```

2. **No first iteration needed** — tasks is shipped. Just track ongoing iterations as user actually works on it.

3. **Optional webhook bridge setup** (per `tasks-dashboard-tweaks.md`):
   ```
   user: "Set up the webhook bridge so tracker iterations create tasks here"
   → Skill walks through:
     1. Add 4 columns to tasks-dashboard tasks table (external_system, external_kind, external_id, external_url + unique index)
     2. Update patchTask() in lib/tasks/service.ts to fire outbound webhook on status→done
     3. Set TRACKER_API_TOKEN in tasks-dashboard .env
     4. Set TASKS_DASHBOARD_API + TASKS_DASHBOARD_TOKEN in tracker .env
     5. Test with a manual webhook fire
   → Mark as iteration in tracker: "Connect tasks-dashboard webhook bridge"
   ```

### Success criteria
- tasks visible in tracker as a fully populated project (Stage 1 done)
- tasks-dashboard at port 8507 still works exactly as before (zero disruption)
- Optional: webhook bridge fires correctly on a test task completion

### Risks
- tasks-dashboard's runBootstrap quirk is documented — when adding 4 new columns, must NOT trigger same race
- Tasks-dashboard has 0 ADRs in `decisions/` folder; backfill creates many ADRs at once (chunking concern)

---

## Cross-pilot decisions to capture

After all 3 pilots:
- Did Stage 1 catchup work cleanly for all 3? (especially BOTB with sensitive data)
- Did the verifier sub-agent catch real issues vs spurious flags?
- Is the lock-in gate UX clear enough? (BOTB iteration was first real test)
- Did file watcher / DB↔YAML sync work without drift?
- What pieces of skill design need refinement based on real usage?

Outcome: write a `pilot-retrospective.md` ADR after the 3 pilots. That informs the rest of phases 11-13.

---

## After pilots: full migration

Per `13-projects-audit.md`, run remaining onboardings:
- cricket-stats (Full mode — best v2 data)
- cap-a (Full)
- desi-skies (Full)
- media-dashboard (Full — best test coverage)
- health (Standard + DB-empty blocker)
- home (Standard)
- ingest (Standard — Python project)
- paata (Standard — moves to Docker)

Skip: portfolio, sms-receiver, vacayornay-data (empty dirs).
