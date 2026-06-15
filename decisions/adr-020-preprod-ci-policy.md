# adr-020 — Pre-production CI policy: fast gates always, tests paused behind a toggle, cached browsers

**Status:** accepted · **Date:** 2026-06-15

## Decision
Project CI (Gitea Actions `ci.yml`) keeps **typecheck + lint + build as always-on hard gates**. The **test tiers (vitest unit + Playwright E2E) run behind a `RUN_TESTS` toggle**, defaulted off while a project is pre-production, and flipped on (hard; BLOCK on red for cv/public per the 3→deploy gate) when it enters production. Playwright E2E uses the **prebuilt `mcr.microsoft.com/playwright` image** (or a cached `~/.cache/ms-playwright`) — never an uncached `npx playwright install` per run.

## Context
- Push CI was red on the most active project (stateofus): tests were written against initial reasoning and never updated after the code changed, so stale specs failed the whole job — blocking 10–20 pushes/day.
- The same workflows re-downloaded Chrome-for-Testing (~175 MB) + headless-shell (~113 MB) on every run.
- No project is in production yet; full test rigor is required *at* production, not before.

## Consequences
- Pre-production pushes get fast, meaningful gates (types/lint/build) without flaky-test noise or repeated browser downloads.
- Re-arming tests for production is a one-line `RUN_TESTS` flip per repo.
- Rollout tracked as Ottomate to-dos: fix the skill CI template (`stage-3-pipeline-setup.md` + `stage-3-testing.md`), then apply per kept repo.

## Related
adr-006 (Trivy not Snyk), adr-014 (toolchain pruning), adr-016 (docs generated, not handwritten).
