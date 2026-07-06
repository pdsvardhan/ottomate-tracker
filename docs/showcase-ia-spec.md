# Ottomate — Per-Project Showcase Page: Information Architecture Spec

**Status:** Finalized — critique round done, decisions reconciled in §6b; adopted as adr-021 · **Date:** 2026-07-06
**Purpose of this document:** Define exactly what the Ottomate website should show on each *project* page, for whom, and why — so a reviewer can judge whether the structure is right and suggest what would be better to show, add, cut, or reorder.

---

## 0. How to critique this (note to the reviewer)

You are reviewing the information architecture (IA) of a personal project-showcase website. You do **not** need prior context — everything needed is below.

We want your critique on:
1. **Audience fit** — does the structure serve the stated audiences well? (§2)
2. **Tab & section structure** — is the 4-tab IA the right cut? Anything redundant, missing, mis-placed, or that should be merged/split? (§4)
3. **What we're NOT showing** — is anything in the "deliberately excluded" or "available but unused" lists a mistake to omit? (§6, §9)
4. **Clarity for a general audience** — will a non-technical visitor understand each project in ~20 seconds while a technical visitor can still verify depth? (§3)
5. **Anything better** — data we should surface, framing we should change, or sections that will read as thin/filler.

Constraints you should respect in your suggestions: everything shown must be **backed by real, verifiable data about what was actually built** (this is an anti-gaslighting project — no aspirational or placeholder content). The data currently available per project is inventoried in §8/§10; suggestions that require data we don't capture are welcome but should be flagged as "new data needed."

---

## 1. Context: what Ottomate is

Ottomate is a **website + AI-skill pair** that orchestrates the owner's web-project work across five stages (idea → design → build → iterate → maintain) on a self-hosted home server. Its defining principle is **anti-gaslighting**: every change goes through an explicit lock-in gate where the owner confirms what was extracted from a request before code is written, an independent verifier checks the result, and all state is stored so nothing is silently dropped or over-claimed.

The **website half** is the owner's **public project showcase**. It has:
- A **homepage register** listing all tracked projects (a scannable table of cards).
- A **per-project page** (the subject of this document) that tells each project's full story.

There are ~9 tracked projects of varying maturity (e.g. a personal-finance dashboard, a quant backtesting cockpit, a public-opinion polling platform, a 3D portfolio, an India-statistics map platform). They range from "shipped/maintained" to "still building." **The per-project page template is uniform; only the content differs per project.**

## 2. Who this is for (audience)

**Decision: serve all three audiences, equally weighted, via a layered design.** No single audience is deprioritized; the page is structured so each finds what they need at their depth.

| Audience | Why they're here | What they need |
|---|---|---|
| **Recruiters / hiring managers** | The owner is a **Product Manager job applicant**; the site is portfolio evidence. Mostly non-technical to semi-technical. | Fast legibility: what is it, why does it exist, what did he actually ship — with proof available if they want it. |
| **Engineers / technical peers** | Evaluating engineering depth and judgment. | Architecture, tech choices, tradeoffs, decision rationale, honest risks. |
| **General public** | Curiosity; shared links. | Plain-language explanation, no jargon required to get the gist. |

**Design principle that makes "all audiences" work — layering:** every project page leads with a **plain-language layer** anyone understands in ~20 seconds (what it is, why it exists, what it does), then stacks **technical depth** below and in later tabs as *proof-on-demand*. A recruiter can stop after Overview; an engineer can dig into Engineering and Decisions.

## 3. Guiding principles

1. **Show what was actually built**, verified against the code — never aspirational. (Anti-gaslighting, turned outward.)
2. **Every section is backed by real data.** No thin/placeholder sections dressed up as content. If a project lacks data for a section, the section hides rather than shows filler.
3. **Legible first, deep second.** Plain-language lede; technical proof stacked below.
4. **Honesty as a feature.** Show non-goals, tradeoffs, and open risks — this signals maturity, especially to technical reviewers.
5. **Single source of truth.** Documentation is written once and mirrored to both the code repository and the site, so the two never drift.

