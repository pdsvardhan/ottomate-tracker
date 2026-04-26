# 👋 Handoff — Read This First

You're a fresh Claude session continuing the Ottomate v2 build (skill + tracker website). The previous session left a comprehensive package. Read this doc first, then dive into specifics.

---

## TL;DR — What Ottomate is

**The skill (`/ottomate`)** orchestrates web project work across 4 stages on the user's home server (VAULT7A). It's the replacement for the original `/project` skill and addresses the user's #1 pain: **scope gaslighting** (AI claiming to build features that weren't built, or silently deferring work).

**The tracker website (Ottomate)** is the companion app — stores all project state, surfaces the Stage 4 lock-in gate UI (the anti-gaslighting bridge between user feedback and code changes), and serves as portfolio prep.

**Tasks-dashboard** stays SEPARATE. It's the user's personal todo list. NOT to be merged with tracker.

---

## What's done

Foundations laid. See `DONE.md` for the comprehensive list. Highlights:
- **Design fully locked** across 4 stages, 7 SO1 docs, ND1 schema, 14 lock-in gates, 52 sanity checks
- **Codex review applied** (two rounds — P0/P1/P2 + Round 2 fixes all in)
- **Skill plugin scaffolded** at `~/.claude/plugins/ottomate-v2/` (plugin.json, 12 docs, SKILL.md, 9 references, 10 schemas, 3 prompts)
- **Tracker website scaffolded** at `/opt/homeserver/ottomate/` (Next.js 16 + drizzle + ~30 tables in schema.ts + Docker compose at port 8110 localhost-bound + 50 risks + 15 components seeded)
- **Gitea repo** `pdsv/ottomate-tracker-v3` with initial 3 commits

## What's NOT done

See `PENDING.md` for granular list. High-level:
- Phase 1: DB migrations + seeds executed (RUNS in next session — first thing)
- Phase 2: ~40 REST API endpoints
- Phases 3-9: Skill refs, tracker UI, sync infrastructure
- Phase 10: Pilot onboardings (3 projects)
- Phase 11: Migration of remaining 6 projects
- Phase 12-13: Codex Round 3 + Cutover
- Phase 14: Stage 5 (deferred forever or until needed)

---

## Reading order for fresh session

1. **HANDOFF.md** ← you are here. Orientation.
2. **STATUS.md** — current phase + recent commits + outstanding decisions
3. **REQUIREMENTS.md** — definitive spec (R1-R22). Everything user has asked for.
4. **SKILL_OVERVIEW.md** — how the skill works end-to-end
5. **TRACKER_OVERVIEW.md** — how the tracker works
6. **DECISIONS.md** — chronological log of locked decisions (D1-D60)
7. **DONE.md** — what's complete
8. **PENDING.md** — what remains in detail
9. **TODO.md** — phase-level remaining work
10. **PILOT_ONBOARDING.md** — when ready for Phase 10
11. **CUTOVER.md** — when ready for Phase 13

---

## Where everything lives

| Layer | Location |
|---|---|
| **Skill plugin** (this folder) | `~/.claude/plugins/ottomate-v2/` |
| Skill SKILL.md | `~/.claude/plugins/ottomate-v2/skills/ottomate/SKILL.md` |
| Skill references (9) | `~/.claude/plugins/ottomate-v2/skills/ottomate/references/` |
| Skill schemas (10) | `~/.claude/plugins/ottomate-v2/skills/ottomate/schemas/` |
| Skill prompts (3) | `~/.claude/plugins/ottomate-v2/skills/ottomate/prompts/` |
| **Tracker code** (server) | `/opt/homeserver/ottomate/` |
| Tracker repo (Gitea) | `git.vault7a.xyz/pdsv/ottomate-tracker-v3` |
| Tracker port | 8110 (localhost-bound) |
| Tracker future domain | `ottomate.vault7a.xyz` (DNS in Phase 13) |
| **Old skill (backup)** | `~/.claude/plugins/ottomate/` (untouched) |
| **Old tracker v2 (still running)** | `/opt/homeserver/tracker-v2/` (port 8100, `tracker.vault7a.xyz`) |
| **Tasks-dashboard (SEPARATE)** | `/mnt/storage/websites/tasks/` (port 8507, `tasks.vault7a.xyz`) — DO NOT TOUCH |
| **Memory (canonical design)** | `~/.claude/projects/.../memory/ottomate-redesign-state.md` + `ottomate-implementation-plan.md` |
| **Codex review folder** | `~/Desktop/skill cleanup/CODEX REVIEW FILES - SKILL ISSUE/` |

