// tests/showcase.test.ts — the iter-208 showcase display rules (lib/showcase.ts).
// One describe per locked item: 1510 repo links, 1511 live links, 1512 activity labels,
// 1513 "What's next", 1514 grid filter, 1515 security line, 1516 send-back rate + story,
// 1509 visitor scrubbing.
import { describe, expect, it } from 'vitest';
import {
  activityLabel,
  activityNote,
  approvalEndsResolved,
  approvalExcerpt,
  approvalShowsFix,
  approvedStory,
  clip,
  clipStory,
  clipToCatch,
  sentences,
  exposureLine,
  gridRows,
  hasSensitiveText,
  isFinancialProject,
  isPublicRepoUrl,
  liveLink,
  liveStatus,
  pickSentBackStory,
  pickTodayExample,
  readsAsFailure,
  repoLink,
  riskCards,
  scrubStoryForVisitor,
  securityLines,
  sendBackLabel,
  sendBackPercent,
  sendBackRate,
  sentBackHistories,
  showcaseRoadmap,
  type ItemReport,
  type SentBackCandidate,
  type ShipStory,
  type TraceRow,
} from '../lib/showcase';

// ── #1510 ──
describe('repo links (#1510)', () => {
  it('a public GitHub URL renders as a link', () => {
    expect(repoLink('https://github.com/pdsvardhan/mapsofbharat')).toEqual({
      kind: 'link', href: 'https://github.com/pdsvardhan/mapsofbharat', text: 'github.com/pdsvardhan/mapsofbharat',
    });
    expect(isPublicRepoUrl('https://www.github.com/pdsvardhan/stateofus')).toBe(true);
  });
  it('Gitea and localhost URLs render as a private-repo label', () => {
    expect(repoLink('http://git.vault7a.xyz/pdsv/windfall-labs')).toEqual({ kind: 'private' });
    expect(repoLink('https://git.vault7a.xyz/pdsv/ottomate-tracker-v3')).toEqual({ kind: 'private' });
    expect(repoLink('http://localhost:3300/pdsv/city-wars')).toEqual({ kind: 'private' });
  });
  it('anything that is not https://github.com/<path> is private', () => {
    expect(isPublicRepoUrl('http://github.com/pdsvardhan/x')).toBe(false);
    expect(isPublicRepoUrl('https://github.com/')).toBe(false);
    expect(isPublicRepoUrl('https://github.com.evil.example/x')).toBe(false);
    expect(isPublicRepoUrl('not a url')).toBe(false);
  });
  it('no repo URL renders nothing', () => {
    expect(repoLink(null)).toBeNull();
    expect(repoLink('   ')).toBeNull();
  });
});

// ── #1511 ──
describe('live links (#1511)', () => {
  it('live:public renders a link (scheme added when missing)', () => {
    expect(liveLink('https://mapsofbharat.vault7a.xyz', ['data-viz', 'live:public'])).toEqual({
      kind: 'link', href: 'https://mapsofbharat.vault7a.xyz', text: 'mapsofbharat.vault7a.xyz',
    });
    expect(liveLink('vardhan.vault7a.xyz', ['live:public'])).toMatchObject({ kind: 'link', href: 'https://vardhan.vault7a.xyz' });
  });
  it('live:private renders a private-app label, never a link', () => {
    expect(liveLink('https://leaploop.vault7a.xyz', ['personal', 'live:private'])).toEqual({ kind: 'private' });
  });
  it('live:none (host does not resolve) and an untagged project render nothing', () => {
    expect(liveLink('https://fan-wars.vault7a.xyz', ['cv', 'live:none'])).toBeNull();
    expect(liveLink('https://screenroom.vault7a.xyz', ['media'])).toBeNull();
    expect(liveLink('https://x.vault7a.xyz', null)).toBeNull();
  });
  it('no live URL renders nothing whatever the tag', () => {
    expect(liveLink(null, ['live:public'])).toBeNull();
    expect(liveLink(null, ['live:private'])).toBeNull();
  });
  it('conflicting tags resolve to the most restrictive', () => {
    expect(liveStatus(['live:public', 'live:private'])).toBe('private');
    expect(liveStatus(['live:public', 'live:none'])).toBe('none');
    expect(liveStatus([])).toBe('none');
  });
});

