// lib/validation/todos.ts — the to-do model (ottomate #774 + #530, locked by the owner 2026-09-07).
//
// A to-do used to be one 300-char title + a boolean. Measured over 794 rows: 137 titles at the cap,
// "DONE" written into 126 titles, "owner" into 81, 28 ad-hoc [tags] carrying state/origin as prose.
// This gives the row real dimensions. Every enum has a misc/other bucket, and the list endpoint counts
// them, so a bucket filling up is visible instead of silently absorbing a category we forgot to name.
//
// State semantics — what each one means for a session picking work:
//   open         captured, not looked at yet
//   ready        specced enough to build now
//   in-progress  someone is on it this session
//   built        code exists; needs verification/test before it counts
//   blocked      cannot move; blocked_on says on whom (owner = the owner's own queue)
//   parked       deliberately deferred, reason in body — not "forgotten"
//   done         finished; `done=true` is kept in sync for old callers
// "Open" in the skill's load block = state NOT IN (done, parked).
import { z } from 'zod';

export const TODO_STATES = ['open', 'ready', 'in-progress', 'built', 'blocked', 'parked', 'done'] as const;
export const TODO_KINDS = ['bug', 'feature', 'chore', 'research', 'process', 'misc'] as const;
export const TODO_BLOCKED_ON = ['owner', 'dependency', 'external', 'other'] as const;
export const TODO_PRIORITIES = ['P0', 'P1', 'P2'] as const;
export type TodoState = (typeof TODO_STATES)[number];
export type TodoKind = (typeof TODO_KINDS)[number];
export type TodoBlockedOn = (typeof TODO_BLOCKED_ON)[number];
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

const fields = {
  // 300 is kept so every existing row stays PATCHable; NEW titles should be <=140 (task-tracking.md) with the why in body.
  title: z.string().min(1).max(300),
  body: z.string().max(20000).nullish(),
  state: z.enum(TODO_STATES),
  kind: z.enum(TODO_KINDS),
  blocked_on: z.enum(TODO_BLOCKED_ON).nullish(),
  priority: z.enum(TODO_PRIORITIES).nullish(),
  origin: z.string().max(300).nullish(),
  blocked_by: z.array(z.number().int().positive()).max(50).nullish(),
  // ISO timestamp, `true` for "now", or null to clear
  last_verified_at: z.union([z.string().datetime({ offset: true }), z.literal(true), z.null()]).optional(),
  done: z.boolean(),
  sort_order: z.number().int(),
};

export const TodoCreateSchema = z.object({
  title: fields.title,
  body: fields.body,
  state: fields.state.optional(),
  kind: fields.kind.optional(),
  blocked_on: fields.blocked_on,
  priority: fields.priority,
  origin: fields.origin,
  blocked_by: fields.blocked_by,
  last_verified_at: fields.last_verified_at,
  sort_order: fields.sort_order.nullish(),
});

export const TodoPatchSchema = z.object({
  title: fields.title.optional(),
  body: fields.body,
  state: fields.state.optional(),
  kind: fields.kind.optional(),
  blocked_on: fields.blocked_on,
  priority: fields.priority,
  origin: fields.origin,
  blocked_by: fields.blocked_by,
  last_verified_at: fields.last_verified_at,
  done: fields.done.optional(),
  sort_order: fields.sort_order.optional(),
});

export type TodoWrite = z.infer<typeof TodoPatchSchema>;
export interface TodoLike { state?: string | null; done?: boolean | null; blocked_on?: string | null }

/**
 * Keep `done` <-> `state` consistent and `blocked_on` meaningful. Pure; shared by POST and PATCH.
 *  - state given            -> done follows it
 *  - only done given        -> state becomes done / leaves done (back to open, or the prior non-done state)
 *  - state blocked          -> blocked_on defaults to 'other' when nobody named who
 *  - state anything else    -> blocked_on cleared (it only means something while blocked)
 *  - last_verified_at true  -> now
 */
export function normalizeTodoWrite(input: TodoWrite, existing?: TodoLike | null): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };
  delete out.last_verified_at;
  if (input.last_verified_at === true) out.last_verified_at = new Date();
  else if (typeof input.last_verified_at === 'string') out.last_verified_at = new Date(input.last_verified_at);
  else if (input.last_verified_at === null) out.last_verified_at = null;

  let state: TodoState | undefined = input.state;
  if (state === undefined && input.done !== undefined) {
    const prior = existing?.state as TodoState | undefined;
    state = input.done ? 'done' : prior && prior !== 'done' ? prior : 'open';
  }
  if (state !== undefined) {
    out.state = state;
    out.done = state === 'done';
  }
  const finalState = (state ?? (existing?.state as TodoState | undefined) ?? 'open') as TodoState;
  if (finalState === 'blocked') {
    if (!input.blocked_on && !existing?.blocked_on) out.blocked_on = 'other';
  } else if (input.blocked_on != null || existing?.blocked_on) {
    out.blocked_on = null;
  }
  return out;
}

export interface TodoCountable { state?: string | null; kind?: string | null; blocked_on?: string | null; priority?: string | null }

/** Bucket counts for a list. `misc` / `other` totals are the drift signal the owner asked for (#774). */
export function todoCounts(rows: TodoCountable[]) {
  const tally = (key: keyof TodoCountable) => {
    const c: Record<string, number> = {};
    for (const r of rows) { const v = r[key]; if (v) c[v] = (c[v] ?? 0) + 1; }
    return c;
  };
  return {
    total: rows.length,
    open: rows.filter((r) => r.state !== 'done' && r.state !== 'parked').length,
    owner_queue: rows.filter((r) => r.state === 'blocked' && r.blocked_on === 'owner').length,
    state: tally('state'),
    kind: tally('kind'),
    blocked_on: tally('blocked_on'),
    priority: tally('priority'),
  };
}
