# Components page — live + interactive previews (design)

- **Date:** 2026-06-24
- **Project:** ottomate
- **Iteration:** #36 (report #43) — lock-in gate: http://localhost:8110/iterations/36
- **Status:** awaiting lock-in approval (no code before the gate)

## Goal

Every component on the component **detail page** Preview pane must render **live and
interactive** — styled, with realistic demo data, demonstrating its actual behaviour.
No blank boxes, unstyled skeletons, or "needs props" apologies. **Scope:** detail
Preview pane only; the catalog grid and the Stage 2.4 / 4.4.5 picker are unchanged for now.

## Current architecture (iter-77, esbuild -> iframe)

`scripts/build-previews.mjs` is a one-shot pipeline that, per master_component:
1. reads source from `/mnt/storage/ottomate/assets/components/<id>/`
2. bundles it standalone with esbuild (sandbox node_modules, `@/` shims, demo fixtures)
3. renders headless in the Playwright docker image, measures painted-coverage, screenshots
4. publishes `index.html` + `shot.png` + a status into `previews-manifest.json`

`app/components-browser/[id]/LivePreview.tsx` serves status `live` as an interactive
iframe (`/api/previews/<id>/index.html`), `html` as a srcdoc iframe, everything else as
a reason panel. **The path works** — `mc-pricing-table` renders fully live + interactive
through it. This is a fidelity-gap fix, not a rebuild.

## Diagnosis — "122/190 live" is inflated

"live" only means *some pixels painted* (a coverage heuristic), not *the component shows
itself*. From the 2026-06-23 manifest, components counted **live** while painting almost
nothing:

| Component | painted | real cause |
|---|---|---|
| mc-avatar-stack | 0.7% | needs `avatars` prop, got generic children |
| mc-card-nav | 0.6% | CSS stubbed + animation |
| mc-profile-card | 2.1% | CSS file stubbed to empty |
| mc-chart-area | 42% / 0 chars | no demo data -> recharts draws axes only |

And false-empties: `mc-word-rotate` has a fixture but animates in -> first frame blank ->
counted "empty". Same overclaim pattern flagged for iter-8 ("69% live" = import-
resolvability, not render).

## Five root causes

1. **CSS stubbed** — `cssStub` empties every imported `.css/.scss`; only Tailwind-CDN utilities survive.
2. **Fixtures sparse** — ~35 overrides / 190; no fixture -> generic boxes / empty props.
3. **Render-check wrong both ways** — counts 0.6% as live, flags animated entry as empty.
4. **Missing providers** — slider/table/form primitives throw without their parent context.
5. **HTML/vanilla srcdoc path renders blank**; build is a manual one-shot (#79).

## Approach

Fix the iter-77 pipeline **in place** (reuse the working esbuild->iframe path; no new
infra). *Rejected:* per-component mini-app host (heavier, only if the context tail proves
worth it); static screenshots (the bar is live + interactive).

## Workstreams (iteration #36 items)

1. **[273]** Un-stub CSS — compile real component CSS/SCSS + catalog Tailwind config.
2. **[274]** Expand fixtures — cover all prop-driven components.
3. **[275]** Hero state — auto-open/fire/seek interactive components, keep interactive.
4. **[276]** Provider/context wrapping — slider group, table, form, tooltip.
5. **[277]** Fix HTML/vanilla srcdoc path (GSAP/CDN + multi-file).
6. **[278]** Honest render-check — replace the painted-coverage heuristic.
7. **[279]** Wire `build:previews` into component CRUD + seed (#79).
8. **[280]** Salvage-then-delete irreparable — DB + asset backup first.

## Salvage-then-delete policy

After 1–7 run, every component that renders live+interactive stays. Only the genuinely
irreparable remainder (a subset of today's needs-context / unresolvable-alias / missing-dep)
is deleted from the catalog. **Back up the DB and `/mnt/storage/ottomate/assets/{components,previews}`
before any delete** (adr-015 WAL-safe backup; adr-019 prune precedent). None of the 14
components in the review screenshots are deletion candidates — all are salvageable.

## Verification

Stage 4.7 verifier per item, independent of the coder. The honest render-check (item 278)
becomes the source of truth for "live"; the trace report must show real per-component
render status, not a painted-coverage number.
