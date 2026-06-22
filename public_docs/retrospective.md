---
public: true
type: retrospective
title: Retrospective — Ottomate
order: 4
summary: Two data-loss incidents, a capture-vs-display reframe, and a pivot to showcase-first.
read_minutes: 3
---

# Ottomate — Retrospective

## Two real data-loss incidents drove the "one door" rule
Ottomate originally ran SQLite in WAL mode for concurrency. Twice, mutations returned success while the data evaporated: the running container's lock lived on a *deleted* `-shm` inode, an external client saw a lockless database and unlinked the `-wal` file underneath it, and commits landed in a file nobody else could read. The second recurrence cost a full report, an iteration with its items and lock, three diagram upserts, and an ADR — all recovered from local payloads. The lessons hardened into decisions: **adr-015** (back up *through* the engine with `VACUUM INTO`, never a raw file copy of a live DB) and **adr-018** (drop WAL for a rollback journal, add a deleted-fd self-check so writes fail loud with a 503 instead of silently). For a project about not gaslighting the user, the database silently gaslighting *us* was the sharpest possible irony.

## Capture ≠ display
An early instinct was to hide messy internal reasoning from the project record. The reframe: capture *everything*, then curate what's *shown*. ADR-017 codifies this — internal build-process notes stay stored but the public showcase surfaces only a curated, renamed decision set (tracked in a decisions-curation record). Honesty to the record and polish to the viewer turned out to be separable concerns.

## Docs drift, so generate them
Hand-written status docs kept drifting wrong — every hand-maintained count was eventually inaccurate. ADR-016 made status docs generate from the live API, and archived the stale hand-written ones. The README itself is a live example of this hazard: it still reads "foundation scaffolding only" long after most features shipped.

## Showcase-first redesign
The product was re-thought toward a recruiter-facing showcase. The tracker was narrowed from 13 projects to **8 active** (9 removed after a backup, adr-019); the Data and Decisions tabs were folded into a public-friendly Architecture view (adr-009, adr-010); and quality gates were pruned to reference only tools actually deployed — aspirational gates were deleted rather than left lying (adr-014).

## What stayed deliberately small
Single-user, localhost-bound, polling over websockets, free self-hosted tooling over SaaS. These weren't limitations to apologize for — they were the scope, chosen on purpose and defended in the non-goals.
