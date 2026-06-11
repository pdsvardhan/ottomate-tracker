# adr-017-architecture-page-decisions

- **Status:** accepted
- **Date:** 2026-06-11
- **Tags:** showcase, iter-16

## Area

Showcase website — project architecture page.

## Context

The 2026-06-10 capture-vs-display ruling hid ALL decision records from the showcase UI (ADRs treated as build rails). The 2026-06-11 portfolio documentation spec (Doc A/B/C, "diagrams page restructure") makes Decisions the third layer of the architecture page: Workflow → System → Decisions ("Visitor remembers … one system decision"; "Reader trusts engineering judgment").

## Alternatives

1. Keep all decisions hidden (status quo) — violates Doc B's architecture layer order.
2. Render full ADR bodies — violates "Keep decisions concise"; many body files don't exist (adr-001..011 phantom paths, left honest per WS1).
3. Render a concise curated list (title + date + tags) of accepted, non-superseded decisions — chosen.

## Choice

Option 3. The architecture page renders accepted, non-superseded `adr_index` entries as one-line rows, newest first.

## Tradeoff

Internal-sounding decision titles (e.g. Codex review references) are visitor-visible until titles are curated per project. Rails (must_haves, non_goals, risks, verifier output) remain capture-only and are still never rendered.

## Reason

Doc B (2026-06-11, owner-authored) supersedes the blanket-hide half of the 2026-06-10 ruling; the capture≠display principle survives for rails. Decisions are showcase content now, by owner instruction.

## Lessons

Display rules belong to the product spec, not the data layer — capture stayed stable while display flipped twice with zero schema churn.
