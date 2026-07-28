// N2 — the design index status board summariser. run: npx vitest --run tests/design.test.ts
import { describe, it, expect } from 'vitest';
import {
  summariseTarget, summariseTargets, statusByLeaf, rollUpPage, groupByFlow, slugify,
  type DecisionRowLike, type ComponentLike,
} from '@/lib/design';

const row = (o: Partial<DecisionRowLike> = {}): DecisionRowLike => ({
  target_id: 't', target_kind: 'component', status: 'proposed', round: 1, updated_at: 1000, preview_url: null, ...o,
});

describe('summariseTarget', () => {
  it('a fully-locked target reads final', () => {
    expect(summariseTarget('t', [row({ status: 'locked' }), row({ status: 'locked' })]).status).toBe('final');
  });

  it('one proposed row makes it in progress', () => {
    expect(summariseTarget('t', [row({ status: 'locked' }), row({ status: 'proposed' })]).status).toBe('in-progress');
  });

  it('MUST NOT report a superseded-only target as in progress — it is not-started', () => {
    const s = summariseTarget('t', [row({ status: 'superseded' }), row({ status: 'superseded' })]);
    expect(s.status).toBe('not-started');
    expect(s.total).toBe(0);
    expect(s.supersededCount).toBe(2);
  });

  it('counts open axes as non-locked non-superseded rows and picks the latest round', () => {
    const s = summariseTarget('t', [
      row({ status: 'locked', round: 1 }),
      row({ status: 'proposed', round: 2, preview_url: '/r2' }),
      row({ status: 'superseded', round: 1 }),
    ]);
    expect(s.openAxes).toBe(1);
    expect(s.lockedAxes).toBe(1);
    expect(s.latestRound).toBe(2);
    expect(s.previewUrl).toBe('/r2');
    expect(s.rounds).toEqual([1, 2]);
  });
});

describe('summariseTargets', () => {
  it('splits Pages vs Components and rolls up by status', () => {
    const board = summariseTargets([
      row({ target_id: 'music-list', target_kind: 'page', status: 'locked' }),
      row({ target_id: 'poster-card', target_kind: 'component', status: 'proposed' }),
      row({ target_id: 'gone', target_kind: 'component', status: 'superseded' }),
    ]);
    expect(board.pages.map((t) => t.target_id)).toEqual(['music-list']);
    expect(board.components.map((t) => t.target_id).sort()).toEqual(['gone', 'poster-card']);
    expect(board.rollup).toMatchObject({ total: 3, final: 1, inProgress: 1, notStarted: 1 });
  });

  it('sorts in-progress before final', () => {
    const board = summariseTargets([
      row({ target_id: 'done', status: 'locked', updated_at: 5000 }),
      row({ target_id: 'wip', status: 'proposed', updated_at: 1000 }),
    ]);
    expect(board.targets.map((t) => t.target_id)).toEqual(['wip', 'done']);
  });
});

// ── N3: page roll-up from components (Gap 1) + classify by flow (Gap 2) ──
const drow = (o: Partial<DecisionRowLike> = {}): DecisionRowLike => ({
  target_id: 't', target_kind: 'component', status: 'proposed', round: 1, updated_at: 1, preview_url: null, ...o,
});
const comp = (name: string, page_id: string, extra: Partial<ComponentLike> = {}): ComponentLike => ({ name, page_id, ...extra });

describe('rollUpPage (Gap 1 — page finalizes when its components do)', () => {
  const byLeaf = statusByLeaf(summariseTargets([
    drow({ target_id: 'proj.poster-card', status: 'locked' }),
    drow({ target_id: 'proj.watch-card', status: 'locked' }),
    drow({ target_id: 'proj.rating-row', status: 'proposed' }),
  ]));

  it('a page whose every non-skipped component is design-final reads final', () => {
    const r = rollUpPage({ id: 'page-detail' }, [comp('Poster Card', 'page-detail'), comp('Watch Card', 'page-detail')], byLeaf);
    expect(r.status).toBe('final');
    expect(r.componentsDesigned).toBe(2);
    expect(r.componentsTotal).toBe(2);
  });

  it('one in-progress component makes the page in progress', () => {
    const r = rollUpPage({ id: 'page-detail' }, [comp('Poster Card', 'page-detail'), comp('Rating Row', 'page-detail')], byLeaf);
    expect(r.status).toBe('in-progress');
  });

  it('a skipped component does not count against the page', () => {
    const r = rollUpPage({ id: 'page-detail' }, [comp('Poster Card', 'page-detail'), comp('Legacy Thing', 'page-detail', { skip_reason: 'dropped' })], byLeaf);
    expect(r.status).toBe('final');
    expect(r.componentsTotal).toBe(1);
  });

  it('a page with NO structured components falls back to its own target status, never a fake final', () => {
    const own = statusByLeaf(summariseTargets([drow({ target_id: 'proj.page-music', target_kind: 'page', status: 'locked' })]));
    const r = rollUpPage({ id: 'page-music', route: '/music' }, [], own);
    expect(r.source).toBe('own-target');
    expect(r.status).toBe('final');
    const none = rollUpPage({ id: 'page-empty' }, [], own);
    expect(none.status).toBe('not-started');
    expect(none.source).toBe('none');
  });
});

describe('groupByFlow (Gap 2)', () => {
  const rollups = [
    { page_id: 'p1', label: 'One', componentsTotal: 0, componentsDesigned: 0, componentsInProgress: 0, status: 'final' as const, source: 'own-target' as const },
    { page_id: 'p2', label: 'Two', componentsTotal: 0, componentsDesigned: 0, componentsInProgress: 0, status: 'in-progress' as const, source: 'own-target' as const },
    { page_id: 'p3', label: 'Loose', componentsTotal: 0, componentsDesigned: 0, componentsInProgress: 0, status: 'not-started' as const, source: 'none' as const },
  ];
  it('groups pages under their flow and marks a flow in-progress if any page is', () => {
    const g = groupByFlow(
      [{ id: 'flow-a', name: 'Request a movie' }],
      [{ flow_id: 'flow-a', page_id: 'p1' }, { flow_id: 'flow-a', page_id: 'p2' }],
      rollups,
    );
    expect(g.flows[0].label).toBe('Request a movie');
    expect(g.flows[0].pages.map((p) => p.page_id)).toEqual(['p1', 'p2']);
    expect(g.flows[0].status).toBe('in-progress');
    expect(g.unassigned.map((p) => p.page_id)).toEqual(['p3']);
  });
});

describe('slugify', () => {
  it('normalises names to a stable match key', () => {
    expect(slugify('Poster Card')).toBe('poster-card');
    expect(slugify('  Watch/Card! ')).toBe('watch-card');
  });
});