// ── #1512 ──
// Every event_type seen in the live skill_events log (2026-11-04, last 1000 rows).
const OBSERVED_TYPES = [
  'session-packed-up', 'stage-4-complete', 'lock-in-gate', 'verifier-dispatched', 'verifier-result',
  'stage-4-start', 'deployed', 'session-note', 'deep-dive-reconciliation', 'deploy', 'component-pick-gate',
  'bug-fixed', 'stage-4-iteration-packup', 'doc-reconcile', 'misc', 'pack_up', 'stage_3_phase_2_progress',
  'placeholders-approved', 'bug-found', 'feature-claim-backfill-reconcile', 'iteration-checkpoint',
  'stage-3-start', 'pack-up', 'stage_3_complete', 'stage-4-staging', 'incident', 'stage-4-build-start',
  'iteration-169-triage-corrected', 'verifier-round-2', 'tripwire-delta-explained', 'component-pick-skipped',
  'iteration-built', 'design-round-published', 'correction', 'hardening', 'reskin-shipped', 'bugfix-shipped',
  'project-renamed', 'stage-4-build-complete', 'stage-4-observation', 'item-deferred', 'session-interrupted',
  'incident-recovered', 'trace-report-correction', 'data-refresh', 'live-signals-fix-and-paper-start',
  'stage3-complete', 'stage-3-scaffold-complete', 'iter3_sourcing_session_pause', 'phase_4_deploy_progress',
  'stage_3_phase_1_complete', 'stage_1_handoff', 'stage_1_7_risks_locked', 'stage_1_6_data_overview_locked',
  'stage_1_5_components_seeded', 'stage_1_4_links_backfilled', 'stage_1_2_planned_batch1_locked',
  'stage_1_1_lock', 'stage_1_consume',
];

describe('activity labels (#1512)', () => {
  it('maps the owner-named events to plain words', () => {
    expect(activityLabel('verifier-result')).toBe('change verified');
    expect(activityLabel('stage-4-complete')).toBe('iteration shipped');
    expect(activityLabel('lock-in-gate')).toBe('changes locked in');
    expect(activityLabel('session-packed-up')).toBe('session wrapped up');
    expect(activityLabel('stage_1_7_risks_locked')).toBe('spec work');
    expect(activityLabel('iteration-169-triage-corrected')).toBe('iteration progress');
  });
  it('every observed event type gets a label with no digits, underscores or hashes', () => {
    for (const t of OBSERVED_TYPES) {
      const label = activityLabel(t);
      expect(label, t).toMatch(/^[a-z][a-z -]*[a-z]$/);
      expect(label, t).not.toMatch(/\d|_|#/);
    }
  });
  it('an unknown or empty type falls back to a generic label', () => {
    expect(activityLabel('something-new-0xdeadbeef')).toBe('project update');
    expect(activityLabel('')).toBe('project update');
    expect(activityLabel(null)).toBe('project update');
  });
  it('the visitor view never shows the notes; the owner view keeps them', () => {
    const notes = 'Next: owner queue 1474-1480 + HSBC alerts; commit 56fb54c';
    expect(activityNote('stage-4-complete', notes, false)).toBe('iteration shipped');
    expect(activityNote('stage-4-complete', notes, true)).toBe(notes);
    expect(activityNote('stage-4-complete', null, true)).toBe('iteration shipped');
    expect(activityNote('stage-4-complete', '   ', true)).toBe('iteration shipped');
  });
});

// ── #1514 ──
describe('projects grid (#1514)', () => {
  const rows = [
    { slug: 'ottomate', done: 18 },
    { slug: 'city-wars', done: 0 },
    { slug: 'mapsofbharat', done: 17 },
    { slug: 'fan-wars', done: 0 },
  ];
  it('the visitor view leaves out projects with zero built features, order kept', () => {
    expect(gridRows(rows, false).map((r) => r.slug)).toEqual(['ottomate', 'mapsofbharat']);
  });
  it('the owner view lists every project', () => {
    expect(gridRows(rows, true).map((r) => r.slug)).toEqual(['ottomate', 'city-wars', 'mapsofbharat', 'fan-wars']);
  });
});

// ── #1513 ──
describe("What's next (#1513)", () => {
  it('only to-dos marked for display, by their plain showcase title', () => {
    const out = showcaseRoadmap([
      { showcase_title: null, state: 'open', done: false },
      { showcase_title: '  Mobile layout for the map  ', state: 'ready', done: false },
      { showcase_title: 'Offline mode', state: 'open', done: false },
    ]);
    expect(out).toEqual(['Mobile layout for the map', 'Offline mode']);
  });
  it('none marked -> empty (the section hides)', () => {
    expect(showcaseRoadmap([{ showcase_title: null, state: 'open', done: false }, { showcase_title: '  ', state: 'open', done: false }])).toEqual([]);
  });
  it('finished and parked to-dos are not "next"', () => {
    expect(showcaseRoadmap([
      { showcase_title: 'Done thing', state: 'done', done: true },
      { showcase_title: 'Parked thing', state: 'parked', done: false },
      { showcase_title: 'Live', state: 'in-progress', done: false },
    ])).toEqual(['Live']);
  });
  it('caps at the limit', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ showcase_title: `T${i}`, state: 'open', done: false }));
    expect(showcaseRoadmap(many)).toHaveLength(6);
    expect(showcaseRoadmap(many, 2)).toEqual(['T0', 'T1']);
  });
});

