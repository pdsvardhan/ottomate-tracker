# Ottomate v2 — Live Status

**Last updated:** 2026-04-26 (Phase 1 complete — tracker live)

## TL;DR

Phase 1 done — tracker is live at `http://127.0.0.1:8110` on VAULT7A. DB migrated (43 tables), seeded (50 risks + 15 master components), Docker container healthy. Next: Phase 2 — REST API endpoints (~40 routes). See `PENDING.md`.

## Where everything lives

| Layer | Location | Status |
|---|---|---|
| Skill plugin | `~/.claude/plugins/ottomate-v2/` | ✅ Scaffolded |
| Tracker code | `/opt/homeserver/ottomate/` (server) | ✅ Live on :8110 |
| Gitea repo | `git.vault7a.xyz/pdsv/ottomate-tracker-v3` | ✅ 5 commits |
| Codex review folder | `~/Desktop/skill cleanup/CODEX REVIEW FILES - SKILL ISSUE/` | ✅ Comprehensive |
| Memory | `~/.claude/projects/.../memory/ottomate-redesign-state.md` + `ottomate-implementation-plan.md` | ✅ Up to date |
| Old skill (backup) | `~/.claude/plugins/ottomate/` | ✅ Untouched |
| Old tracker (v2, still live) | `/opt/homeserver/tracker-v2/` | ✅ Running on port 8100 |
| Tasks-dashboard (separate) | `/mnt/storage/websites/tasks/` | ✅ Untouched (port 8507) |

## Phase progress

| Phase | What | Status | Sessions |
|---|---|---|---|
| 0 | Foundations (scaffold, git, planning docs) | ✅ DONE | Prev |
| 1 | DB migrations + seeds + Docker smoke test | ✅ DONE | This |
| 2 | REST API endpoints (~40) | ⏳ NEXT | 3-4 |
| 3 | Skill Stage 2/3 references | ⏳ | 1-2 |
| 4 | Tracker UI Stage 1 docs | ⏳ | 3-4 |
| 5 | Tracker UI Stage 2/3 | ⏳ | 3-4 |
| 6 | Stage 4 lock-in gate UI | ⏳ | 2-3 |
| 7 | Skill Stage 4 implementation | ⏳ | 1 |
| 8 | Cross-cutting tracker features | ⏳ | 3-4 |
| 9 | File watcher + sync | ⏳ | 2 |
| 10 | Pilot onboarding (3 projects) | ⏳ | 2-3 |
| 11 | Migration of remaining 6 | ⏳ | 2-3 |
| 12 | Codex Round 3 | ⏳ | 1 |
| 13 | Cutover | ⏳ | 1 |
| 14 | Stage 5 (deferred) | 🔵 LATER | TBD |

**Total remaining:** ~25-35 sessions of focused build.

## What's deployed right now

The new tracker at `/opt/homeserver/ottomate/` is **running** — `127.0.0.1:8110`, container `ottomate`, image `ottomate-ottomate:latest` (node:22-bookworm-slim). `curl http://127.0.0.1:8110/api/health` returns `{status:ok, db:connected}`.

The old tracker at `/opt/homeserver/tracker-v2/` is still the live one at `tracker.vault7a.xyz` (port 8100). DNS for `ottomate.vault7a.xyz` not yet configured — defer to Phase 13 cutover.

## Pilot scope (Phase 10)

3 projects, in this order:
1. **ottomate-tracker-v3 itself** (meta — dogfood)
2. **balls-of-the-bull** (real active project + RCS blocker as 1st iter)
3. **tasks** (personal todo, tracked NOT merged)

See `PILOT_ONBOARDING.md` for details.

## Outstanding decisions

- Bearer token: ✅ generated at `/opt/homeserver/ottomate/.token` (chmod 600, mounted as Docker secret)
- Cloudflare DNS for `ottomate.vault7a.xyz`: defer until Phase 13 cutover
- ANTHROPIC_API_KEY: plumbed through `.env` → compose env (currently empty); user must populate before Phase 7 verifier dispatch

## Recent commits

```
$ ssh pdsv@192.168.1.10 'cd /opt/homeserver/ottomate && git log --oneline -5'
f8b40be Phase 1: DB migrations + seeds + Docker smoke test passing
f1317a5 Add comprehensive handoff docs: REQUIREMENTS + SKILL_OVERVIEW + TRACKER_OVERVIEW + DECISIONS + DONE + PENDING + HANDOFF
f6b2fac Add STATUS.md live dashboard
7ed8e4a Add planning docs: TODO + PILOT_ONBOARDING + CUTOVER
b368996 Initial scaffold: Ottomate tracker
```

## What Phase 1 changed (notable beyond the plan)

The original Dockerfile + scaffold had latent issues that surfaced on first build:

1. `lib/db/client.ts` — `_bootstrap_promise` typed `Promise<typeof _db>` resolved to `Promise<DrizzleDb | null>`; health route hit "db possibly null" tsc error. Re-typed to non-nullable.
2. `app/api/health/route.ts` — used plain string `db.run('SELECT 1 as ok')`; drizzle's `.run()` expects SQL chunk. Switched to `sql\`SELECT 1\`` template tag.
3. Dockerfile on `node:22-alpine` — better-sqlite3 prebuilt binaries hit `fcntl64 symbol not found` (musl/glibc mismatch). Switched to `node:22-bookworm-slim`. Tasks-dashboard uses the same pattern.
4. Missing `.dockerignore` — host-built `node_modules` (Node 20.19) was overwriting the builder stage's Node 22 binaries (`NODE_MODULE_VERSION 115 vs 127`). Added `.dockerignore` excluding `node_modules`, `.next`, secrets, planning docs.
5. Container ran as `nextjs` (uid 1001) but host data/ owned by `pdsv` (uid 1000) → readonly DB. Pinned `user: "1000:1000"` in docker-compose.
6. Missing `public/` dir broke `COPY --from=builder /app/public ./public`. Added empty `public/.gitkeep`.

All committed in f8b40be.

## To resume work next session

1. Read STATUS.md + PENDING.md
2. Start with Phase 2: REST API endpoints (auth middleware first, then per-doc CRUD)
3. Health check the tracker is still up: `ssh pdsv@192.168.1.10 'curl -sf http://127.0.0.1:8110/api/health'`

## Quick commands

```bash
# Check tracker health (after Phase 1)
ssh pdsv@192.168.1.10 'curl -sf http://127.0.0.1:8110/api/health'

# Tail tracker logs (after running)
ssh pdsv@192.168.1.10 'docker logs -f ottomate'

# Trigger pack-up
ssh pdsv@192.168.1.10 'curl -X POST -H "Authorization: Bearer $(cat /opt/homeserver/ottomate/.token)" http://127.0.0.1:8110/api/pack-up -d "{\"project_slug\":\"...\"}"'

# Pull latest from server
ssh pdsv@192.168.1.10 'cd /opt/homeserver/ottomate && git pull'
```

## Files for Codex (if doing another review pass)

`~/Desktop/skill cleanup/CODEX REVIEW FILES - SKILL ISSUE/` — comprehensive folder, last updated 2026-04-26 with Round 2 fixes applied.
