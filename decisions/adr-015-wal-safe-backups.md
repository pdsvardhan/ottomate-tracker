# adr-015: WAL-safe backups — VACUUM INTO, never raw file copy

- Status: accepted · Date: 2026-06-10 (incident response)

## Context

Two incidents proved raw `cp` of a live WAL-mode SQLite DB is destructive: 2026-05-29 (WAL deleted under the app, recovered via /proc) and 2026-06-04→10 (WAL-split: app held deleted WAL/SHM inodes; 6 days of writes existed only in process memory; every copyFileSync "backup" silently excluded them).

## Decision

All Ottomate DB snapshots go through SQLite itself: `VACUUM INTO` via the app's own connection, integrity-checked before reporting ok. Implemented in POST /api/backup (commit 6ebbd30) and /opt/homeserver/scripts/ottomate-backup.sh (nightly 02:30 cron → /mnt/storage/backups/ottomate/, 14-day retention, off the app disk). Never touch ottomate.db/-wal/-shm with cp/rm while the container runs.

## Consequences

- Pack-up's backup step inherits the safe path automatically.
- Remaining gap: backups are off-disk but still on-machine; off-machine copy is a future hardening item.
- A WAL-state check (deleted-fd detection) belongs in the sanity endpoint (WS3).
