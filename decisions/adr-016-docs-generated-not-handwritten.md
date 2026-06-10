# adr-016: Status docs are generated, not hand-written

- Status: accepted · Date: 2026-06-10 (user approved)

## Context

Every hand-written numeric claim about the system drifted wrong: 88/76/75 routes vs 104 actual; 43/~30 tables vs 60+; STATUS.md still advertised data its own cleanup section said was deleted; 5 of 10 documented UI URLs 404'd. For a system whose purpose is truthful state, hand-maintained status docs were the proven failure mode.

## Decision

- STATUS.md in the skill plugin is generated from the live API (counts, project list, last activity) by scripts/generate-status.sh — never hand-edited.
- README stays hand-written but contains no counts, only pointers.
- REQUIREMENTS.md and PILOT_ONBOARDING.md move to _archive/ as historical record.
- The skill plugin lives in git (Gitea pdsv/ottomate) so doc changes are auditable.

## Consequences

- "Update STATUS" becomes "run the script" (pack-up can invoke it).
- Historical R-numbers remain available in _archive for archaeology; live docs stop pretending to be a spec.
