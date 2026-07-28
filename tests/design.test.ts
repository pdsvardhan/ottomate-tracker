// N2 — the design index status board summariser. run: npx vitest --run tests/design.test.ts
import { describe, it, expect } from 'vitest';
import { summariseTarget, summariseTargets, type DecisionRowLike } from '@/lib/design';

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
