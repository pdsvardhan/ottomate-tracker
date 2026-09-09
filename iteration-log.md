# ottomate — iteration log

> Started 2026-09-07. Sessions before this date were recorded as `skill_events` rows in the tracker
> (`GET /api/skill-events?project_slug=ottomate`) and in the git history of this repo and the plugin
> repo (`pdsv/ottomate`); they are not backfilled here.

## Session 2026-09-07 (02:38–04:23 IST) — registry triage part 2 + the to-do model

**Stage:** Stage 4 — maintenance/triage iteration (no SO1 changes)
**Duration:** ~1h45m
**What changed:**
- **API fixes from the registry triage** (`c88b2cb`, hygiene pass `1c2b17a` after verifier iterate):
  `#688` ignored[] echoes own keys only; `#773` PATCH `/api/reports/[id]` status; `#552` R4
  stale-verification skips dropped features; `#724` cancel auto-defers stranded items with a reason
  (5 stranded items backfilled); `#333` every visual-QA push attempt is logged with its real outcome
  status; `#306` `scripts/register-unregistered-components.mjs` registered 150 components (116 → 266).
- **To-do model locked** (`#774` + `#530`, owner-locked this session; `c7f14b0`, `ce3439f`, inventory
  `8490153`): `body / state / kind / blocked_on / priority / origin / blocked_by / last_verified_at`;
  `done` ↔ `state` kept in sync; `GET` returns bucket counts (`misc` is the drift signal). Backfill
  script derives the new fields from the old title prose, one-run guard, `--force` to re-derive.
  Skill side in the plugin: `task-tracking.md` rewritten, routing reads `?open=1`, pack-up 3b sets
  states + `last_verified_at` (`c921e7c`).
- **Plugin:** `coverage.mjs` counts a target as having gone red on any failed case or BLOCK (`#719`);
  fail-closed fv drift guard (`#718`); Stage 0 real port check (`#731`) + audience-profile intake
  (`#319`) — `a1e0a25`, `61302dd`. fv-harness synced screenroom → shared (6 files), drift guard in
  both nightlies. dom-commenter `dc876e0`.
- **Registry housekeeping:** `#393` split into `#833`–`#841`; `#319` closed; `#300` retitled (the
  brief is a prompt; its outputs had not arrived at that point).

**Verification:** verifier run `a970bc0f` — 4 APPROVE, 2 ITERATE (both applied).
**Commits:** app `fae6077`, `5396233`, `c88b2cb`, `1c2b17a`, `c7f14b0`, `ce3439f`, `8490153`;
plugin `a1e0a25`, `61302dd`, `c921e7c`, `2eced92`.
**Decisions:** none new.
**Friction:** none recorded.
**Next session context:** `#774`/`#530` proposal awaiting owner lock-in; design-round evidence frozen
at `Desktop/Projects/Ottomate/design-rounds-evidence`.

## Session 2026-09-07 (12:48–14:53 IST) — docs to the standard, self-project reads, runner split

**Stage:** Stage 4 — maintenance iteration (no SO1 changes)
**Duration:** ~2h. Resumed after owner limits reset mid-ritual on the previous session; the YAML
mirrors that session owed were committed first (`be39ec4`).
**What changed:**
- **`#837` — docs to the documentation standard** (adr-024; `5f940f1`, `6dc6356`, `47f1812`):
  `ARCHITECTURE.md` rewritten arc42-lite, `FEATURES.md` generated, as-of lines on `public_docs`,
  README links, 11 hand-written status docs retired to `_legacy/docs-retired-2026-09-07`, dead vault
  node dropped from `system-context.mmd`. Plugin: rule 15 + pack-up step 2 now name the real
  generated-doc steps (`gen-reference-docs`, `doc-lint`) and the ottomate reject-seed (`78c5bce`);
  doc-lint treats a Vale runtime error as a violation instead of a silent CLEAN (`e7fbd9a`) — found
  here, where a missing `.vale.ini` had been reporting CLEAN.
- **`#848` — the tracker reads its own checkout** (`dda45e7`, `48350f2`, `0acc572`):
  `lib/repo-root.ts` `repoRoot(slug)` → `process.cwd()` for the tracker itself, `/repos/<slug>` for
  everyone else, used by the 3 architecture readers and the mirror drift check. Root cause:
  `/mnt/storage/websites/ottomate` is a symlink into `/opt/homeserver/ottomate`, which the container
  does not mount, so every `/repos/ottomate` read was silently empty. Drift check deliberately stays
  on `/repos` (mirrors are host-written at pack-up, so the image copy would always look drifted);
  `repoRoot` neutralises slugs that could climb out of `/repos`. Rebuilt.