## 4. The finalized IA — what each project page shows

Structure: a **hero** band, then **four tabs**. For each section below: *what it shows* — `data source` — (plain-language | technical).

### HERO (top of every project page)
- Project name; **stage** pill (Spec / Build / Shipped / Maintained) — the stage pill also **sets expectations**, so hidden/empty sections read as "not there yet," not as omissions.
- A one-line **hook that leads with the problem/motivation** (from the existing `problem_statement` / `core_idea` — verifiable existing data, not invented narrative).
- **Live URL** card (`public_url`) and **Repository** card (`repository_url`).
- Four **stat cards**: Active features · Decisions (ADR count) · Iterations · Started (month-year).
- A compact **visual-identity strip** — palette + fonts + layout style (`ui_master_plans`). *Moved here from Engineering per critique: visual identity is a first-impression/UX signal, not a backend concern. Also seeds the eventual reel.*
- A **reel/media** area — *currently a placeholder; real media is deferred to the very last phase (see §7).*

### TAB 1 · OVERVIEW  — the plain-language story (any audience)
| Section | Shows | Data source | Layer |
|---|---|---|---|
| **Why it exists** | The problem it solves + context chips (devices, hosting, scope, status) | `problem_statement`, `target_devices/hosting_target/scope_size/current_status` | plain |
| **What it does** | Feature cards grouped done / building / next, each with a one-line "why" | `features` (title, status, priority, short_description) | plain |
| **How you use it** | The main user journey as a step-by-step chain (the critical path) | `flows` (critical/first with steps) + `flow_steps` | plain |
| **Scope** | What success looks like **and** what it deliberately does **not** do | `project_success_criteria` + `project_non_goals` | plain |

### TAB 2 · ENGINEERING — technical proof-on-demand
| Section | Shows | Data source | Layer |
|---|---|---|---|
| **Architecture** | Branded **workflow** + **system** diagrams (redesigned, interactive) | `diagram_artifacts` (process/topology/platform) | technical/visual |
| **Tech stack** | Framework, database, state, styling, testing libraries | `tech_stacks` | technical |
| **Security & data model** | Auth strategy, exposure/access posture; data engine, storage, migrations, sources | `auth_config`, `policies`, `project_data_contracts`, `data_sources` | technical |
| **Third-party services** | Each external service + its purpose | `third_party_services` | technical |
| **Tests & verification** | Honest test-coverage ratio **+ the independent-verifier results**, shown as a compact **APPROVE ✓ + one-line reason** badge per built item (a clean stamp, never raw debug passes) | `flows.test_status`, **`verification_reports`** (newly surfaced) | technical |

### TAB 3 · DECISIONS — judgment & maturity

Reframed per critique into **one connected thread** rather than three disconnected lists: a decision leads to a change, which is built, verified, and closed out.

| Section | Shows | Data source | Layer |
|---|---|---|---|
| **Decision log** | Consolidated key decisions (curated-first, expandable to the full journal) — *fixes today's double-render of decisions in two places* | `adr_index` | plain + technical |
| **Decision → change → verified** | The connected story: a decision/request → the locked iteration item(s) it produced → the independent-verifier outcome → what shipped. This is the skill's existing **trace report**, surfaced for the public. The only "outcome" claimed is the *verified built change* — real and checkable; **no impact metrics are invented**. | **`iterations` / `iteration_items` / `verification_reports`** (trace) | technical |
| **Tradeoffs & risks** | Open risks (acknowledged, not hidden) + resolved challenges (problem → resolution) | `risk_instances` + `risks_catalog` | technical |

### TAB 4 · RESOURCES — go deeper
| Section | Shows | Data source | Layer |
|---|---|---|---|
| **Documentation** | Long-form project docs, read in-page | `project_docs` (mirrored from the repo — the single-source-of-truth lever) | plain + technical |
| **Spec & source** | Machine-readable project spec download + repository link | YAML mirror endpoint, `repository_url` | technical |

