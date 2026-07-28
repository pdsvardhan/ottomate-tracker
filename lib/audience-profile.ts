// lib/audience-profile.ts — #319 (2026-07-28): audience-profile (P1/P2/P3) capture + intelligent
// backfill. The profile is the field resolveFloor(profile) uses to decide which floor rules bind.
//
// TWO halves, both here as pure logic:
//   - suggestProfile()        — infer a *suggestion* from signals the app already has (backfill).
//   - resolveProjectProfile() — the owner-set profile ALWAYS wins and is NEVER overwritten; only
//                               when unset do we fall back to a suggestion. Suggest, never assert.
//
// Stored (no migration) at ui_master_plans.design_ledger.context.profile — the same blob the context
// gate already writes. Each decision keeps design_decisions.profile_at_decision (already a column).

export type AudienceProfile = 'P1' | 'P2' | 'P3';

export interface ProjectSignals {
  current_status?: string | null;
  lifecycle_phase?: string | null;
  hosting_target?: string | null;
  public_url?: string | null;
}

export const PROFILE_META: Record<AudienceProfile, { label: string; blurb: string }> = {
  P1: { label: 'just me / a demo', blurb: "I'm the only user — err generous; screen-reader-only floors skip." },
  P2: { label: 'small team / internal', blurb: 'Colleagues use it — the standard floor binds.' },
  P3: { label: 'shipped / external users', blurb: 'Strangers use it — the full WCAG 2.2 AA floor binds.' },
};

const VALID = new Set<AudienceProfile>(['P1', 'P2', 'P3']);

/**
 * Infer a SUGGESTED profile from signals already on the project. Never null — always a suggestion
 * with named evidence, so the owner sees why. NB: `vault7a-docker` hosting is the SSO-gated home box,
 * NOT external reach — only `public-server` counts toward P3.
 */
export function suggestProfile(p: ProjectSignals): { profile: AudienceProfile; evidence: string[] } {
  const phase = p.lifecycle_phase ?? '';
  const status = p.current_status ?? '';
  const ev: string[] = [];

  // P3 — a shipped, externally-reachable surface
  if (p.hosting_target === 'public-server') ev.push('hosted on a public-server (external reach)');
  if (status === 'shipped') ev.push('current_status = shipped');
  if (phase === 'shipped' || phase === 'maintained') ev.push(`lifecycle_phase = ${phase}`);
  if (ev.length) return { profile: 'P3', evidence: ev };

  // P1 — early or owner-only
  if (phase === 'ideating') return { profile: 'P1', evidence: ['lifecycle_phase = ideating'] };
  if (status === 'building' && (phase === 'building' || phase === '')) {
    return { profile: 'P1', evidence: ['still building, not yet shipped — assume owner-only'] };
  }

  // P2 — the middle: no strong external signal, no strong early signal
  return { profile: 'P2', evidence: ['no strong external or early-stage signal'] };
}

export interface ResolvedProfile {
  profile: AudienceProfile;
  source: 'set' | 'suggested';
  evidence: string[];
}

/**
 * The profile in force for a project. An owner-set `contextProfile` (from the context gate) ALWAYS
 * wins and is never overwritten by a suggestion — the backfill is suggest-only, the same discipline
 * as the author backfill and prior-art (name it, don't resolve it).
 */
export function resolveProjectProfile(p: ProjectSignals, contextProfile?: string | null): ResolvedProfile {
  if (contextProfile && VALID.has(contextProfile as AudienceProfile)) {
    return { profile: contextProfile as AudienceProfile, source: 'set', evidence: ['captured in the context gate'] };
  }
  const s = suggestProfile(p);
  return { profile: s.profile, source: 'suggested', evidence: s.evidence };
}
