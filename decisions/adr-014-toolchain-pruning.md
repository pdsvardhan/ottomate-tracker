# adr-014: Toolchain pruning — gates only reference deployed tools

- Status: accepted · Date: 2026-06-10 (user approved per-tool list)

## Context

Stage 3 gates referenced six tools that were "locked" in docs but never deployed (Infisical, GlitchTip, Lost Pixel, k6, Plausible) — unsatisfiable gates train the operator to waive gates. Meanwhile zero-infra test tools (Vitest, Playwright) were configured but produced no real gate.

## Decision

KEEP as real gates: Vitest (unit, per project), Playwright (one happy-path E2E per critical flow), Trivy (image/dep + secret scan at deploy), axe (a11y smoke on key pages). Lighthouse stays advisory — reported, never blocking. E2E severity: red blocks deploy for cv/public-tagged projects, warns for personal/internal.

REMOVE from all gate definitions until actually deployed: Infisical (replaced by Docker secrets + gitleaks/Trivy secret-scan rule), GlitchTip (docker logs suffice solo; kill the auto-risk that fires on every project), Plausible (optional, public sites only), Lost Pixel (dropped entirely), k6 (dropped entirely — single-user system).

## Consequences

- Stage 3 deploy gate becomes mechanically satisfiable; skill references updated in WS2.
- flow_test_runs/test_runs ledger tables become the gate's evidence source (wiring in WS3/WS4).
