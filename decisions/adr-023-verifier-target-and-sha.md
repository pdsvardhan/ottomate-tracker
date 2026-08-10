# adr-023 — A verifier verdict is filed against the flow, at a full commit sha

**Status:** accepted · **Date:** 2026-08-11

## Context

The deploy gate (`GET /api/verify/gate`) decides whether a commit may ship. For each done
user-facing feature it walks the flows linked to that feature and requires an APPROVE row in
`feature_verification_reports` whose `target_id` is the **flow id** and whose `commit_sha` equals
the deploying commit.

Neither field was validated on write, and both had drifted:

- **`target_id` arrived in three shapes.** Of screenroom's 16 rows, 12 carried a bare iteration
  number (`905`, `845`, `135`…) and only 2 a flow id. The generic runner
  (`run-matrix.feature-verify.spec.ts`) posted `m.feature`, the feature id. Every one of those
  APPROVEs looked healthy in the table and was invisible to the gate.
- **`commit_sha` arrived in two shapes** — 40-hex and 7-char abbreviations — while the gate
  compared with `=`. A report stored short could never satisfy a full-sha query. The gate reported
  `no-approve-at-commit`, which reads as "never verified" rather than "format mismatch".

The route's own comment asserted the flow-id convention. The data contradicted it. A to-do (#469)
had been filed concluding the gate needed a `last_tested_commit` column on `flows`; that column
exists nowhere in the app, and building it would have added a field nothing reads.

## Decision

**The canonical `target_id` for a `stage-3-feature` or `flow` report is the registry flow id**, and
**`commit_sha` is the full 40-hex sha.**

Enforcement:

1. `POST /api/feature-verification-reports` pins `commit_sha` to `/^[0-9a-f]{40}$/` on **every**
   project. A caller always has the full sha (`git rev-parse HEAD`), so this costs nothing and
   removes the silent-mismatch class entirely.
2. The same route requires `target_id` to resolve to a flow **in that project**. This ramps on
   `verify_gate`, matching how the anti-gaslight rules already ramp: **422** where a gate is live,
   a `warning` field in the 201 where it is `'off'`. Only screenroom is gated today; mapsofbharat's
   46 legacy rows keep working and are told why.
3. `GET /api/verify/gate` resolves the sha by **prefix in both directions** (7-hex floor, git's own
   abbreviation minimum) and 400s on a non-hex value. A reader may pass either form.
4. The case matrix gains an optional `flow_id`; `gen-matrix` carries it through and the runner
   posts `m.flow_id ?? m.feature`.

## Alternatives rejected

**Key the gate on the feature id instead** (the shape the generic runner already posted). Cheaper —
one verifier run per feature rather than per flow — but it would let a single APPROVE clear a
feature whose other flows were never driven. That is precisely the failure the gate exists to
catch, so the ergonomic win was not worth the guarantee.

**Accept both shapes in the gate.** No harness changes and no wasted runs, but it permanently
blesses two conventions and makes the per-flow guarantee unenforceable — you could never tell which
kind of evidence a green gate rested on.

**Backfill the 12 iteration-numbered rows.** There is no safe mapping from an iteration to a flow.
Inventing one would manufacture exactly the false evidence this change removes. They stay as they
are, and stay invisible to the gate.

## Consequences

- The verifier sweep is per (feature × flow): screenroom's is ~17 runs across 14 features, not 14.
- Because the match is commit-specific, **every new commit invalidates every APPROVE**. The sweep
  must be the last action before deploy, on the frozen commit.
- Matrices without a `flow_id` still run and still post; on a gated project they now fail loudly at
  the API instead of quietly producing evidence nobody reads.
