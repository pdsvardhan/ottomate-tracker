# Decisions curation record — iter-17, 2026-06-11

Original titles preserved here; live titles rewritten for the showcase.

| project | adr | category | original title | shown title |
|---|---|---|---|---|
| ottomate | adr-017-architecture-page-decisions | cat:product | Architecture page shows curated decisions (Workflow → System → Decisions, Doc B) | The showcase shows curated decisions only — internal build-process notes stay captured but hidden |
| ottomate | adr-012-codex-round-3-rejected | hidden | Codex Round 3 external review rejected; superseded by 2026-06 ecosystem audit | — |
| ottomate | adr-013-pilot-order-changed | hidden | Pilot order changed; BOTB pilot dropped; secret scan re-scoped standalone | — |
| ottomate | adr-014-toolchain-pruning | cat:reliability | Gates only reference deployed tools; Vitest/Playwright/Trivy/axe real, five removed | Quality gates only reference tools that are actually deployed — aspirational gates got deleted |
| ottomate | adr-015-wal-safe-backups | cat:reliability | VACUUM INTO everywhere; never raw cp of live WAL-mode SQLite | Backups snapshot through the database engine — never raw file copies (learned from a real data-loss incident) |
| ottomate | adr-016-docs-generated-not-handwritten | cat:reliability | STATUS generated from API; REQUIREMENTS+PILOT_ONBOARDING archived | Status docs are generated from the live API — every hand-written count had drifted wrong |
| ottomate | adr-009-drop-data-tab-fold-architecture | cat:product | Drop Data tab; fold a public-friendly data-model view into Architecture | Cut the Data tab — a public-friendly data view inside Architecture tells the story better |
| ottomate | adr-010-fold-decisions-into-architecture | hidden | Fold Decisions tab into Architecture with diagram pairing | — |
| ottomate | adr-011-hybrid-public-docs-mirror | cat:system | Hybrid docs storage: public_docs/ canonical in repo, mirrored into Ottomate at pack-up | Docs live in the project repo as the canonical source, mirrored into the app at session end |
| ottomate | adr-001-no-merge-tasks | cat:system | Tasks-dashboard stays separate from tracker | One concern per app — the task dashboard stays separate from the project pipeline |
| ottomate | adr-002-localhost-bound | cat:security | Tracker container localhost-bound (Codex P1 #8) | The app binds to localhost only — the internet path goes through a tunnel and an SSO gate |
| ottomate | adr-003-bookworm-not-alpine | hidden | Use node:22-bookworm-slim, not alpine | — |
| ottomate | adr-004-bearer-auth | cat:security | Bearer auth on every mutation (Codex Round 2 #2) | Every write requires a bearer token, even from localhost |
| ottomate | adr-005-risks-resolve-not-delete | cat:reliability | Risks resolve, not delete (Codex P1 #10) | Risks get resolved with evidence, never deleted — the risk log is append-only history |
| ottomate | adr-006-trivy-not-snyk | cat:product | Trivy + Grype + OSV-Scanner, not Snyk (Codex P1 #11) | Free self-hosted security scanners over a SaaS subscription |
| ottomate | adr-007-migration-first-bootstrap | cat:system | Migration-first DB bootstrap (Codex Round 2 #1) | Database changes are migration-first — the app refuses to boot on a half-upgraded schema |
| ottomate | adr-008-build-plan-v1 | hidden | Build plan v1 — 14 phases (Phase 0 → 14) | — |
| leaploop | adr-001-leaploop-initial-staging | hidden | Initial Stage 1 staging for LeapLoop | — |
| leaploop | adr-002-leaploop-rules-not-llm | cat:system | Tailoring is a deterministic rules engine, no LLM in the recurring loop | Job-match scoring is a deterministic rules engine — no LLM in the recurring loop, so results stay explainable and free |
| leaploop | adr-003-leaploop-telegram-only-push | cat:product | Push notifications via Telegram only (Web Push/VAPID cut) | Notifications via Telegram only — Web Push complexity cut until it earns its keep |
| leaploop | adr-004-leaploop-tiering-curated-wikidata | cat:product | Reputability tiering = curated Tier-A/B + keyless Wikidata; OpenCorporates dropped | Company reputation tiers from a curated list plus keyless Wikidata — paid APIs dropped |
| leaploop | adr-005-leaploop-sqlite-not-xlsx | cat:system | DB-backed state in SQLite; no xlsx maintenance going forward | State lives in SQLite, not spreadsheets — queryable history instead of xlsx maintenance |
| leaploop | adr-006-leaploop-straight-to-v2 | cat:product | Build straight to full v2 (no interim v1 release) | Skip the interim release — build straight to the full v2 design |
| leaploop | adr-007-leaploop-light-only | hidden | Light-only theme (dark mode deferred) | — |
| leaploop | adr-008-leaploop-build-from-reference | hidden | Cockpit components built bespoke from the reference design (no catalog pick) | — |
| leaploop | adr-009-leaploop-tech-stack | hidden | Cockpit tech stack -- FastAPI + React/Vite on shared SQLite | — |
| cointrail | adr-004-cointrail-so1-backfill | hidden | SO1 + Stage-2 entity backfill from deployed v0.2.0 | — |
| cointrail | adr-003-cointrail-stage-2-3-catchup | hidden | Stage 2 + Stage 3 catchup complete; project renamed BOTB -> Cointrail | — |
| cointrail | adr-001-cointrail-staging | hidden | Initial Stage 1 staging for cointrail (T2P catchup) | — |
| cointrail | adr-002-cointrail-ui-master-plan-lock | hidden | Stage 2.2 UI Master Plan locked (catchup capture from v0.2.0) | — |
| mapsofbharat | adr-011-stage3-ac-rescope | cat:product | Re-scope Stage 1 acceptance criteria to shipped Stage 3 reality; move gaps to backlog | Acceptance criteria re-scoped to shipped reality — gaps moved to an explicit backlog, not quietly forgotten |
| mapsofbharat | adr-010-subdistrict-crosswalk | cat:reliability | Reaggregate 2011 sub-district counts into current-day districts | 2011 sub-district counts re-aggregated into today's districts — data integrity over convenience |
| mapsofbharat | adr-001-mapsofbharat-staging | hidden | Initial Stage 1 staging for MapsOfBharat | — |
| mapsofbharat | adr-002-geography-backbone | cat:system | Geography backbone: DataMeet/SHRUG 2011 districts plus Survey of India outline; dual key LGD and Census-2011 | Geography backbone: 2011 census districts plus Survey of India outline, dual-keyed to LGD and Census codes |
| mapsofbharat | adr-003-current-day-rendering | cat:system | Store finest-unit data and render to current-day boundaries via crosswalk; keep an as-reported-2011 toggle | Store data at the finest unit, render onto current-day boundaries via a crosswalk — with an as-reported-2011 toggle |
| mapsofbharat | adr-004-own-canonical-store | cat:system | Own canonical DB with scheduled ETL; no live source calls at request time; MoSPI MCP for dev exploration only | Own canonical database with scheduled ingestion — zero live calls to government sources at request time |
| mapsofbharat | adr-005-official-sources-only | cat:product | Provenance rule: official/government or top-tier sources only; cite every metric | Official or top-tier sources only — and every metric carries its citation |
| mapsofbharat | adr-006-vertical-slice | cat:product | Build the Demographics vertical end-to-end first on a generic engine plus adapter pattern | Ship one vertical (Demographics) end-to-end first, on a generic engine plus adapters |
| mapsofbharat | adr-007-tech-stack | hidden | Tech stack: Next.js (App Router) + TypeScript; Tailwind v4 + shadcn/ui; MapLibre GL JS for the choropleth (WebGL vector tiles for smooth India to state to district zoom at 780+ districts, reused from desi-skies); Recharts + d3-scale-chromatic for charts and colour scales; better-sqlite3 + drizzle canonical store; Python (pandas + pdfplumber/camelot) ingestion pipeline. | — |
| mapsofbharat | adr-008-component-strategy | hidden | Component strategy: core viz components (choropleth, legend, colour-scale control, compare pane, region detail) are built custom on MapLibre/D3; generic primitives come from shadcn/ui. The master_components catalog is empty and intentionally not used for this bespoke-viz project. | — |
| mapsofbharat | adr-009-build-plan | hidden | Build plan v1 (topological): geo-backbone -> canonical-store -> ingest-pipeline (+ demographics adapter) -> demographics-pilot data load -> choropleth-map + metric-selector + source-trust -> rankings-stats + region-detail -> compare-mode + export-share -> find-my-district. | — |
| portfolio | adr-001-portfolio-initial-staging | hidden | Stage 1 — Initial staging for portfolio | — |
| portfolio | adr-002-portfolio-ui-master-plan | cat:product | Stage 2.2 — UI Master Plan v1 (Cinematic Cyber-Den) | The portfolio is an interactive 3D room — 'Cinematic Cyber-Den' direction locked before any build |
| portfolio | adr-003-portfolio-component-picks | hidden | Stage 2.4 — Per-component picks v1 | — |
| portfolio | adr-004-portfolio-tech-stack | hidden | Stage 2.5 — Tech stack v1 + CODING_GUIDELINES.md | — |
| portfolio | adr-005-portfolio-architecture-buildplan | hidden | Stage 2.6+2.7 — Architecture + Build plan | — |
| ottomate | adr-025-verifier-on-the-showcase | cat:product | (written showcase-ready, iter-208, 2026-11-04) | The showcase shows the verifier at work — a change it sent back, and how often it sends changes back |
| ottomate | adr-026-public-read-only-showcase | cat:security | (written showcase-ready, iter-208, 2026-11-04) | The showcase is public and read-only — private pages and every change stay behind sign-in and the bearer token |
