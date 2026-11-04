// Showcase display rules (iter-208, feature feat-reviewer-showcase, items 1510–1516).
// Pure functions only: the pages read the database and pass plain values in, so every rule
// here is unit-tested in tests/showcase.test.ts without a request or a DB.

// ═══════════════════════════════════════════════════════════════════
// Links (#1510 repo, #1511 live)
// ═══════════════════════════════════════════════════════════════════

/** What the grid and the project hero render for a repo or live link. null = render nothing. */
export type LinkState =
  | { kind: 'link'; href: string; text: string }
  | { kind: 'private' }
  | null;

// A repo link is only worth rendering when an outsider can open it. Gitea (git.vault7a.xyz)
// sits behind the LAN/login and localhost:3300 is this machine — both are "private repo".
const PUBLIC_REPO_HOSTS = new Set(['github.com', 'www.github.com']);

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function withScheme(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function linkText(href: string): string {
  return href.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export function isPublicRepoUrl(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  const u = parseUrl(raw);
  if (!u || u.protocol !== 'https:') return false;
  if (!PUBLIC_REPO_HOSTS.has(u.hostname.toLowerCase())) return false;
  return u.pathname.split('/').filter(Boolean).length >= 1;
}

export function repoLink(url: string | null | undefined): LinkState {
  const raw = url?.trim();
  if (!raw) return null;
  if (isPublicRepoUrl(raw)) return { kind: 'link', href: raw, text: linkText(raw) };
  return { kind: 'private' };
}

// Live-site reachability is stored per project as ONE tag in the existing projects.tags JSON
// array (no migration). The owner sets it with PATCH /api/projects/<slug> {"tags":[...]}:
//   live:public   reachable from the internet without signing in   -> "live" link
//   live:private  the host answers but lands on a sign-in page        -> "private app" label
//   live:none     no live site, or the host does not resolve          -> nothing
// No live:* tag is treated as live:none — a link is only drawn for a site known to be public.
export const LIVE_TAG = { public: 'live:public', private: 'live:private', none: 'live:none' } as const;
export type LiveStatus = 'public' | 'private' | 'none';

export function liveStatus(tags: readonly string[] | null | undefined): LiveStatus {
  const t = tags ?? [];
  // Conflicting tags resolve to the most restrictive reading.
  if (t.includes(LIVE_TAG.none)) return 'none';
  if (t.includes(LIVE_TAG.private)) return 'private';
  if (t.includes(LIVE_TAG.public)) return 'public';
  return 'none';
}

export function liveLink(url: string | null | undefined, tags: readonly string[] | null | undefined): LinkState {
  const raw = url?.trim();
  if (!raw) return null;
  const status = liveStatus(tags);
  if (status === 'public') {
    const href = withScheme(raw);
    return { kind: 'link', href, text: linkText(href) };
  }
  if (status === 'private') return { kind: 'private' };
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// Recent activity (#1512)
// ═══════════════════════════════════════════════════════════════════

// skill_events.event_type -> a plain label a visitor can read. Notes (free text with commit
// hashes, item numbers and internal remarks) are never shown in the visitor view.
const ACTIVITY_LABELS: Record<string, string> = {
  'verifier-result': 'change verified',
  'verifier-round-2': 'change re-verified',
  'verifier-dispatched': 'verification started',
  'stage-4-start': 'iteration started',
  'stage-4-staging': 'changes planned',
  'stage-4-build-start': 'build started',
  'stage-4-build-complete': 'build finished',
  'stage-4-complete': 'iteration shipped',
  'stage-4-iteration-packup': 'session wrapped up',
  'stage-4-observation': 'note recorded',
  'iteration-built': 'build finished',
  'iteration-checkpoint': 'progress saved',
  'lock-in-gate': 'changes locked in',
  'component-pick-gate': 'components picked',
  'component-pick-skipped': 'components picked',
  'placeholders-approved': 'placeholders approved',
  'item-deferred': 'item deferred',
  'session-packed-up': 'session wrapped up',
  'pack-up': 'session wrapped up',
  'session-note': 'note recorded',
  'session-interrupted': 'session paused',
  deployed: 'deployed',
  deploy: 'deployed',
  'bug-found': 'bug found',
  'bug-fixed': 'bug fixed',
  'bugfix-shipped': 'bug fix shipped',
  'reskin-shipped': 'redesign shipped',
  'design-round-published': 'design round published',
  'doc-reconcile': 'docs updated',
  'deep-dive-reconciliation': 'records reconciled',
  'feature-claim-backfill-reconcile': 'records reconciled',
  'data-refresh': 'data refreshed',
  'project-renamed': 'project renamed',
  incident: 'incident logged',
  'incident-recovered': 'incident resolved',
  hardening: 'hardening pass',
  correction: 'record corrected',
  'trace-report-correction': 'record corrected',
};

export function activityLabel(eventType: string | null | undefined): string {
  const t = (eventType ?? '').trim().toLowerCase().replace(/_/g, '-');
  const exact = ACTIVITY_LABELS[t];
  if (exact) return exact;
  // Families — stage/phase prefixes carry internal numbering, so they collapse to one label.
  if (/^stage-?1/.test(t)) return 'spec work';
  if (/^stage-?[23]/.test(t) || t.startsWith('phase-')) return 'build progress';
  if (/^stage-?4/.test(t) || t.startsWith('iteration') || t.startsWith('iter-')) return 'iteration progress';
  if (t.includes('verif')) return 'change verified';
  if (t.includes('deploy')) return 'deployed';
  if (t.includes('pack')) return 'session wrapped up';
  return 'project update';
}

/** The text shown after the project name: owner view keeps the notes, visitor view never does. */
export function activityNote(eventType: string, notes: string | null | undefined, owner: boolean): string {
  if (owner) {
    const n = notes?.trim();
    if (n) return n;
  }
  return activityLabel(eventType);
}

// ═══════════════════════════════════════════════════════════════════
// Projects grid (#1514)
// ═══════════════════════════════════════════════════════════════════

/** Visitor view leaves out projects with zero built features; the owner view lists every project. */
export function gridRows<T extends { done: number }>(rows: readonly T[], owner: boolean): T[] {
  return owner ? [...rows] : rows.filter((r) => r.done > 0);
}

// ═══════════════════════════════════════════════════════════════════
// What's next (#1513)
// ═══════════════════════════════════════════════════════════════════

export interface ShowcaseTodo {
  showcase_title: string | null;
  state: string | null;
  done: boolean | null;
}

/**
 * Only to-dos marked for display reach the showcase, and only by their plain showcase title —
 * never the raw title or body. A to-do is marked by giving it a showcase_title
 * (PATCH /api/todos/<id> {"showcase_title":"..."}); null clears it. Finished and parked
 * to-dos are not "next". Empty result = the section hides.
 */
export function showcaseRoadmap(todos: readonly ShowcaseTodo[], limit = 6): string[] {
  const out: string[] = [];
  for (const t of todos) {
    const title = t.showcase_title?.trim();
    if (!title) continue;
    if (t.done || t.state === 'done' || t.state === 'parked') continue;
    out.push(title);
    if (out.length >= limit) break;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════
// Security & data line (#1515)
// ═══════════════════════════════════════════════════════════════════

export interface PolicyFacts {
  exposure: string | null;
  access_control: string | null;
  data_sensitivity_tier: string | null;
  encryption_in_transit: boolean | null;
}

export interface AuthFacts {
  strategy: string | null;
  providers: string[] | null;
  mfa_supported: boolean | null;
}

/**
 * exposure=public + access_control=auth-required is the public read-only showcase: anyone can
 * read it, while private pages and every change need a sign-in (and the bearer token, when the
 * project's auth providers list it). Every other combination keeps its literal wording.
 */
export function exposureLine(policy: Pick<PolicyFacts, 'exposure' | 'access_control'>, providers: readonly string[]): string {
  if (policy.exposure === 'public' && policy.access_control === 'auth-required') {
    const gate = providers.includes('bearer-token') ? 'login and the bearer token' : 'login';
    return `Exposure: public read-only showcase — private pages and every change behind ${gate}`;
  }
  return `Exposure: ${policy.exposure} · access ${policy.access_control}`;
}

export function securityLines(auth: AuthFacts | null | undefined, policy: PolicyFacts | null | undefined): string[] {
  const out: string[] = [];
  if (auth) {
    const providers = auth.providers ?? [];
    out.push(auth.strategy === 'none'
      ? 'No auth — single user / network-bound'
      : `Auth: ${auth.strategy}${providers.length ? ` (${providers.join(', ')})` : ''}`);
    if (auth.mfa_supported) out.push('MFA supported');
  }
  if (policy) {
    out.push(exposureLine(policy, auth?.providers ?? []));
    if (policy.data_sensitivity_tier && policy.data_sensitivity_tier !== 'none') out.push(`Data sensitivity: ${policy.data_sensitivity_tier}`);
    if (policy.encryption_in_transit) out.push('Encrypted in transit');
  }
  if (out.length === 0) out.push('Self-hosted · network-bound (no auth config recorded)');
  return out;
}

// ═══════════════════════════════════════════════════════════════════
// The verifier at work (#1516): send-back rate + one sent-back change
// ═══════════════════════════════════════════════════════════════════

export const SEND_BACK_WINDOW = 200;

export interface SendBackRate {
  sent: number;
  of: number;
}

/** Verdicts newest-first; counts ITERATE + BLOCK in the most recent SEND_BACK_WINDOW. */
export function sendBackRate(verdicts: readonly (string | null)[], window = SEND_BACK_WINDOW): SendBackRate | null {
  const recent = verdicts.slice(0, window);
  if (recent.length === 0) return null;
  const sent = recent.filter((v) => v === 'ITERATE' || v === 'BLOCK').length;
  return { sent, of: recent.length };
}

export function sendBackLabel(rate: SendBackRate): string {
  return `sent back ${rate.sent} of the last ${rate.of} change${rate.of === 1 ? '' : 's'}`;
}

export function sendBackPercent(rate: SendBackRate): string {
  const pct = Math.round((rate.sent / rate.of) * 1000) / 10;
  return `${pct}%`;
}

// Projects whose verifier notes can carry personal financial data (masked account numbers,
// payees, amounts). Their changes are never featured, and their raw verifier text never reaches
// the visitor view. Named by the owner at the iter-208 gate; tags/policy catch future ones.
export const FINANCIAL_PROJECTS: ReadonlySet<string> = new Set(['cointrail', 'ingest']);

export function isFinancialProject(
  slug: string,
  tags: readonly string[] | null | undefined,
  sensitivityTier: string | null | undefined,
): boolean {
  if (FINANCIAL_PROJECTS.has(slug)) return true;
  if ((tags ?? []).some((t) => t === 'finance' || t === 'financial')) return true;
  return sensitivityTier === 'financial';
}

// Anything that looks like money or an account: currency amounts, masked account/card numbers,
// long digit runs, digit-grouped amounts, banking keywords and bank names. Conservative on
// purpose — a false positive only means a different example gets featured.
const SENSITIVE_PATTERNS: readonly RegExp[] = [
  /(?:₹|\bRs\.?|\bINR|\bUSD|\$|€|£)\s?\d/i,
  /[xX*•]{2,}[\s-]?\d{3,}/,
  /\d{3,}[xX*•]{3,}/,
  /\b\d{9,}\b/,
  /\b\d{1,3}(?:,\d{2,3})+(?:\.\d+)?\b/,
  /\b(?:payees?|account\s+(?:no|number)s?|acct|a\/c|ifsc|upi\s+id|iban|card\s+number|statement\s+email)\b/i,
  /\b(?:hsbc|hdfc|icici|kotak|axis\s+bank|sbi|amex)\b/i,
];

export function hasSensitiveText(text: string | null | undefined): boolean {
  if (!text) return false;
  return SENSITIVE_PATTERNS.some((rx) => rx.test(text));
}

/** Clip long verifier prose for the story cards: whole sentences up to `max`, else a word cut. */
export function clip(text: string, max = 320): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max);
  const lastStop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('; '));
  if (lastStop >= max * 0.5) return head.slice(0, lastStop + 1).trim();
  const lastSpace = head.lastIndexOf(' ');
  return `${head.slice(0, lastSpace > 0 ? lastSpace : max).trim()}…`;
}

// A send-back reason often opens by crediting what passed ("AC2/AC5/AC6/AC7 verified
// convincingly…") before the catch ("Three ACs FAIL…"); clipping from the start can keep only the
// praise. The catch is the first sentence with a strong failure marker, else the first with a weak
// one (but / not / does not); with neither, the reason is clipped from its start.
const STRONG_CATCH = /\b(?:FAIL(?:S|ED|URE|ING)?|GAP|BUG|PARTIAL|unmet|NOT\s+(?:FIXED|MET|ADVANCED|VERIFIED)|regressions?|leaks?|missing|never)\b/i;
const WEAK_CATCH = /\b(?:but|not|does\s+not|doesn't|cannot|can't)\b/i;

/** Split prose into sentences (on . ! ? followed by whitespace). */
export function sentences(text: string): string[] {
  return text.trim().split(/(?<=[.!?])\s+(?=\S)/).filter((s) => s.length > 0);
}

/**
 * Clip a verifier send-back reason so the card shows the CATCH: start at the first sentence that
 * says what failed, marked with a leading ellipsis when earlier text was skipped.
 */
export function clipToCatch(text: string, max = 320): string {
  const parts = sentences(text);
  let at = parts.findIndex((s) => STRONG_CATCH.test(s));
  if (at < 0) at = parts.findIndex((s) => WEAK_CATCH.test(s));
  if (at <= 0) return clip(text, max);
  return `…${clip(parts.slice(at).join(' '), max)}`;
}

export interface ItemReport {
  targetId: string;
  verdict: string | null;
  reason: string | null;
  ranAt: number; // unix ms
  id: number;
}

export interface SentBackHistory {
  itemId: string;
  sentBack: { verdict: 'ITERATE' | 'BLOCK'; reason: string | null };
  approval: { reason: string | null; at: number };
  rounds: number;
}

/** Items whose verifier history is: sent back (ITERATE/BLOCK) at least once, then APPROVE last. */
export function sentBackHistories(reports: readonly ItemReport[]): SentBackHistory[] {
  const byItem = new Map<string, ItemReport[]>();
  for (const r of reports) {
    const arr = byItem.get(r.targetId) ?? [];
    arr.push(r);
    byItem.set(r.targetId, arr);
  }
  const out: SentBackHistory[] = [];
  for (const [itemId, list] of byItem) {
    const sorted = [...list].sort((a, b) => a.ranAt - b.ranAt || a.id - b.id);
    const last = sorted[sorted.length - 1]!;
    if (last.verdict !== 'APPROVE') continue;
    const first = sorted.find((r) => r.verdict === 'ITERATE' || r.verdict === 'BLOCK');
    if (!first) continue;
    out.push({
      itemId,
      sentBack: { verdict: first.verdict as 'ITERATE' | 'BLOCK', reason: first.reason },
      approval: { reason: last.reason, at: last.ranAt },
      rounds: sorted.length,
    });
  }
  return out;
}

// "then fix, then APPROVE": the approval has to say a fix landed or was re-checked. A send-back
// that was closed as not-applicable is not a fix story.
export function approvalShowsFix(reason: string | null | undefined): boolean {
  if (!reason) return false;
  if (/not[\s-]applicable/i.test(reason)) return false;
  return /\bfix(?:ed|es)?\b|re-?verif|\bround\s*[2-9]|\bpass[\s-]?[2-9]|\brepaired\b/i.test(reason);
}

export interface ShipStory {
  kind: 'sent-back' | 'approved';
  iter: number;
  title: string;
  request: string | null;
  change: string | null;
  projectName: string;
  crossProject: boolean;
  sentBack: { verdict: string; reason: string | null } | null;
  verdict: string;
  reason: string | null;
  rounds: number;
}

export interface SentBackCandidate {
  itemId: number;
  iter: number;
  title: string;
  request: string | null;
  change: string | null;
  projectSlug: string;
  projectName: string;
  history: SentBackHistory;
}

/**
 * The featured sent-back change: never from a financial project, nothing that reads like money
 * or an account, and the approval must show the fix. This project's own change first, then the
 * most recent approval anywhere (newest item breaks a tie).
 */
export function pickSentBackStory(
  candidates: readonly SentBackCandidate[],
  opts: { pageSlug: string; financial: ReadonlySet<string> },
): ShipStory | null {
  const ok = candidates.filter((c) =>
    !opts.financial.has(c.projectSlug)
    && approvalShowsFix(c.history.approval.reason)
    && ![c.title, c.request, c.change, c.history.sentBack.reason, c.history.approval.reason].some(hasSensitiveText));
  if (ok.length === 0) return null;
  const best = [...ok].sort((a, b) => {
    const own = Number(b.projectSlug === opts.pageSlug) - Number(a.projectSlug === opts.pageSlug);
    if (own !== 0) return own;
    return b.history.approval.at - a.history.approval.at || b.itemId - a.itemId;
  })[0]!;
  return {
    kind: 'sent-back',
    iter: best.iter,
    title: best.title,
    request: best.request,
    change: best.change,
    projectName: best.projectName,
    crossProject: best.projectSlug !== opts.pageSlug,
    sentBack: { verdict: best.history.sentBack.verdict, reason: best.history.sentBack.reason },
    verdict: 'APPROVE',
    reason: best.history.approval.reason,
    rounds: best.history.rounds,
  };
}

export interface TraceRow {
  iter: number;
  title: string;
  request: string | null;
  change: string | null;
  verdict: string | null;
  reason: string | null;
}

/** Today's example (pre-iter-208 behaviour): the fullest APPROVE among this project's recent changes. */
export function pickTodayExample(trace: readonly TraceRow[]): TraceRow | null {
  return trace.find((t) => t.verdict === 'APPROVE' && t.request && t.change && t.reason)
    ?? trace.find((t) => t.verdict === 'APPROVE' && t.request && t.reason)
    ?? trace.find((t) => t.verdict === 'APPROVE')
    ?? trace[0]
    ?? null;
}

/** null when the row carries no verdict — a story is only told with the verifier's actual ruling. */
export function approvedStory(row: TraceRow, projectName: string): ShipStory | null {
  if (!row.verdict) return null;
  return {
    kind: 'approved',
    iter: row.iter,
    title: row.title,
    request: row.request,
    change: row.change,
    projectName,
    crossProject: false,
    sentBack: null,
    verdict: row.verdict,
    reason: row.reason,
    rounds: 1,
  };
}

/**
 * Story text as the cards show it: every prose field clipped to whole sentences. The send-back
 * reason is clipped around its catch (clipToCatch), so the "sent it back" step says what failed.
 */
export function clipStory(story: ShipStory, max = 320): ShipStory {
  const c = (s: string | null) => (s ? clip(s, max) : s);
  return {
    ...story,
    request: c(story.request),
    change: c(story.change),
    reason: c(story.reason),
    sentBack: story.sentBack
      ? { ...story.sentBack, reason: story.sentBack.reason ? clipToCatch(story.sentBack.reason, max) : story.sentBack.reason }
      : null,
  };
}

/**
 * Visitor view of a story (#1509): a financial project's story keeps only its title and verdict;
 * any other field that reads like money or an account is dropped. A title that itself reads
 * like money or an account drops the whole story (the section then shows only the rate tile).
 */
export function scrubStoryForVisitor(story: ShipStory, financial: boolean): ShipStory | null {
  if (hasSensitiveText(story.title)) return null;
  const keep = (s: string | null) => (financial || hasSensitiveText(s) ? null : s);
  return {
    ...story,
    request: keep(story.request),
    change: keep(story.change),
    reason: keep(story.reason),
    sentBack: story.sentBack ? { ...story.sentBack, reason: keep(story.sentBack.reason) } : null,
  };
}
