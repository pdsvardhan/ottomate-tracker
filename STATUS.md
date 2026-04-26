# Ottomate v2 — Live Status

**Last updated:** 2026-04-26 (foundations done)

## TL;DR

Foundations laid. Plugin scaffolded locally, tracker deployed to server, Gitea repo pushed, all planning docs written. Next phases queued in `TODO.md`.

## Where everything lives

| Layer | Location | Status |
|---|---|---|
| Skill plugin | `~/.claude/plugins/ottomate-v2/` | ✅ Scaffolded |
| Tracker code | `/opt/homeserver/ottomate/` (server) | ✅ Scaffolded |
| Gitea repo | `git.vault7a.xyz/pdsv/ottomate-tracker-v3` | ✅ Initial commit |
| Codex review folder | `~/Desktop/skill cleanup/CODEX REVIEW FILES - SKILL ISSUE/` | ✅ Comprehensive |
| Memory | `~/.claude/projects/.../memory/ottomate-redesign-state.md` + `ottomate-implementation-plan.md` | ✅ Up to date |
| Old skill (backup) | `~/.claude/plugins/ottomate/` | ✅ Untouched |
| Old tracker (v2, still live) | `/opt/homeserver/tracker-v2/` | ✅ Running on port 8100 |
| Tasks-dashboard (separate) | `/mnt/storage/websites/tasks/` | ✅ Untouched (port 8507) |

## Phase progress

| Phase | What | Status | Sessions |
|---|---|---|---|
| 0 | Foundations (scaffold, git, planning docs) | ✅ DONE | This session |
| 1 | DB migrations + seeds | ⏳ NEXT | 1-2 |
| 2 | REST API endpoints (~40) | ⏳ | 3-4 |
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

The new tracker at `/opt/homeserver/ottomate/` — NOT YET RUNNING. Need Phase 1 (npm install + migrate) before it can boot.

The old tracker at `/opt/homeserver/tracker-v2/` is still the live one at `tracker.vault7a.xyz`.

## Pilot scope (Phase 10)

3 projects, in this order:
1. **ottomate-tracker-v3 itself** (meta — dogfood)
2. **balls-of-the-bull** (real active project + RCS blocker as 1st iter)
3. **tasks** (personal todo, tracked NOT merged)

See `PILOT_ONBOARDING.md` for details.

## Outstanding decisions

- Bearer token: generate at `/opt/homeserver/ottomate/.token` before Phase 1 starts (`openssl rand -hex 32`)
- Cloudflare DNS for `ottomate.vault7a.xyz`: defer until Phase 13 cutover
- ANTHROPIC_API_KEY for verifier sub-agent dispatch: needs to be set in tracker container env

## Recent commits

```
$ ssh pdsv@192.168.1.10 'cd /opt/homeserver/ottomate && git log --oneline -5'
7ed8e4a Add planning docs: TODO + PILOT_ONBOARDING + CUTOVER
b368996 Initial scaffold: Ottomate tracker
```

## To resume work next session

1. Read this STATUS.md + TODO.md
2. Start with Phase 1: install + migrate + seed
3. Verify health endpoint responds
4. Move to Phase 2 (API endpoints)

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
