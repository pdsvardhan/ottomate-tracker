# adr-025: The showcase shows the verifier at work — a change it sent back, and how often it sends changes back

- Status: accepted · Date: 2026-11-04 (owner locked at the iteration-208 gate: "Lock all 9") · curated · cat:product
- Overrides: the 2026-06-10 capture-vs-display rule as restated in adr-017 ("Rails (… verifier output) remain
  capture-only and are still never rendered"), for verifier output only. Amends adr-021.

## Context

The 2026-06-10 ruling treated verifier output as a build rail: captured, never rendered on the showcase. adr-017
reversed it for decision records but kept it for rails. adr-021 (2026-07-06) already let a little through — an
APPROVE count and one APPROVE verdict with its reason on the Decisions tab.

That is the weakest possible evidence. An APPROVE says the change passed; it does not show that the verifier is
independent or that it ever says no. The data says it does: roughly one change in ten is sent back. When this
was written (2026-11-04, before iteration 208's own verification), 20 of the last 200 verification reports were
send-backs — 18 ITERATE, 2 BLOCK — counted newest first by time, then by filing order. The iteration brief quoted
19 (18 + 1): 19 reports filed in the same second sat across the 200th place, and the API used to leave that tie
to the database, oldest first. The API and the showcase tile now use the same order (`ran_at`, then `id`, both
newest first), so a recount through the API always matches the tile; both move with every new report.
A reviewer saw none of this. The featured "How a change actually ships" example was a trivial APPROVE.

Verifier text is also where private data lives. On Cointrail and Ingest (personal finance) the verification notes
contain masked account numbers and payees, so the rule cannot simply be dropped.

## Decision

1. **Verifier output is showcase content**, in two forms:
   - **One sent-back change** on the Decisions tab, told end to end: the ask → what was locked at the gate → the
     verifier's ITERATE/BLOCK and its reason → the fix, re-checked and approved, with that reason. This project's
     own change is preferred; otherwise the most recent one from any project, labelled with its project.
   - **The send-back rate**, live from `verification_reports`: "sent back N of the last M changes" over the most
     recent 200 reports, all projects, in the existing stat-tile look.
2. **Guards on what can be featured.** Never from a financial project (Cointrail and Ingest by name; any project
   tagged `finance` or with `data_sensitivity_tier = financial`, which today also covers Windfall Labs). Nothing
   whose text reads like money or an account (currency amounts, masked or long account numbers, digit-grouped
   amounts, payees, bank names). The approval has to show the fix ("fixed", "re-verified", round/pass 2+); a
   send-back closed as not-applicable is not a fix story. The card text is cut so each step says what it is
   for: the send-back step starts at the catch (the first sentence naming what failed), and the approval step
   ends on the resolution — never on a clause that still reads as a failure.
3. **Fallback.** When nothing qualifies, the section shows the previous example (this project's fullest APPROVE).
   In the visitor view a financial project's fallback keeps only its title and verdict.
4. The rule still holds for everything else: per-pass verifier notes, full reports and raw report text stay
   capture-only, and `/api/verification-reports` stays behind the login (adr-026).

## Consequences

- A reviewer sees that the gate is real: one concrete catch with the verifier's own words, and the live rate
  (about 10% in early November 2026).
- The rate is honest by construction — computed per request from the reports table, not typed in.
- The guards are pattern-based and deliberately conservative: a false positive only means a different change is
  featured. A new financial project needs a `finance` tag (or the financial tier) to be excluded automatically.
- Code: `lib/showcase.ts` (`sendBackRate`, `sentBackHistories`, `pickSentBackStory`, `clipToCatch`,
  `approvalExcerpt`, `scrubStoryForVisitor`),
  `app/projects/[slug]/page.tsx`, `components/project/ProjectShowcase.tsx`; tests in `tests/showcase.test.ts`.
