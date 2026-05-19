# ADR-011 — Hybrid docs storage: public_docs/ canonical in repo, mirrored into Ottomate at pack-up

**Status:** accepted
**Date:** 2026-05-19
**Context:** Iteration #5, item 31
**Tags:** docs, ottomate-web-app, public-facing, mirror, pack-up

## Context

Project documentation today lives inconsistently across repos: some have `docs/` subdirs with detailed specs (`cricket-stats` has ARCHITECTURE / FEATURE_SPEC / PAGE_MAP / PRODUCT_BRIEF), some have only root README + CLAUDE.md (`home`), some have YAML mirrors at `ottomate/` (`media-dashboard`, `home`). The Ottomate web app currently does not ingest any of these for public display.

For the audience (recruiters, friends, public), the experience should be: arrive at the project page, get a clear high-level picture (overview, architecture, features) without leaving Ottomate; deep dives link out to the repo.

Three options were considered:
- **A.** Fully per-repo: docs only in each repo; Ottomate links out. Simple but worst UX for visitors; no inline rendering.
- **B.** Fully centralized in Ottomate: all docs ingested; canonical here, repo read-only. Single update point, but drifts from code if user edits in repo.
- **C.** Hybrid: small curated public docs canonical in repo (versioned with code), mirrored into Ottomate at pack-up time. Deep / internal docs stay repo-only with a "view full docs" link from Ottomate.

## Decision

Option C — Hybrid.

Each project repo gets a `public_docs/` subdirectory containing exactly:
- `architecture-summary.md` — short narrative + the same set of Mermaid diagrams the Architecture tab renders
- `feature-spec-public.md` — user-facing feature spec (capabilities the website offers, written for the audience, NOT internal phase entries)
- `adr-summary.md` — auto-generated index of accepted ADRs (id / title / tag list / 1-sentence summary)

The pack-up script (`npm run mirror:write`) extends to read `public_docs/*.md` and write the content into the Ottomate DB (`project_docs` table or similar) keyed by `(project_slug, doc_name)`. Detailed engineering docs (`docs/CODE_MAP.md`, `docs/CODING_GUIDELINES.md`, planning files, anything in `docs/plans/`) stay repo-only; Ottomate surfaces a "View full docs in repo" link to the Gitea URL.

## Consequences

- Code-versioned canonical: edit a public doc in the repo, commit, pack-up syncs to Ottomate.
- Single update point: docs aren't duplicated in two places needing dual-edit.
- Audience gets inline rendering for the 3 high-value public docs; deep dives are still discoverable via the repo link.
- Authoring discipline: writers maintain three small files per project instead of letting docs sprawl. The cost is real but bounded — each file is short and template-able.
- Migration: each existing project gets its `public_docs/` directory backfilled by extracting + condensing the existing repo docs. This is a Stage 4 follow-up item per project; not blocking for the iteration.

## Implementation notes

- Add a new `project_docs` table: `(project_slug TEXT, doc_name TEXT, body TEXT, source_hash TEXT, mirrored_at TEXT, PK (project_slug, doc_name))`.
- Extend `npm run mirror:write` to walk `public_docs/`, hash bodies, write rows with `mirrored_at = now()` only when hash differs.
- Add a "Docs" rail to the project Overview tab rendering the 3 doc bodies in tabs/accordion, with a "View full docs in repo →" CTA pointing at the Gitea repo `tree/main/docs/`.
- For backfill: a per-project iteration item later will scaffold each repo's `public_docs/` from existing material.