// ── #1515 ──
describe('security & data line (#1515)', () => {
  const ottomateAuth = { strategy: 'custom', providers: ['bearer-token'], mfa_supported: false };
  it("Ottomate's public read-only posture reads as such", () => {
    const lines = securityLines(ottomateAuth, {
      exposure: 'public', access_control: 'auth-required', data_sensitivity_tier: 'none', encryption_in_transit: true,
    });
    expect(lines[0]).toBe('Auth: custom (bearer-token)');
    expect(lines[1]).toBe('Exposure: public read-only showcase — private pages and every change behind login and the bearer token');
    expect(lines.slice(0, 2).join(' · ')).not.toContain('intranet-only');
  });
  it('without a bearer-token provider the gate is login only', () => {
    expect(exposureLine({ exposure: 'public', access_control: 'auth-required' }, ['authentik']))
      .toBe('Exposure: public read-only showcase — private pages and every change behind login');
  });
  it('every other combination keeps its literal wording', () => {
    expect(exposureLine({ exposure: 'intranet-only', access_control: 'auth-required' }, ['bearer-token']))
      .toBe('Exposure: intranet-only · access auth-required');
    expect(exposureLine({ exposure: 'public', access_control: 'roles-defined' }, []))
      .toBe('Exposure: public · access roles-defined');
    expect(exposureLine({ exposure: 'invite-only', access_control: 'auth-required' }, []))
      .toBe('Exposure: invite-only · access auth-required');
  });
  it('keeps the existing sensitivity / transit / fallback lines', () => {
    expect(securityLines({ strategy: 'none', providers: null, mfa_supported: false }, {
      exposure: 'intranet-only', access_control: 'anonymous-ok', data_sensitivity_tier: 'financial', encryption_in_transit: false,
    })).toEqual(['No auth — single user / network-bound', 'Exposure: intranet-only · access anonymous-ok', 'Data sensitivity: financial']);
    expect(securityLines(null, null)).toEqual(['Self-hosted · network-bound (no auth config recorded)']);
  });
});