---

## Critical rules (don't violate)

These are in REQUIREMENTS.md but worth surfacing:

1. **Tasks-dashboard stays separate.** Earlier merge plan was REVERSED at user's emphatic insistence. Don't propose merging it again.
2. **Verifier is mandatory.** No "small fix, skip verifier" exception in Stage 3 or Stage 4.
3. **Lock-in gate at Stage 4.3 is the anti-gaslighting bedrock.** No code changes before user confirms structured items.
4. **Bearer auth required on all mutations.** Even single-user (Codex Round 2 #2).
5. **Risks resolve, don't delete.** History preserved (Codex P1 #10).
6. **Migration-first DB bootstrap.** Don't copy tasks-dashboard's `_sqlite-before-runBootstrap` race (Codex Round 2 #1).
7. **Free / self-hosted only.** No SaaS subscriptions. Trivy not Snyk. Lost Pixel not Percy SaaS.
8. **Use AskUserQuestion tool for choices.** Not prose questions.
9. **Be opinionated.** Recommend, don't list.
10. **Critique, don't rubber-stamp.** Push back on weak ideas with evidence.

---

## Quick start for next session

```bash
# 1. SSH to server
ssh pdsv@192.168.1.10

# 2. Generate bearer token (if not done)
[ ! -f /opt/homeserver/ottomate/.token ] && \
  openssl rand -hex 32 > /opt/homeserver/ottomate/.token && \
  chmod 600 /opt/homeserver/ottomate/.token

# 3. Install + migrate + seed (Phase 1)
cd /opt/homeserver/ottomate
npm install
npm run db:generate    # generates migrations from schema.ts
npm run db:migrate     # applies to DB
npm run seed:risks     # 50 risks
npm run seed:components  # 15 components

# 4. Smoke test (boot via Docker)
docker compose up -d --build
docker logs ottomate
curl http://127.0.0.1:8110/api/health
# Expected: {"status":"ok","db":"connected","version":"0.1.0",...}

# 5. Pull latest from Gitea (if working from another machine)
git pull

# 6. Continue with Phase 2 (REST API endpoints) per PENDING.md
```

---

## Server access

- SSH: `pdsv@192.168.1.10` (password `[redacted]`)
- All file ops via SSH + SCP
- **Never SSH heredoc for code** — corrupts via shell escaping
- **Always commit before docker rebuild** — rebuilds wipe uncommitted

Full credentials in `skills/ottomate/references/credentials.md`.

---

## How to work in this codebase

### Pattern 1 — Edit the skill itself
1. Edit files in `~/.claude/plugins/ottomate-v2/skills/ottomate/`
2. Restart Claude Code (or wait for hot reload if supported)
3. Test invocation: `/ottomate`

### Pattern 2 — Edit the tracker code
1. SSH: `ssh pdsv@192.168.1.10`
2. `cd /opt/homeserver/ottomate`
3. Edit files (use Write+SCP for code, never SSH heredoc)
4. `docker compose restart ottomate` to reload
5. `git add -A && git commit && git push`

### Pattern 3 — Update a memory file
1. Edit at `~/.claude/projects/.../memory/<file>.md`
2. Memory persists across sessions automatically

### Pattern 4 — Push planning docs to server (mirror)
```bash
scp ~/.claude/plugins/ottomate-v2/{TODO,PENDING,DONE,...}.md pdsv@192.168.1.10:/opt/homeserver/ottomate/
ssh pdsv@192.168.1.10 'cd /opt/homeserver/ottomate && git add . && git commit -m "Sync planning docs" && git push'
```

---

## Status check anytime

```bash
# Check tracker health (after Phase 1 done)
ssh pdsv@192.168.1.10 'curl -sf http://127.0.0.1:8110/api/health'

# Tail tracker logs
ssh pdsv@192.168.1.10 'docker logs -f ottomate'

# Recent commits
ssh pdsv@192.168.1.10 'cd /opt/homeserver/ottomate && git log --oneline -10'

# Check what's running on the server
ssh pdsv@192.168.1.10 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'

# Open this doc on server
ssh pdsv@192.168.1.10 'cat /opt/homeserver/ottomate/STATUS.md'
```

---

## When to ask the user vs continue

**Continue without asking:**
- Implementing tasks already specified in PENDING.md
- Following Codex feedback already documented
- Mechanical translations of design (e.g., writing missing skill references)
- Bug fixes that don't change design
- Adding tests / docs / comments

**Ask the user:**
- Any change to a locked decision (D1-D60 in DECISIONS.md)
- New scope (anything not in REQUIREMENTS.md R1-R22)
- DNS / domain / port changes
- Anything destructive (mass migrations, schema rewrites)
- Any reversal of an earlier locked design

Use `AskUserQuestion` tool with multiple-choice options. Never prose.

---

## When the user says "pack up"

Run the full session-end ritual (see `skills/ottomate/references/pack-up-ritual.md`):
1. Validate working state
2. Sync DB → YAML mirrors (when Phase 9 implemented; for now: just commit changes)
3. Update iteration log (when Phase 4+ projects exist)
4. Commit + push to Gitea
5. Auto-push plugin repos (ottomate-v2 + vault7a-ops if changed)
6. Clean temp files
7. Update tracker status
8. Show user session summary

---

## Trigger phrases (user uses these to advance)

| Phrase | Effect |
|---|---|
| "next" / "let's move on" / "ready" | Advance to next sub-step |
| "let's complete stage 1" / "stage 1 done" | Finalize ND1 |
| "let's get to stage 2/3" | Stage transitions |
| "let me test" | Out of build, ready Stage 4 |
| "analyze" | Trigger Stage 4 classifier |
| "lock & build" | Lock Stage 4 items list |
| "pack up" / "done" / "good night" | Session end ritual |

---

## Key files for orientation

If you only have time to read 3 files, read these:

1. **REQUIREMENTS.md** — what the user asked for (definitive)
2. **SKILL_OVERVIEW.md** — how the skill works
3. **PENDING.md** — what to do next

---

## Don't lose context

The user has invested many sessions designing this. Don't:
- Re-litigate locked decisions without strong evidence
- Suggest already-rejected ideas (e.g., merging tasks-dashboard with tracker)
- Skip lock-in gates because "this is just a small change"
- Use prose questions where AskUserQuestion would work
- Use polite hedging ("might want to consider"); be direct

Do:
- Treat the design as the canonical source
- Apply Codex feedback literally (it's already locked)
- Push back on the user IF you have evidence
- Save context to memory frequently
- Commit + push frequently

---

## Final note from previous session

The user said: "I AM MOVING TO ANOTHER SESSION SO WRITE TO DO DOCS AND OTHER REQUIRED DOCS."

This handoff package is the response. It exists so a new session can pick up at exactly Phase 1 of TODO.md without re-reading hundreds of conversation turns.

Welcome to Ottomate. Build well. Verify everything. Ship nothing that wasn't asked for.

---

**Generated:** 2026-04-26 end-of-session
**Next session starts:** Phase 1 of TODO.md (DB migrations + seeds)
