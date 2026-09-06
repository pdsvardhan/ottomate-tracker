// lib/validation/todos.test.ts — the done<->state / blocked_on rules (ottomate #774).
import { describe, expect, it } from 'vitest';
import { normalizeTodoWrite, todoCounts, TodoPatchSchema } from './todos';

describe('normalizeTodoWrite', () => {
  it('state drives done', () => {
    expect(normalizeTodoWrite({ state: 'done' })).toMatchObject({ state: 'done', done: true });
    expect(normalizeTodoWrite({ state: 'built' })).toMatchObject({ state: 'built', done: false });
  });
  it('done=true alone moves state to done; done=false leaves done for open or the prior state', () => {
    expect(normalizeTodoWrite({ done: true }, { state: 'ready' })).toMatchObject({ state: 'done', done: true });
    expect(normalizeTodoWrite({ done: false }, { state: 'done' })).toMatchObject({ state: 'open', done: false });
    expect(normalizeTodoWrite({ done: false }, { state: 'built' })).toMatchObject({ state: 'built', done: false });
  });
  it('blocked defaults blocked_on to other; leaving blocked clears it', () => {
    expect(normalizeTodoWrite({ state: 'blocked' })).toMatchObject({ blocked_on: 'other' });
    expect(normalizeTodoWrite({ state: 'blocked', blocked_on: 'owner' })).toMatchObject({ blocked_on: 'owner' });
    expect(normalizeTodoWrite({ state: 'ready' }, { state: 'blocked', blocked_on: 'owner' })).toMatchObject({ blocked_on: null });
    expect(normalizeTodoWrite({ title: 'x' }, { state: 'blocked', blocked_on: 'owner' })).not.toHaveProperty('blocked_on');
  });
  it('last_verified_at: true -> now, string -> Date, null -> null', () => {
    expect(normalizeTodoWrite({ last_verified_at: true }).last_verified_at).toBeInstanceOf(Date);
    expect(normalizeTodoWrite({ last_verified_at: '2026-09-07T00:00:00Z' }).last_verified_at).toEqual(new Date('2026-09-07T00:00:00Z'));
    expect(normalizeTodoWrite({ last_verified_at: null }).last_verified_at).toBeNull();
  });
  it('schema rejects unknown enum values', () => {
    expect(TodoPatchSchema.safeParse({ state: 'someday' }).success).toBe(false);
    expect(TodoPatchSchema.safeParse({ kind: 'idea' }).success).toBe(false);
    expect(TodoPatchSchema.safeParse({ priority: 'P3' }).success).toBe(false);
  });
});

describe('todoCounts', () => {
  it('counts buckets, open (not done/parked) and the owner queue', () => {
    const c = todoCounts([
      { state: 'open', kind: 'bug' },
      { state: 'parked', kind: 'misc' },
      { state: 'blocked', blocked_on: 'owner', kind: 'misc', priority: 'P1' },
      { state: 'done', kind: 'chore' },
    ]);
    expect(c.total).toBe(4);
    expect(c.open).toBe(2);
    expect(c.owner_queue).toBe(1);
    expect(c.kind.misc).toBe(2);
    expect(c.priority.P1).toBe(1);
  });
});