// ── #1516 send-back rate ──
describe('send-back rate (#1516)', () => {
  const window200 = [
    ...Array<string>(18).fill('ITERATE'), 'BLOCK', ...Array<string>(181).fill('APPROVE'),
  ];
  it('a window of 18 ITERATE + 1 BLOCK of 200 -> sent back 19 of the last 200', () => {
    const rate = sendBackRate(window200)!;
    expect(rate).toEqual({ sent: 19, of: 200 });
    expect(sendBackLabel(rate)).toBe('sent back 19 of the last 200 changes');
    expect(sendBackPercent(rate)).toBe('9.5%');
  });
  it('only the most recent window counts (input is newest-first)', () => {
    const rate = sendBackRate([...window200, ...Array<string>(50).fill('ITERATE')])!;
    expect(rate).toEqual({ sent: 19, of: 200 });
  });
  it('fewer reports than the window -> counts what exists; none -> null', () => {
    expect(sendBackRate(['APPROVE', 'ITERATE', null])).toEqual({ sent: 1, of: 3 });
    expect(sendBackLabel({ sent: 0, of: 1 })).toBe('sent back 0 of the last 1 change');
    expect(sendBackRate([])).toBeNull();
  });
});

// ── #1516 / #1509 financial + sensitive ──
describe('financial projects and sensitive text (#1516, #1509)', () => {
  it('Cointrail and Ingest are always financial; finance tags and the financial tier count', () => {
    expect(isFinancialProject('cointrail', null, null)).toBe(true);
    expect(isFinancialProject('ingest', [], undefined)).toBe(true);
    expect(isFinancialProject('windfall-labs', ['quant', 'finance'], 'financial')).toBe(true);
    expect(isFinancialProject('some-app', [], 'financial')).toBe(true);
  });
  it('non-financial projects are not', () => {
    expect(isFinancialProject('city-wars', ['personal'], 'personal-pii')).toBe(false);
    expect(isFinancialProject('mapsofbharat', ['data-viz'], 'none')).toBe(false);
    expect(isFinancialProject('ottomate', ['meta'], null)).toBe(false);
  });
  it('flags money, accounts, payees and bank names', () => {
    for (const s of [
      'statement for card XX1234 missing', 'acct ****5678', '1234XXXX', '₹1,200 debit', 'Rs. 500 refund', 'INR 4500',
      '$12 charge', 'payee name mismatch', 'account number masked', 'HSBC alerts', 'ICICI 4321 Amex', 'ref 123456789012',
      '20,160 fetches', 'IFSC code',
    ]) expect(hasSensitiveText(s), s).toBe(true);
  });
  it('ordinary engineering prose passes', () => {
    for (const s of [
      'Re-verified after fix (commit 56fb54c).', '57/57 tests pass', 'AC 651-653 describe', 'at 375x812 and 414x896',
      'lib/hooks/useGame.ts:44-53 hardcodes rank:null', 'scrollHeight 800', null, '',
    ]) expect(hasSensitiveText(s), String(s)).toBe(false);
  });
});

// ── #1516 sent-back history + story ──
const rep = (targetId: string, verdict: string, ranAt: number, reason = `${verdict} reason`, id = ranAt): ItemReport =>
  ({ targetId, verdict, reason, ranAt, id });

describe('sent-back histories (#1516)', () => {
  it('finds sent back -> approved, using the FIRST send-back and the LAST approval', () => {
    const out = sentBackHistories([
      rep('756', 'APPROVE', 50, 'Pass 5. fixed for real'),
      rep('756', 'ITERATE', 10, 'first catch'),
      rep('756', 'ITERATE', 20, 'second catch'),
    ]);
    expect(out).toEqual([{
      itemId: '756',
      sentBack: { verdict: 'ITERATE', reason: 'first catch' },
      approval: { reason: 'Pass 5. fixed for real', at: 50 },
      rounds: 3,
    }]);
  });
  it('a BLOCK counts as a send-back', () => {
    expect(sentBackHistories([rep('1146', 'BLOCK', 1), rep('1146', 'APPROVE', 2)])[0]!.sentBack.verdict).toBe('BLOCK');
  });
  it('approve-only items and items still sent back are not stories', () => {
    expect(sentBackHistories([rep('1', 'APPROVE', 1)])).toEqual([]);
    expect(sentBackHistories([rep('2', 'ITERATE', 1), rep('2', 'APPROVE', 2), rep('2', 'ITERATE', 3)])).toEqual([]);
  });
  it('the approval has to show the fix', () => {
    expect(approvalShowsFix('Re-verified after fix (commit 56fb54c).')).toBe(true);
    expect(approvalShowsFix('Pass 5. 544f7a8 removes a defect')).toBe(true);
    expect(approvalShowsFix('Round 2: rights double count handled')).toBe(true);
    expect(approvalShowsFix('CLOSED AS NOT-APPLICABLE on the owner ruling; nothing fixed')).toBe(false);
    expect(approvalShowsFix('Filter row. nowrap verified')).toBe(false);
    expect(approvalShowsFix(null)).toBe(false);
  });
});

