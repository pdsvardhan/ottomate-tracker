# adr-013: Pilot order changed; BOTB pilot dropped

- Status: accepted · Date decided: 2026-05-11 (de facto) · Recorded: 2026-06-10

## Context

Planned pilot order was ottomate → balls-of-the-bull (BOTB, Standard mode, with mandatory secret scan) → tasks. Actual order: ottomate → tasks (Stage 0 done 2026-05-12, paused at Stage 1.1). BOTB was never started and no longer appears in the projects list. The reorder was never recorded, so PILOT_ONBOARDING.md kept describing a world that no longer existed.

## Decision

Recognize reality: the pilot sequence is ottomate (done, post-cleanup), tasks (paused), and real-usage projects (portfolio, leaploop, cointrail) as the de facto pilots 3+. WS4 end-to-end validation rides leaploop (user decision 2026-06-10).

## Consequences

- PILOT_ONBOARDING.md archived; no BOTB-specific onboarding will run.
- The BOTB secret scan obligation does NOT disappear: repo CLAUDE.md files may hold real credentials. Re-scoped as a standalone hygiene task across /mnt/storage/websites (tracked in audit open loops), no longer tied to a pilot.