*The Resources tab renders only where a project has real mirrored docs; for thin projects it hides entirely (both critics flagged it as the weakest tab — kept, but never hollow).*

### HOMEPAGE REGISTER (context — the list that links to these pages)
Each project card shows: **name · one-line summary · stage · progress** (done/total features + %) **· category** (public/private) **· stack** (framework + database) **· links** (live + repo) **· age**. Expanding a card reveals a short blurb + tags. This is the scannable index; the per-project page is the deep dive.

## 5. What changed from the current site, and why

The current per-project page also has four tabs, but they are **Overview / Engineering / Development / Resources**, with Architecture nested inside Engineering. Problems we are fixing:

1. **Decisions are rendered twice** — a curated view in Engineering *and* a full journal in "Development." → Consolidated into the single **Decisions** tab.
2. **"Development" was a thin grab-bag** — an activity timeline that is only 1–3 log lines per project, a "challenges resolved" section that is **empty on every project**, tests, and risks. → **Dissolved**: tests move to Engineering; decisions + risks + real change-history become the **Decisions** tab.
3. **Empty/placeholder sections rendered anyway** (thin timeline, single hardcoded "download," "media coming soon" reel). → Sections now hide when unbacked; the reel becomes a real, deferred deliverable.
4. **Rich data sat unused** on orphaned internal routes. → We surface three high-value ones: **verifier results, iteration history, visual identity** (owner-selected).

## 6. What we deliberately do NOT show (and why)

- **`must_haves`** (internal build requirements) — build-rail, not audience-facing.
- **Verifier internal pass-by-pass detail** — we surface the *outcome* (approve/reason), not the raw internal passes.
- **Pages/components inventory** — exists and is rich, but the owner chose **not** to surface it now (risk of a dry, catalog-like section). *Reviewer: flag if you think this is a mistake.*
- **Governance/ops tables** (sanity checks, phase-transition ledgers, drift logs, YAML mirror state) — internal machinery.
- **Note on a rule change:** an internal rule (adr-017) historically said `non_goals` and `risks` were hidden build-rails. In practice the live site already shows them, and the owner has decided to **surface success criteria + non-goals** (Scope) and **risks/tradeoffs** (Decisions). The rule is being updated to match. `must_haves` remain hidden.

## 6b. Critique reconciliation — two external AI reviews (2026-07-06)

Two independent AI reviewers critiqued this spec. Both validated the core (anti-gaslighting, layered audience, tradeoffs, hide-empty, ADRs/risks/verification). Their pushback clustered on one theme — *more emotion / narrative / impact*. Reconciled against our constraints:

**Adopted (data-backed, no fabrication):**
- Visual identity moved out of Engineering to a **hero strip** (both reviewers + our own flag).
- Decisions reframed into **one connected Decision→change→verified thread** (the trace report) instead of disconnected lists.
- Verifier results shown as a **clean APPROVE ✓ + reason badge**, not raw passes (answers Reviewer 1's question).
- Hero hook **leads with the problem/motivation** (from existing `problem_statement`).
- **Stage pill sets expectations**, so hidden sections read as "not yet," not omissions.
- Resources **kept but conditional** (hides when a project has no real docs).

**Deliberately rejected (conflict with the anti-gaslighting constraint, or misread the strategy):**
- **A mandatory "Impact / Outcomes" section** — both reviewers' top ask. Rejected: many of these are personal tools with no users or metrics; a forced impact section would pressure us to invent numbers — the exact failure this system prevents. (The "verified built change" in the Decisions thread is the only outcome claimed, because it's checkable.)
- **A signature narrative section** ("what surprised me / what I'd rebuild") — rejected to keep the page objective and free of manually-authored narrative, even honest reflection.
- **"De-emphasize engineering, rebalance to Product"** — rejected: the wedge is *a PM who can build*; engineering depth is the deliberate differentiator, not an imbalance.
- **A "complexity score" visual** — rejected: an invented, arbitrary metric.
- **Wholesale emotional section-renames** — rejected: over-narrativizing forfeits the "rigorous, not marketing" signal that is the actual edge.