const cand = (over: Partial<SentBackCandidate> & { itemId: number; projectSlug: string; at: number }): SentBackCandidate => ({
  iter: 2,
  title: `Item ${over.itemId}`,
  request: 'The ask in plain words.',
  change: 'The change that was locked.',
  projectName: over.projectSlug,
  history: {
    itemId: String(over.itemId),
    sentBack: { verdict: 'ITERATE', reason: 'Caught a real bug.' },
    approval: { reason: 'Re-verified after the fix.', at: over.at },
    rounds: 2,
  },
  ...over,
});

describe('the featured sent-back change (#1516)', () => {
  const financial = new Set(['cointrail', 'ingest', 'windfall-labs']);
  it('never comes from a financial project, however recent', () => {
    const story = pickSentBackStory([
      cand({ itemId: 1480, projectSlug: 'cointrail', at: 900 }),
      cand({ itemId: 1149, projectSlug: 'city-wars', projectName: 'City Wars', at: 500 }),
    ], { pageSlug: 'ottomate', financial })!;
    expect(story.title).toBe('Item 1149');
    expect(story.kind).toBe('sent-back');
    expect(story.crossProject).toBe(true);
    expect(story.projectName).toBe('City Wars');
    expect(story.sentBack).toEqual({ verdict: 'ITERATE', reason: 'Caught a real bug.' });
    expect(story.verdict).toBe('APPROVE');
  });
  it('skips a candidate whose text reads like money or an account', () => {
    const story = pickSentBackStory([
      cand({ itemId: 2, projectSlug: 'screenroom', at: 900, request: 'Payee XX1234 shown twice' }),
      cand({ itemId: 1, projectSlug: 'mapsofbharat', at: 100 }),
    ], { pageSlug: 'ottomate', financial })!;
    expect(story.title).toBe('Item 1');
  });
  it("prefers this project's own change over a newer one elsewhere", () => {
    const story = pickSentBackStory([
      cand({ itemId: 9, projectSlug: 'city-wars', at: 900 }),
      cand({ itemId: 3, projectSlug: 'screenroom', at: 100 }),
    ], { pageSlug: 'screenroom', financial })!;
    expect(story.title).toBe('Item 3');
    expect(story.crossProject).toBe(false);
  });
  it('newest approval wins, then the newest item', () => {
    const story = pickSentBackStory([
      cand({ itemId: 1147, projectSlug: 'city-wars', at: 500 }),
      cand({ itemId: 1149, projectSlug: 'city-wars', at: 500 }),
      cand({ itemId: 1135, projectSlug: 'city-wars', at: 400 }),
    ], { pageSlug: 'portfolio', financial })!;
    expect(story.title).toBe('Item 1149');
  });
  it('no qualifying change -> null (the page falls back to today\'s example)', () => {
    expect(pickSentBackStory([cand({ itemId: 1, projectSlug: 'cointrail', at: 1 })], { pageSlug: 'cointrail', financial })).toBeNull();
    expect(pickSentBackStory([], { pageSlug: 'x', financial })).toBeNull();
  });
});

