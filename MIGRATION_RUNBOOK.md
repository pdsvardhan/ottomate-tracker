# MIGRATION_RUNBOOK — Onboarding existing projects into Ottomate v3

**Purpose:** satisfies AC4 of feat-phase-10 ("MIGRATION_RUNBOOK.md exists ... so the remaining 6 projects onboard mechanically without re-discovery"). Captures the mechanical playbook + every bespoke fix encountered during pilot onboarding so the remaining projects don't re-discover them.

**Scope:** projects whose tracker row exists but SO1 is incomplete (missing success_criteria, non_goals, risks, ADRs, AC, UI master plan, components, etc.) and code is already shipped. NOT a Stage 0 (`/ottomate new`) flow — for that, see `references/stage-0-overview.md` in the skill.

---

## Pilot history

### Pilot 1 — `ottomate` (self) · done 2026-05-15
- T2P 13-step preprocessing flow walked.
- Stage 1 internal sub-steps 1.1–1.11 populated Docs 1–5, 7, 8.
- 30 components + 6 third-party-services backfilled.
- `palette_light` + `tech_stacks` rows added.
- ADR-008-build-plan-v1 logged (14 phases).
- 7 YAML mirrors written to `/opt/homeserver/ottomate/ottomate/`.
- Repaired pre-existing FTS5 corruption (tree-82 cells + malformed inverted index) via dump+rebuild.

### Pilot 2 — `cointrail` (renamed from BOTB) · Phase A done 2026-05-19, B–G pending
- Phase A backfill done:
  - 3 ADRs imported with descriptive ids (`adr-001-cointrail-staging`, `adr-002-cointrail-ui-master-plan-lock`, `adr-003-cointrail-stage-2-3-catchup`).
  - 5 non-goals from `preferences.avoid` (sort 1–5).
  - 6 baseline risks (no-tests open w/ unverified-coverage note; no-auth, no-backup, hardcoded-credentials, no-monitoring, mobile-broken).
- Phase B–G remaining: success_criteria, per-feature AC, UI master plan retro-write, components catalog backfill, tech_stacks, YAML mirror reconciliation, completion ADR.

### Pilot 3 — `tasks` · queued
- Lifecycle already `shipped`/`building`; UI master plan + ADRs present in Ottomate.
- Likely smallest onboarding gap of the three pilots.

---

## Mechanical onboarding playbook

For each unmigrated project, run the phases in order. Each phase has a clear exit signal — don't proceed until it's met.

### Phase A — Deterministic baseline backfill (≤15 min)

Goal: light up anti-gaslight rule 3 (`≥1 AC per feature` and `≥3 baseline risks`) plus non-goals + success_criteria + ADR import. No AI inference required (mostly).

1. **Pre-flight:**
   - Verify `GET /api/projects/<slug>` returns a row (404 → `/ottomate new` instead).
   - Verify `test -d /mnt/storage/websites/<slug>` (otherwise → Rule A halt).
   - List `/mnt/storage/websites/<slug>/decisions/` for pre-existing ADR `.md` files.
   - List `/mnt/storage/websites/<slug>/ottomate/` for any v2-era YAML mirrors.

2. **ADR import** (if `decisions/` has `.md` files):
   - Read each `.md` file's frontmatter `id` field.
   - **MUST** convert generic `adr-NNN` ids to descriptive form `adr-NNN-<slug-suffix>` before POST. The POST validation enforces `^adr-\d{3,}-[a-z][a-z0-9-]*$` (Rule 17 / SKILL.md). `adr_index.id` is a global primary key.
   - Patch the `.md` frontmatter `id:` line to match the new descriptive id (avoid drift between DB and disk).
   - POST each: `POST /api/projects/<slug>/adr-index` with `{id, title, date, status, tags, body_path}`.

3. **Non-goals:**
   - Copy `projects.preferences.avoid` array → POST one per item to `/api/projects/<slug>/non-goals` with `{content, sort_order}` 1..N. Source-substring satisfied.

