---
public: true
type: technical-deep-dive
title: Technical Deep-Dive — Ottomate
order: 2
summary: How a skill, a Next.js app, and a SQLite database enforce "show, don't claim."
read_minutes: 4
---

# Ottomate — Technical Deep-Dive

## Stack
Next.js 16 (App Router, RSC) + TypeScript strict, Tailwind v4, and Radix-based shadcn-style components. State lives in SQLite via `better-sqlite3` and `drizzle-orm`, with `zod` validating every write. Diagrams render with Mermaid; cross-doc search uses SQLite FTS5. It runs as a Docker container on a home server, bound to `127.0.0.1:8110`, reached publicly only through a Cloudflare Tunnel behind an Authentik SSO gate.

## Architecture
A clean split of responsibilities. The **skill** owns judgment and dialogue — extracting intent, running the lock-in conversation, dispatching the verifier. The **app** owns durable state, the gates, and the evidence: it is the single source of truth a fresh session reads back. The schema spans ~60 tables across the five document types (projects, flows, features, pages/components, data) plus risks, ADRs, iterations, and verification reports.

## Anti-gaslighting bedrock
- **Lock-in gate** — `POST /api/iterations/[id]/lock` refuses to lock if any active item is below a 0.7 confidence floor without a human edit, and writes a `lock_in_audit` snapshot (item count, rejections, per-item confidence) so the gate itself leaves a trail.
- **Independent verifier** — verdicts persist via `/api/verification-reports` with four evidence columns: pass A code-reality, pass B stub-detection, pass C data-correctness, pass D acceptance-criteria, plus an overall `APPROVE` / `BLOCK` / `ITERATE`.
- **Standing violation rules** — `/api/anti-gaslight/violations` continuously flags `unclaimed-done`, `missing-acceptance`, `silent-drops`, `stale-verification`, and `untested-deploys`.

## The 5-stage pipeline
Stage 0 preprocessing → Stage 1 spec → Stage 2 UI/tech (with a component picker) → Stage 3 build (verifier-gated) → Stage 4 iterate (lock gate + trace report). At session end a pack-up ritual mirrors the DB into per-repo YAML for human-readable git history.

## Key decisions
- **One door to the database (adr-018).** After two silent data-loss incidents, WAL mode was dropped for a TRUNCATE rollback journal with `synchronous=FULL`. A `/proc/self/fd` scan detects DB handles pointing at deleted inodes and makes mutations return **503 instead of a fake 201** — capture must never out-claim durability.
- **Bearer auth on every mutation (adr-004).** Writes require a token compared with `timingSafeEqual`, *even from localhost*.
- **Migration-first bootstrap (adr-007).** The app refuses to serve on a half-upgraded schema.
- **Capture ≠ display (adr-017).** Internal build notes are stored but the showcase shows only curated decisions.