describe("today's example fallback (#1516)", () => {
  const row = (over: Partial<TraceRow>): TraceRow => ({ iter: 1, title: 't', request: null, change: null, verdict: 'APPROVE', reason: null, ...over });
  it('keeps the pre-iter-208 choice: the fullest APPROVE first', () => {
    const full = row({ title: 'full', request: 'r', change: 'c', reason: 'why' });
    expect(pickTodayExample([row({ title: 'bare' }), full])).toBe(full);
    expect(pickTodayExample([row({ verdict: 'ITERATE', title: 'it' })])!.title).toBe('it');
    expect(pickTodayExample([])).toBeNull();
  });
  it('a story is only told with a real verdict', () => {
    expect(approvedStory(row({ verdict: null }), 'P')).toBeNull();
    expect(approvedStory(row({ title: 'x' }), 'P')).toMatchObject({ kind: 'approved', sentBack: null, crossProject: false, verdict: 'APPROVE' });
  });
});

// ── #1509 visitor scrubbing ──
describe('visitor view of a story (#1509)', () => {
  const base: ShipStory = {
    kind: 'approved', iter: 4, title: 'Statement import', request: 'Import the PDF', change: 'Parse it',
    projectName: 'Cointrail', crossProject: false, sentBack: null, verdict: 'APPROVE', reason: 'Matched 12 rows', rounds: 1,
  };
  it("a financial project's example keeps only title + verdict", () => {
    expect(scrubStoryForVisitor(base, true)).toMatchObject({ title: 'Statement import', verdict: 'APPROVE', request: null, change: null, reason: null });
  });
  it('a non-financial story keeps clean text and drops only sensitive fields', () => {
    const s = scrubStoryForVisitor({ ...base, reason: 'payee XX1234 matched', sentBack: { verdict: 'ITERATE', reason: 'Missed a case' } }, false)!;
    expect(s.request).toBe('Import the PDF');
    expect(s.reason).toBeNull();
    expect(s.sentBack).toEqual({ verdict: 'ITERATE', reason: 'Missed a case' });
  });
  it('a title that reads like an account drops the whole story', () => {
    expect(scrubStoryForVisitor({ ...base, title: 'HSBC 4321 statements missing' }, true)).toBeNull();
  });
});

describe('clip (#1516 story cards)', () => {
  it('short text is unchanged', () => {
    expect(clip('Short and sweet.')).toBe('Short and sweet.');
  });
  it('long text is cut at a sentence end when one is late enough', () => {
    const s = `${'A'.repeat(200)}. ${'B'.repeat(200)}.`;
    expect(clip(s, 320)).toBe(`${'A'.repeat(200)}.`);
  });
  it('otherwise at a word, with an ellipsis', () => {
    const s = Array.from({ length: 80 }, () => 'word').join(' ');
    const out = clip(s, 50);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(51);
  });
  it('clipStory clips every prose field and keeps nulls', () => {
    const long = `${'x '.repeat(300)}`;
    const s = clipStory({
      kind: 'sent-back', iter: 1, title: 't', request: long, change: null, projectName: 'P', crossProject: false,
      sentBack: { verdict: 'ITERATE', reason: long }, verdict: 'APPROVE', reason: 'ok', rounds: 2,
    });
    expect(s.request!.length).toBeLessThanOrEqual(321);
    expect(s.sentBack!.reason!.length).toBeLessThanOrEqual(321);
    expect(s.change).toBeNull();
    expect(s.reason).toBe('ok');
  });
});

// ── #1516 auto-fix round 1: the "sent it back" step must show the catch, not the praise ──
// Shape of MapsOfBharat item 756's first ITERATE reason: praise first, the failure second.
const ITEM_756_SENT_BACK =
  'AC2/AC5/AC6/AC7 verified convincingly, including independently re-derived occupancy on 3 metrics, a full ' +
  '124-metric sweep confirming the guard fires on exactly 6 and improves every one, and a demonstrated fixed ' +
  'point (7 replaceState calls, stable). Three ACs FAIL on paths a normal user hits, and two are the SAME ' +
  'cross-metric leak this item exists to remove, relocated rather than removed. AC1: the data-fetch effect ' +
  "never clears `data` on metric change, so the guard judges the incoming metric's default against the " +
  'previous metric\'s data.';

