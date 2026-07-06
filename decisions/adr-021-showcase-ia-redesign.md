# adr-021 — Per-project showcase IA: hero + four tabs, verified-data-only

**Status:** accepted · **Date:** 2026-07-06

## Decision
Every per-project page on the Ottomate site adopts a uniform IA: a **HERO** band (stage pill, problem-led hook from `problem_statement`, Live/Repo cards, 4 stat cards, **visual-identity strip** from `ui_master_plans`, reel placeholder) plus **four tabs** — **Overview** (why it exists / what it does / how you use it / scope incl. non-goals), **Engineering** (architecture diagrams, tech stack, security + data model, third-party services, tests + verifier results), **Decisions** (consolidated decision log + a connected **Decision → change → verified** trace thread + tradeoffs/risks), **Resources** (mirrored docs + machine-readable spec; renders only when real docs exist). The old **Development tab dissolves**; decisions stop double-rendering; **sections hide when unbacked** — no filler. Three previously-orphaned datasets are surfaced: `verification_reports` (as a clean APPROVE + reason badge), the Stage-4 iteration trace, and `ui_master_plans`. `must_haves` stay internal; `non_goals` + risks are now audience-facing (**amends adr-017**).

## Context
- The 2026-07-06 audit found per-project pages drifted: decisions rendered twice, "Development" a thin grab-bag (1–3-line timelines, an always-empty challenges section), placeholder sections rendering anyway, and rich verifier/iteration/identity data unused on orphan routes.
- Two independent AI critiques validated the core. Adopted (data-backed): visual identity → hero strip; decisions → one connected verified thread; APPROVE-badge framing; problem-led hook; stage pill sets expectations; Resources conditional. **Rejected on anti-gaslighting grounds:** a mandatory Impact/Outcomes section, a signature-narrative section, engineering de-emphasis, and a complexity score — no invented metrics or manually-authored narrative.
- Full spec: `docs/showcase-ia-spec.md`. Visual mock validated 2026-07-06 with real State of Us data (the only-full-IA-strength project alongside leaploop; cointrail lacks `ui_master_plans` + `auth_config`).

## Consequences
- **#178 (MASTER site-sync)** executes this per project via the spec §8 pass: (1) reconcile code↔tracker↔repo → (2) clean repo + wire doc-mirroring → (3) write narrative once, mirror to repo + Resources → (4) populate IA sections from verified facts → (5) build interactive workflow + system diagrams (React Flow) → (6, globally last) logos + real reel media (#165).
- **Cadence: one-time migration, then trigger-based touch-ups — no scheduled re-dos.** Data-driven sections stay current via Stage-4 iterations automatically; the hand-authored layer (narrative, docs, diagrams) is re-touched only when that project ships a meaningful iteration. Ongoing freshness rides pack-up mirroring (adr-011/016); recurring drift = a skill-flow bug to fix, not a bulk-redo trigger.
- Rollout order rides the deep-dive queue: **cap-a → mapsofbharat → portfolio → ottomate LAST**; the 5 already-dived projects (cointrail, windfall-labs, stateofus, leaploop, ingest) get the page rewrite without a full re-reconcile. Actively-building projects get their pass when their current burst settles.

## Related
adr-011 (public-docs mirror), adr-016 (docs generated, not handwritten), adr-017 (amended — non_goals/risks now surfaced), #178 (execution), #165 (reel media), #179 (mobile E2E, independent).
