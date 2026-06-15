# adr-019 — Ottomate scope narrowed to 8 active projects; 9 inactive projects removed

**Status:** accepted · **Date:** 2026-06-15

## Decision
Ottomate now tracks **8 active projects**: ottomate, portfolio, leaploop, cointrail, mapsofbharat, ingest, stateofus, cap-a. **Nine inactive/experimental projects were hard-deleted** from the tracker DB: tasks, media-dashboard, home, cricket-stats, desi-skies, paata, health, sms-receiver, vacayornay-data.

## Context
The 2026-06-10 redesign locked a 6-project showcase set; since then stateofus (most active, cv/public-facing) and cap-a became first-class, while the rest were dormant or experimental. Owner chose to drop the others from Ottomate entirely (not archive) to keep the tracker focused.

## Scope / safety
- Removal = `DELETE /api/projects/<slug>`. The **git repos, containers, and on-disk code are untouched** — these projects still live in Gitea and keep running. Only their tracker rows were removed.
- **DB snapshot taken before deletion:** `/app/data/backups/backup-1781501661389.db` (vacuum_into, ~1.9 MB, 2026-06-15). A deleted project's tracker data is recoverable from there.

## Consequences
- `/ottomate` listings and the skill manage only the 8.
- The drop from 17→8 tracked projects is **intentional, not data loss** (see backup) — this record exists to prevent that misread, per adr-018 lessons.