describe('send-back reason clipped around the catch (#1516)', () => {
  it("item 756: starts at 'Three ACs FAIL', drops the praise preamble", () => {
    const out = clipToCatch(ITEM_756_SENT_BACK);
    expect(out.startsWith('…Three ACs FAIL on paths a normal user hits')).toBe(true);
    expect(out).not.toContain('verified convincingly');
    expect(out.length).toBeLessThanOrEqual(321);
    // the old start-anchored clip kept only the praise
    expect(clip(ITEM_756_SENT_BACK)).toContain('verified convincingly');
    expect(clip(ITEM_756_SENT_BACK)).not.toContain('FAIL');
  });
  it('a catch in the first sentence keeps the reason from its start, no ellipsis', () => {
    const r = 'NOT FIXED. The caption text was removed but the answer still reaches the client pre-guess.';
    expect(clipToCatch(r)).toBe(r);
  });
  it('strong markers win over an earlier weak one', () => {
    const r = 'Works, but slowly on cold start. Rank is computed on first submit. GAP: a returning player never sees it.';
    expect(clipToCatch(r)).toBe('…GAP: a returning player never sees it.');
  });
  it('with only a weak marker, starts at that sentence', () => {
    const r = 'Layout measured at 390 and 1440. The sheet does not open at mobile width.';
    expect(clipToCatch(r)).toBe('…The sheet does not open at mobile width.');
  });
  it('no catch clause at all -> clipped from the start like any other text', () => {
    const r = 'Measured 44px rows. Ordering verified on both facets.';
    expect(clipToCatch(r)).toBe(r);
  });
  it('clipStory applies it to the send-back step only', () => {
    const s = clipStory({
      kind: 'sent-back', iter: 26, title: 'Sticky break-method pref', request: 'r', change: 'c', projectName: 'MapsOfBharat',
      crossProject: false, sentBack: { verdict: 'ITERATE', reason: ITEM_756_SENT_BACK }, verdict: 'APPROVE',
      reason: 'Pass 5. The fix removes the defect. It never relocates it.', rounds: 5,
    });
    expect(s.sentBack!.reason!.startsWith('…Three ACs FAIL')).toBe(true);
    expect(s.reason).toBe('Pass 5. The fix removes the defect. It never relocates it.');
  });
  it('sentences splits on terminal punctuation', () => {
    expect(sentences('One. Two! Three? Four')).toEqual(['One.', 'Two!', 'Three?', 'Four']);
  });
});

// ── #1516 auto-fix round 3: the approval step ends on the resolution ──
// Verification report 995 (Screenroom item 1182, APPROVE), verbatim.
const REPORT_995 =
  'Album detail. The .dacts/.alhead .acts selector was dead and is fixed -- verifier confirmed 2 hits on the album ' +
  'page, flex-direction column at 390 and row at 1440. AND the track-list contrast fix that shipped here was ' +
  'SILENTLY DELETED by commit 85f1c99, which replaced the tail of globals.css by index; the verifier caught it at ' +
  '3.483:1 live. Restored in f4a7c56, measured 7.01:1 with a 2px poster-colour rail, and the suite now asserts it.';

