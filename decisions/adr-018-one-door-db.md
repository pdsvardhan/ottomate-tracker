# adr-018-one-door-db

- **Status:** accepted
- **Date:** 2026-06-11
- **Tags:** curated, cat:reliability, iter-17

## Area

Data durability — the SQLite store every project's state lives in.

## Context

Two real data-loss incidents (2026-06-10, 2026-06-11) shared one mechanism, proven live during iter-17 forensics: the WAL **orphaned-shm cascade**. The app's connections held their dead-man-switch lock on a *deleted* `-shm` inode; every external SQLite client (host `sqlite3`, backup's second connection) therefore saw a lockless database, assumed it was the last user, and on close checkpointed-and-unlinked the `-wal` under the running app. The app then committed into a deleted file — returning 201s whose data evaporated on process exit. `sqlite_sequence` provided the proof (lost inserts never bumped the counters). A second instance of the cascade was reproduced live on 2026-06-11 evening (fd 22/23 `(deleted)`, `/proc/locks` evidence).

Also found: `/api/pack-up` still raw-`copyFileSync`'d the live DB — the exact anti-pattern adr-015 banned; the 2026-06-10 fix had only patched `/api/backup`.

## Alternatives

1. Keep WAL + add detection only — failure stays physically possible.
2. Litestream replication — protects against disk loss, not this bug (it is itself an external WAL client).
3. **Eliminate the failure class + defense in depth — chosen.**

## Choice

1. **Journal mode TRUNCATE, not WAL** (`lib/db/client.ts`): with no `-wal`/`-shm` files, the orphaned-shm cascade cannot exist. `synchronous=FULL` (durability over latency), `busy_timeout=5000`.
2. **One door:** nothing opens the live DB file except the app process. Nightly backup script now calls `POST /api/backup` (app's own connection) and only ever verifies the *dead snapshot* host-side. Skill rule added: never `sqlite3` the live DB; for forensic reads, snapshot first.
3. **Loud tripwire:** `scanDeletedDbFds()` — every mutation refuses with 503 (`db_write_path_unsafe`) and `/api/health` degrades to 503 if the process's DB fds point at deleted inodes. A phantom-write state can no longer hide behind 201s.
4. **`/api/pack-up` backup** switched to VACUUM INTO + integrity check.
5. **Gitea recovery net:** YAML mirrors committed + pushed at every milestone (lock-in, integrate, pack-up), not only at pack-up — worst-case recovery is a git checkout away.

## Tradeoff

TRUNCATE mode serializes readers behind writers; irrelevant at single-user localhost load. WAL's concurrency benefits are given up deliberately.

## Reason

Single-user system, two incidents in one month, same class. Removing the class by construction beats detecting it; detecting it beats trusting it.

## Lessons

A 201 is a claim, not evidence — durability claims need read-back through a *different* path. And POSIX advisory locks on shared files are only as healthy as the inode the locks live on.
