---
public: true
type: validation
title: Validation — Ottomate
order: 3
summary: What's actually built and proven — and what's honestly still untested.
read_minutes: 3
---

# Ottomate — Validation

> As of 2026-09-07 (ottomate-tracker-v3 @ be39ec4). What has been shown to work, and the ledger evidence behind each claim.

## What is built
The core pipeline and tracker are functional. Marked done in the tracker: the anti-gaslighting bedrock, the 4-pass verifier sub-agent, the iteration lock-in gate, bearer-token auth, the session-end pack-up ritual, FTS5 cross-doc search, project lifecycle tracking, the component catalog (browse, CRUD, live preview, per-project feedback), the Stage-2.4 and Stage-4.4.5 pickers, the inspirations gallery, the cross-project bug inbox, ADR tracking, and the YAML mirror with a drift watcher. Architecture diagrams and the "Spotlight Glass" design system are still in progress.

## What is proven by tests
A **35-case Vitest contract-test suite** is green, exercising the real route handlers against a throwaway SQLite DB. Coverage includes projects, features, architecture, verification-reports, infra, and — most relevant here — the anti-gaslighting rules. Those tests assert behavior, not vibes: a `done` feature with no claim row and no acceptance criteria is flagged by both `unclaimed-done` and `missing-acceptance`, then clears once a claim exists; a deploy with no prior test run is flagged by `untested-deploys`, then clears; and `verification-reports` rejects unauthenticated POSTs (401), unknown features (404), and invalid recommendation values.

## What the gates enforce
The lock gate genuinely blocks: zero active items, or any sub-0.7-confidence item without a human edit, is rejected. Every mutation runs through one helper that checks the bearer token *and* scans for deleted DB file descriptors, returning 503 rather than a lying 201 when the write path is unsafe.

## Honest gaps
This is a **single-user, self-hosted tool** — there are no production users, adoption metrics, or external uptime to report, and none are claimed. There is **zero end-to-end browser coverage**: all 55 defined UI flows remain `not-tested`, so there is no regression net at the browser level. Known open risks are tracked honestly: no error tracking deployed (errors land in Docker logs), no rate limiting (deemed acceptable for localhost + bearer + SSO), and a residual `drizzle-orm` advisory deferred to publish-time because it is non-exploitable on a single-user localhost path. The LAN path is intentionally open on trusted home WiFi; only the internet path is SSO-gated.