describe('approval step keeps the resolution (#1516, report 995)', () => {
  it('report 995: the old clip ended on the failure clause "…by index;"', () => {
    expect(REPORT_995.length).toBe(440);
    expect(clip(REPORT_995)).toMatch(/by index;$/);
  });
  it('report 995: the excerpt keeps "Restored in f4a7c56 … the suite now asserts it."', () => {
    const out = approvalExcerpt(REPORT_995);
    expect(out).toContain('Restored in f4a7c56, measured 7.01:1');
    expect(out.endsWith('and the suite now asserts it.')).toBe(true);
    expect(approvalEndsResolved(out)).toBe(true);
  });
  it('clipStory applies it to the approval step of a story built from report 995', () => {
    const s = clipStory({
      kind: 'sent-back', iter: 36, title: 'Mobile layout: Album detail (track list)', request: 'r', change: null,
      projectName: 'Screenroom', crossProject: false, sentBack: { verdict: 'ITERATE', reason: 'NOT ADVANCED. .dhero is null.' },
      verdict: 'APPROVE', reason: REPORT_995, rounds: 2,
    });
    expect(s.reason!.endsWith('the suite now asserts it.')).toBe(true);
    expect(s.reason).not.toMatch(/;\s*$/);
  });
  it('too long for the whole text: ends on the last resolution sentence that fits, never on the failure', () => {
    const longer = `${REPORT_995} A later regression was caught and reverted by commit 0a1b2c3 before the deploy went out.`;
    expect(longer.length).toBeGreaterThan(480);
    const out = approvalExcerpt(longer);
    expect(approvalEndsResolved(out)).toBe(true);
    expect(out).not.toContain('SILENTLY DELETED');
    expect(out.endsWith('row at 1440.')).toBe(true);
  });
  it('a short approval that ends on a failure is trimmed back to the resolution', () => {
    expect(approvalExcerpt('Re-verified after fix. The old layout was silently deleted by commit abc1234.'))
      .toBe('Re-verified after fix.');
  });
  it('praise words do not count as failures; a sentence that also resolves is a resolution', () => {
    expect(readsAsFailure('the verifier caught it at 3.483:1 live.')).toBe(true);
    expect(readsAsFailure('A first verifier returned ITERATE because the page set it only in finish().')).toBe(true);
    expect(readsAsFailure('It never relocates it.')).toBe(false);
    expect(readsAsFailure('Re-verified after the Where in India gap was closed.')).toBe(false);
    expect(approvalExcerpt('Pass 5. The fix removes the defect. It never relocates it.'))
      .toBe('Pass 5. The fix removes the defect. It never relocates it.');
  });
  it('a candidate whose approval can only end on a failure is not featured', () => {
    const financial = new Set<string>();
    const bad = cand({ itemId: 9, projectSlug: 'screenroom', at: 900 });
    bad.history = { ...bad.history, approval: { reason: 'Round 2: still broken; the fix was deleted.', at: 900 } };
    const good = cand({ itemId: 1, projectSlug: 'mapsofbharat', at: 100 });
    const story = pickSentBackStory([bad, good], { pageSlug: 'ottomate', financial })!;
    expect(story.title).toBe('Item 1');
    expect(pickSentBackStory([bad], { pageSlug: 'ottomate', financial })).toBeNull();
  });
});

// ── AC937 (auto-fix round 3): risks show title, category and status only to visitors ──
describe('risk cards on the Decisions tab (AC937)', () => {
  const NOTE = 'SUPERSEDED 2026-08-27 (to-do #662): the owner REVERSED the July ruling; see branch fix/role-path and lib/request-path.ts';
  const rows = [
    { id: 1, name: 'Role-aware request path', category: 'security', severity: 'high', status: 'resolved', hasResolution: true },
    { id: 2, name: 'Unbounded upload size', category: 'reliability', severity: null, status: 'open', hasResolution: false },
    { id: 3, name: 'Stale cache', category: 'performance', severity: 'low', status: 'resolved', hasResolution: false },
    { id: 4, name: null, category: null, severity: 'medium', status: 'accepted', hasResolution: false },
  ];
  const resolutions = new Map<number, string | null>([[1, NOTE]]);

  it('visitor view (no resolutions read): title, category and status only', () => {
    const v = riskCards(rows, null);
    expect(v.resolved).toEqual([{ problem: 'Role-aware request path', category: 'security', status: 'resolved', solved: null }]);
    expect(v.open).toEqual([
      { name: 'Unbounded upload size', category: 'reliability', severity: 'medium', status: 'open' },
      { name: 'Risk', category: '', severity: 'medium', status: 'accepted' },
    ]);
    expect(JSON.stringify(v)).not.toMatch(/#662|REVERSED|request-path\.ts|fix\/role-path/);
  });
  it('owner view keeps the resolution text', () => {
    const o = riskCards(rows, resolutions);
    expect(o.resolved).toEqual([{ problem: 'Role-aware request path', category: 'security', status: 'resolved', solved: NOTE }]);
  });
  it('the same risks are listed in both views (a resolved risk needs a recorded resolution)', () => {
    expect(riskCards(rows, null).resolved.map((r) => r.problem)).toEqual(riskCards(rows, resolutions).resolved.map((r) => r.problem));
  });
});
