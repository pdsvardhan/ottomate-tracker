# ADR-010 — Fold Decisions tab into Architecture with diagram pairing

**Status:** accepted
**Date:** 2026-05-19
**Context:** Iteration #5, item 26
**Tags:** ui, navigation, ottomate-web-app, adrs, public-facing

## Context

The Decisions tab renders `adr_index` rows as a 5-column table (ID / Title / Status / Date / Tags). Body text is stored in `body_path` but never surfaced in the UI. The audience for the project detail view — recruiters, technical friends, public — benefits from seeing ADRs not as a flat audit log but as engineering rationale tied to the architecture the ADR shaped (e.g. `adr-003-bookworm-not-alpine` makes sense next to a Docker layer diagram).

Keeping Decisions as a standalone tab also adds nav clutter that conflicts with the project's general "fewer tabs, more focused tabs" direction (iteration #5 items 25, 27, 30, 36 all consolidate nav).

## Decision

The Decisions tab is removed from the per-project navigation. Each accepted ADR is rendered as a card on the new Architecture tab, positioned adjacent to the architectural component or diagram it influenced. Card shows: id (mono), title, status badge, date, tag chips; click expands to show the full ADR body inline.

ADRs without a clear architectural anchor (rare; meta-process ADRs) fall back to a "General decisions" rail at the bottom of the Architecture tab.

## Consequences

- ADRs gain narrative force: "here's the system" + "here's why" read together.
- One fewer top-level nav tab; aligns with the consolidation direction of iteration #5.
- Engineering rigor stays visible to the audience (recruiters specifically — they read ADRs).
- Authors keep writing ADRs the same way; the only change is rendering location.

## Implementation notes

- Delete `app/projects/[slug]/decisions/page.tsx` and its nav entry in `layout.tsx`.
- Architecture tab gains an "ADR rail" component that consumes `adr_index` rows for the slug.
- Each ADR card needs an optional `anchored_to` field (or a tag convention like `arch:docker`, `arch:auth`) so the UI can group cards by architectural region. Recommend adding a new optional column `anchored_to` to `adr_index` rather than overloading `tags`, so tags can stay free-form.
- Migration: backfill `anchored_to` heuristically from existing tags (or set NULL for "General decisions" rail).
