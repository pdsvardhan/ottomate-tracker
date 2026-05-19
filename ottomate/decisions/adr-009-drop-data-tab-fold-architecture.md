# ADR-009 — Drop Data tab; fold a public-friendly data-model view into Architecture

**Status:** accepted
**Date:** 2026-05-19
**Context:** Iteration #5, item 24
**Tags:** ui, navigation, ottomate-web-app, public-facing

## Context

Ottomate web app exposes a per-project `/projects/<slug>/data` tab that pulls from three internal tables (`project_data_concepts`, `data_sources`, `project_data_contracts`). For the `ottomate` project itself all three are empty, so the tab renders three "— not configured" stubs. For projects with no data layer at all (e.g. `home` portal), the tab is permanently useless. For projects where the data layer is meaningful (e.g. `media-dashboard`, `cointrail`), the current rendering uses internal jargon fields (`retention_policy_type`, `migration_tooling`) that the public audience — recruiters, friends, casual visitors — has no use for.

## Decision

The Data tab is removed from the per-project navigation. The architecturally relevant subset of data-layer information (entities, relationships, storage choice) is absorbed into the new Architecture tab as a "Data model" diagram + brief, alongside the other software-design diagrams being added under iteration #5 item 29.

For projects with no data layer the section is hidden entirely. For projects with a data layer, the diagram is auto-derived from the `data_sources` + schema where possible, with author override available.

## Consequences

- One fewer top-level nav tab; tighter information architecture.
- The "how this app is built" story reads as one coherent narrative on Architecture, instead of being split across two adjacent tabs.
- Internal-only data fields (`retention_policy_type`, `migration_tooling`, `freshness_threshold_hours`) move out of the public-facing view; if needed, they live on an admin-only panel later.
- Data-layer-less projects gracefully hide the section instead of awkwardly rendering empty.

## Implementation notes

- Delete `app/projects/[slug]/data/page.tsx` and its nav entry in `layout.tsx`.
- Build the Data-model sub-section as part of item 29 (Architecture tab populate). The rendering is conditional on `project_data_concepts.has_data_layer = true` OR `data_sources.count > 0`.
- Underlying tables (`project_data_concepts`, `data_sources`, `project_data_contracts`) stay; only the UI surface changes.