- **`#717` — feature-verify runner split** (plugin `0e13e7d`, `9eba6ab`, `6df2070`; evidence
  `7ffbfe6`): generic runner + `harness/project-oracles.ts` seam; runner 17,424 → 371 lines; project
  oracle modules landed in screenroom and mapsofbharat; loader accepts `oracles/index.ts`, `.mjs` or
  `.js`; runner + loader marked verified (`rt.harness` bag, `modulePath` tamper-protected).
- **`#847`** — SKILL rule 6 extended: helper scripts and patch files over ~100 lines go via Write +
  scp, because Git Bash silently truncates a `-c` string past ~8 KB (3 hits this day). Stage-3
  verifier control-tree recipes for `#342`/`#343` (`1caecfd`).
- **Registry:** `#847`, `#342`, `#343`, `#333` closed. `#300` corrected — the research corpus DID
  arrive (24 files, 2026-07-23, `5bdd982`); 79 rules over 19 tracks are enforced. `#526` moved to
  `ready` with the owner's four answers recorded. New: screenroom `#855` (re-lock, owner queue).

**Verification:** `#717` verifier 2 BLOCK → fixed → 5/5 APPROVE; A/B matrices cell-identical against
the old monolith from the nightly cwd. `#848` verifier `a003d733` (hygiene iterate applied).
`#837` doc-lint CLEAN across 21 docs.
**Commits:** app `be39ec4`, `5f940f1`, `6dc6356`, `47f1812`, `dda45e7`, `48350f2`, `0acc572`,
`7ffbfe6`; plugin `1caecfd`, `78c5bce`, `e7fbd9a`, `0e13e7d`, `9eba6ab`, `6df2070`.
**Decisions:** adr-024 "docs to the standard" (accepted).
**Friction:**
- Git Bash truncates a `-c` string past ~8 KB and the heredoc dies with `unexpected EOF` before
  anything runs — 3 hits in one day [tooling]. Fixed permanently as SKILL rule 6 (`#847`).
- `/repos/ottomate` is a dangling symlink inside the container, so architecture reads returned empty
  with no error [env-limitation]. Fixed as `#848`.
- `doc-lint` reported CLEAN when Vale failed to run (missing `.vale.ini`) — a silent false pass
  [tooling]. Fixed in `e7fbd9a`.

**Next session context:** `#526` is the unblocked P1 — a PROPOSAL session (not code) for a
hierarchical design-round flow (page/feature → component → tokens) with a round budget, grounded in
the plugin's research corpus (`docs/research`, G1–G3, F2) and the recorded complaint that variants
were indistinguishable. 9 to-dos (`#475`–`#480`, `#527`–`#529`, `#730`) unblock behind it. Also open:
`#300` — decide what else from the corpus becomes mechanically enforceable (11 rules specified but
pending; B2/C1/F1 cited by no rule).

## Session 2026-09-09 — #826 (from a city-wars session)

**Stage:** app fix only; no schema, no migration.
**Duration:** ~15 min of a ~60 min city-wars session.
**What changed:**

- `GET /api/projects/[slug]/features` never read its query string, so `?include=acceptance_criteria`
  returned a payload byte-identical to the bare call — the question was dropped in silence. On
  2026-09-04 two verifiers read that as proof that city-wars features had no acceptance criteria and
  returned false BLOCKs; the criteria existed the whole time at the dedicated AC endpoint.
- `include=acceptance_criteria` now attaches them (one query for the page, not one per feature), a
  feature with none gets `[]` so absence is stated rather than inferred, and an unknown key is a 400
  naming it. Bare GET unchanged — attaching by default would rewrite every caller's payload.
- `tests/features-include.test.ts` (4 cases). Suite 74/74. Container rebuilt, health `ok`,
  `db_fds: clean`, live probe confirms 56 criteria across 15 city-wars features.

**Commits:** app `c911206`.
**Decisions:** none.
**Friction:**

- No per-project iteration listing (`GET /api/projects/<slug>/iterations` 404s); only
  `GET /api/iterations/<id>` exists [api-change].
- The generated API inventory shows `POST` on `/api/iterations/[id]/items/[itemId]` with no hint that
  POST is defer-with-reason — a session reading the inventory alone cannot tell. Contributing cause of
  city-wars `#760`, which sat open for 9 days claiming the capability did not exist [tooling].

**Next session context:** unchanged — `#526` remains the unblocked P1.
