# adr-022 — Self site-sync pass: register, stale success criteria, canonical Stage-4 journey flow, dead code (#178)

**Status:** accepted · **Date:** 2026-07-07

## Decision
Complete ottomate's own Stage-4 site-sync pass (the deliberately-last project in the #178 queue):

1. **Register** — `short_description` written (was null); README component count corrected 89 → 116 (17 categories). The June audit's "foundation scaffolding" README claim was already fixed in an earlier pass; the Next.js 16 claim is correct (verified against package.json ^16.1.6 — the June note calling it stale is itself stale).
2. **Success criteria updated to reality** — SC#6 referenced the retired "11-tab project detail" (superseded by the adr-021 hero + 4-tab IA); SC#10 demanded "migration of all 13 existing web projects" (adr-019 narrowed the tracker to 8 active, windfall-labs joined later = 9 tracked). Both reworded to the current, verifiable state.
3. **#148 decision (flows without steps): populate one canonical journey, prune nothing.** The 54 ottomate flows are UI micro-flows whose trigger + outcome capture is honest as-is; fabricating 6-step arrays for all of them would be filler. Instead one new critical flow — `flow-stage4-iteration-loop`, the report → classify → lock → build → verify → integrate journey — carries real steps, evidence-backed by `tests/e2e/iteration-bedrock.spec.ts` (16/16 green, independent verifier APPROVE), so the showcase "How you use it" section renders the true core loop.
4. **#117 validation** — the process diagram (Stage 0 → 4 with the Stage-4 loop) was checked against the real pipeline: accurate, no fix. The dead `SwimLanePipeline.tsx` (0 imports since the redesign) is deleted.

## Context
Part of the #178 master site-sync executing ottomate adr-021. Every other tracked project passed first (cap-a, mapsofbharat, portfolio tonight; 5 dived earlier); ottomate itself went last per the deep-dive plan, since it was mid-redesign until the adr-021 template shipped.

## Consequences
- ottomate's own showcase page now renders the full IA with a real journey chain in Overview.
- Success criteria no longer contradict adr-019/adr-021.
- Remaining #178 chunks: rewrite-only check on the 5 dived projects, React Flow diagram rollout, homepage register render-check.

## Related
adr-019 (eight-project focus), adr-021 (showcase IA), #178, #148 (folded), #117 (folded).