Net: the foundation held; we took the data-backed refinements and declined the narrative/impact additions on principle.

## 7. Deferred to the very end (cosmetic finishers)

- **Per-project logos.**
- **The showcase reel / GIF** — real media (screenshots or short capture) per project, replacing the placeholder. No data backs this today; it needs real assets and possibly a small media pipeline.

## 8. How each project page gets built — per-project execution model

Because content must be trustworthy, each project goes through **one merged pass** (not separate "website" and "repo" efforts):

1. **Reconcile** the code ↔ tracker database ↔ repository to establish ground truth (catch stale or over-claimed data first).
2. **Clean the repository** — remove stale/redundant files, refresh the README and docs, sanity-check structure, and wire up doc-sharing with Ottomate.
3. **Write the narrative once → mirror** it to both the repo and the site's Resources tab (single source of truth).
4. **Populate the IA sections** from the verified facts.
5. **Build that project's diagrams** (interactive workflow + system).
6. *(Globally last)* logos + real reel media.

Projects are done a few at a time, chosen per work session. **Population reality varies** — some projects are content-rich (e.g. a project with 36 decisions, 14 features, 4 diagrams), others are thin (e.g. one with no problem statement, no live URL, no docs yet). The IA must degrade gracefully for thin projects (hide, don't fake).

## 9. Judgment calls — resolved after critique

1. **Visual-identity placement** → **hero strip** (out of Engineering).
2. **"How it evolved" richness** → renders **conditionally**, folded into the Decisions thread; the Decision log carries the weight where iteration history is sparse.
3. **Resources as a full tab** → **kept, conditional** (hides without real docs).
4. **Thin-project handling** → **hide unbacked sections**, with the **stage pill** setting expectations.
5. **Pages/components map** → **stays excluded** (both reviewers agreed).
6. **Impact & signature-narrative sections** → **not added** — see §6b for the reasoning.

## 10. Appendix — current-state data map (what's available)

So the reviewer knows what data exists to work with:

**Rendered today:** project meta (problem, status, devices, hosting, scope), success criteria, non-goals, features (title/status/priority/short_description), flows + steps, decisions (ADRs), diagrams, tech stack, auth + policies, data contracts + data sources, third-party services, docs, to-dos (as roadmap), activity events, iteration count, open/resolved risks.

**Captured but NOT shown today (candidates to surface):**
- **`verification_reports`** — independent-verifier passes/reasons *(we are now surfacing this)*.
- **`ui_master_plans`** — palette, fonts, animation level, layout style *(we are now surfacing this as Design system)*.
- **`iteration_items` / trace / lock-in audit** — the real Stage-4 change history *(we are now surfacing this as "How it evolved")*.
- **pages / components inventory** — full page & component IA *(deliberately excluded for now)*.
- **Feature/flow depth** — acceptance criteria, edge cases, pre-conditions, dependencies *(not currently planned to surface)*.

**Not captured at all (would need new data):** real media/screenshots for the reel; structured outcome/impact metrics (users, usage); a first-class changelog.

**Population snapshot (3 sample projects):**

| Section | Content-rich project | Mid project | Thin project |
|---|---|---|---|
| Problem statement | ✓ | ✓ | **missing** |
| Success / non-goals | ✓ | ✓ | ✓ |
| Features | 12–14 ✓ | ✓ | ✓ |
| Architecture diagrams | 4 ✓ | **0** | 2 (thin) |
| Decisions (ADRs) | 5–36 (varies) | 36 (rich) | 6 |
| Security / data-model cards | partial | ✓ | partial/empty |
| Third-party services | ✓ | ✓ | **0 (hidden)** |
| Docs (Resources) | ✓ | ✓ | **0 (empty)** |
| Live URL | ✓ | ✓ | **missing** |

---

*End of spec. Feedback most useful as: (a) structural changes to §4, (b) additions/removals to §6/§9, (c) audience-fit issues in §2/§3.*