4. **Baseline risks:**
   - Run the auto-detect checklist:
     - `no-tests` if no `vitest`/`playwright`/`e2e` config OR no test files. **Important:** files existing ≠ coverage measured. If files exist but coverage unverified, POST with `status='open'` and a note like `"vitest + e2e/* configured but coverage and pass-rate unverified; run suite next slice"`. Don't auto-mitigate.
     - `no-error-tracking` if no `glitchtip`/`sentry` config or env var.
     - `no-rate-limit` if no rate-limit middleware in `middleware*` / `lib`.
     - `no-backup` if no automated backup cron.
     - `outdated-deps` if `npm audit` shows ≥1 high/critical.
   - Plus project-specific risks from any existing `ADR-001` frontmatter `linked_risks` field.
   - POST each to `/api/projects/<slug>/risk-instances`.

### Phase B — Success criteria (~10–15 min)

1. Read `projects.problem_statement`, `projects.core_idea`, `projects.preferences.must_haves`.
2. Draft 3–5 measurable success criteria — each tied to a source-substring from the above (anti-gaslight rule 1).
3. Use `AskUserQuestion` for batch approval. POST one per item to `/api/projects/<slug>/success-criteria`.

### Phase C — Per-feature acceptance criteria (~20–30 min)

1. For each feature in `GET /api/projects/<slug>/features`:
   - Read `title`, `short_description`, `notes`.
   - Draft 1–5 AC (max enforced server-side). Focus on outcome / observable behavior, not implementation.
   - Use `AskUserQuestion` per feature OR batch with a multi-feature panel.
   - POST to `/api/projects/<slug>/features/<feature_id>/acceptance-criteria`.

### Phase D — UI master plan retro-write (~30–45 min)

1. Read `CLAUDE.md` + `app/globals.css` + main layout file from the project repo.
2. Infer fields: aspect_ratios, palette_dark, palette_light (if dark/light split), fonts, animation_level, type_scale, spacing_scale, WCAG_compliance.
3. POST to `/api/projects/<slug>/ui-master-plan` with the full payload.
4. Log an ADR: `adr-NNN-<slug>-ui-master-plan-locked` with status=accepted.

### Phase E — Components catalog backfill (BIGGEST step; ~45–90 min)

1. For each page in `GET /api/projects/<slug>/pages`:
   - Read the corresponding `app/<route>/page.tsx` (or equivalent).
   - Identify each primitive used. For each:
     - Query `master_components` by category + tags.
     - Surface ≥2–3 options via `AskUserQuestion`.
     - User picks → POST `{asset_library_ref, picked: true}` OR `{skip_reason: "..."}`.
   - Anti-gaslight Rule 10: every component MUST have `asset_library_ref` OR `skip_reason` at exit. HARD halt otherwise.

### Phase F — Stage 3 plumbing catchup (~20 min)

1. `tech_stacks` row: derived from `package.json` deps + Docker compose service.
2. `third_party_services` rows: from `.env`/`.env.example` + Docker network membership.
3. `architectures`: ensure `.mmd` files in `/mnt/storage/websites/<slug>/architecture/` are linked.
4. `build_plans` row: phase-by-phase plan.

### Phase G — YAML mirror reconciliation + completion ADR

1. Run `npm run mirror:write -- <slug>` server-side from `/opt/homeserver/ottomate/`.
2. Verify `yaml_mirror_state.drift_detected_at IS NULL` for every doc.
3. Log completion ADR: `adr-NNN-<slug>-onboarding-complete` with status=accepted.
4. PATCH `feat-phase-10.notes` to append the pilot's completion line.

---

## Known bespoke fixes (one-time captures from pilots)

