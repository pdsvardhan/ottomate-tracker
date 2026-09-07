---
public: true
type: thesis
title: Project Thesis — Ottomate
order: 1
summary: A web-project pipeline that refuses to let an AI claim work it didn't do.
read_minutes: 3
---

# Ottomate — Project Thesis

> As of 2026-09-07 (ottomate-tracker-v3 @ be39ec4). Why Ottomate exists: the anti-gaslighting case for keeping project state outside the model.

## Problem
Ottomate replaces an earlier `/project` skill that suffered from *scope gaslighting*. Across long build sessions the AI would claim a feature was finished when only a stub existed, silently defer work it had agreed to, and lose context between sessions — so a fresh chat could not tell what was real, what was promised, and what was already shipped. The build "felt" done while the artifact wasn't.

## The bet
The fix is to stop trusting narrative and start storing state. Ottomate is a website + Claude skill pair. The skill owns judgment and dialogue; a separate web app owns *state, gates, and evidence*. Three mechanisms form the bedrock:
- **Explicit lock-in gates** — before any code is written, the user confirms exactly what the skill extracted from their request. Low-confidence items can't pass without a human edit.
- **An independent verifier sub-agent** — a second agent, separate from the coder, checks built work against acceptance criteria and hard-fails on stub detection.
- **A tracker website that holds all state** — projects, flows, features, decisions, risks, iterations, and verifier verdicts persist server-side, so any new session resumes exactly where the last left off.

## Audience
A single user, self-hosted on a home server (VAULT7A). This is deliberately *not* a multi-tenant SaaS — it is a personal pipeline for orchestrating the owner's own web projects.

## In scope
The 5-stage pipeline (idea → design → build → iterate → mini-pipeline); per-project documentation; a cross-project component catalog and inspiration gallery; coverage, risk, and bug-inbox dashboards.

## Out of scope
Multi-user auth, real-time websockets, native mobile apps, offline mode, SaaS subscriptions, and merging with the separate tasks-dashboard — all explicit non-goals.

## Success criteria
Every Stage-4 iteration produces a trace report mapping raw request text → locked items → built code → verifier verdict; the verifier runs independently and blocks on stubs; every mutation requires a bearer token; and state syncs to human-readable YAML at session end.