| # | Symptom | Cause | Fix |
|---|---|---|---|
| 1 | FTS5 search returns 0 rows or errors | Corrupted FTS index (tree-82 cells / malformed inverted index) | Dump entire FTS table contents, drop, recreate, re-insert |
| 2 | `POST /adr-index` returns 409 `ADR 'adr-001' already exists` | `adr_index.id` is a **global** primary key, not (project_slug, id) composite | Use descriptive id form `adr-NNN-<slug-suffix>`. Enforced by regex `^adr-\d{3,}-[a-z][a-z0-9-]*$` since 2026-05-19 |
| 3 | `sqlite3 /opt/homeserver/ottomate/ottomate.db` returns "no such table" | `sqlite3` CLI is NOT installed on the VAULT7A host | Query via the Ottomate API instead, or `apt install sqlite3` |
| 4 | `no-tests` risk should be `mitigated` because test files exist | Test files existing ≠ tests passing | Keep `status='open'` with a note documenting that coverage is unverified. Only mark mitigated after actual `npm run test` + e2e + k6 confirm. |
| 5 | Legacy project slug (e.g. `balls-of-the-bull` → `cointrail`) leaves stale references in feature notes / ADR titles | Manual rename without sweep | sed-replace across `/mnt/storage/websites/<slug>/` and all `feat-phase-N.notes` / `feat-phase-N.short_description` fields. Verify via `grep -r "<old-slug>" /opt/homeserver/ottomate/ottomate*` |
| 6 | `context-packet` doesn't include `current_status` | Route omitted from select projection | Add `current_status: project.current_status` to the `packet.project` block. Fixed 2026-05-19 (commit `12ec469`) |
| 7 | Pre-existing v2-era YAML mirrors in `/mnt/storage/websites/<slug>/ottomate/` | Legacy schema; partial doc coverage | Compare against current schema before overwriting. Treat them as inputs for Phase A discovery, not ground truth. |

---

## Per-project status snapshot (2026-05-19)

| Slug | Lifecycle | fl/ft/pg | ng/sc/rk/adr | UI MP | Pipeline read |
|---|---|---|---|---|---|
| ottomate | building | 20/20/18 | 6/6/5/8 | yes | Stage 3 active · Phase 10 building |
| tasks | building | 13/20/13 | 4/7/10/4 | yes | Stage 3 → 4 |
| media-dashboard | building | 8/15/18 | 6/6/6/25 | yes | Stage 4 deep |
| cointrail | building | 11/9/6 | 5/0/6/3 | no | Stage 1 mid (Phase A done; B–G pending) |
| portfolio | building | 13/18/0 | 0/0/3/0 | no | Stage 1 partial |
| cap-a | building | 0/0/0 | 1/2/1/0 | no | Stage 0 shell |
| cricket-stats | building | 0/0/0 | 1/2/0/0 | no | Stage 0 shell |
| ingest | building | 0/0/0 | 1/2/1/0 | no | Stage 0 shell |
| home | building | 0/0/0 | 1/1/0/0 | no | Stage 0 shell |
| desi-skies | ideating | 0/0/0 | 1/2/0/0 | no | Stage 0 / ideating |

Legend: fl/ft/pg = flows/features/pages · ng/sc/rk/adr = non-goals/success-criteria/risks/decisions · UI MP = `ui_master_plans` row populated.

---

## Recommended migration order

Lower-risk first; each pilot exercises a different surface so coverage matrix (AC3) fills incrementally:

1. **tasks** — smallest gap; lifecycle already shipped. Light Phase C/D top-up.
2. **cointrail** — finish Phase B–G. Already in flight.
3. **portfolio** — Stage 1 partial; biggest jump (pages=0, NG=0, SC=0).
4. **media-dashboard** — heavy Stage 4 (25 ADRs); needs careful retro-AC pass to avoid invalidating existing iteration trace reports.
5. **home, cap-a, cricket-stats, ingest, desi-skies** — Stage 0 shells. Each effectively a fresh `/ottomate new` walkthrough.

---

## When to re-check this runbook

- After every pilot completes — append a "lessons learned" line to Pilot history above.
- Before starting any new pilot — re-read the bespoke fixes table.
- When `adr-NNN` collisions, FTS5 errors, or any of the table-7 symptoms recur — confirm fix #N is applied.

---

*Last updated: 2026-05-19 — Phase 10 Pilot 2 Phase A complete; runbook v1 written as AC4 deliverable.*
