// /api/design-decisions/[id] — read / transition / delete ONE design decision.
//
// PATCH owns the state machine: proposed → in-review → locked, with → rejected and
// locked → superseded. G3 rule 12: a lock is EARNED (explicit confirm, or surviving one
// unchanged re-exposure), never implied by a first click — so promoting to `locked`
// requires confirmed:true, either already stored or supplied in the same call.
// G3 rule 13: unlocking carries MORE friction than locking — it needs an explicit
// unlock_reason, because protecting committed work should be the cheap default.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

const PatchSchema = z.object({
  status: z.enum(['proposed', 'in-review', 'locked', 'rejected', 'superseded']).optional(),
  chosen_value: z.string().optional(),
  mixed_from: z.unknown().optional(),
  rejected: z.unknown().optional(),
  rationale: z.string().optional(),          // uncapped
  constraints_applied: z.unknown().optional(),
  profile_at_decision: z.string().optional(),
  snapshot: z.string().optional(),
  preview_url: z.string().optional(),
  confirmed: z.boolean().optional(),
  confirmation_text_shown: z.string().optional(),
  round: z.number().int().min(1).optional(),
  unlock_reason: z.string().min(1).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await getDb();
  const row = db.select().from(schema.design_decisions)
    .where(eq(schema.design_decisions.id, Number(id))).get();
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ decision: row });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = await readAuthBody(req, PatchSchema);
  if (!parsed.ok) return parsed.res;
  const d = parsed.data;

  const db = await getDb();
  const cur = db.select().from(schema.design_decisions)
    .where(eq(schema.design_decisions.id, Number(id))).get();
  if (!cur) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // A lock must be earned, not implied (G3 rule 12).
  if (d.status === 'locked') {
    const willBeConfirmed = d.confirmed ?? cur.confirmed;
    if (!willBeConfirmed) {
      return NextResponse.json({
        error: 'lock_not_earned',
        detail: 'Promoting to `locked` requires confirmed:true — an explicit confirm, or survival of one unchanged re-exposure. A first click is not a lock (G3 rule 12).',
      }, { status: 422 });
    }
  }
  // Unlocking is deliberately harder than locking (G3 rule 13).
  if (cur.status === 'locked' && d.status && d.status !== 'locked' && d.status !== 'superseded' && !d.unlock_reason) {
    return NextResponse.json({
      error: 'unlock_requires_reason',
      detail: 'Reopening a locked decision requires unlock_reason. Protecting committed work is the default-friction action (G3 rule 13).',
    }, { status: 422 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date() };
  for (const k of ['status', 'chosen_value', 'rationale', 'profile_at_decision', 'snapshot',
                   'preview_url', 'confirmed', 'confirmation_text_shown', 'round'] as const) {
    if (d[k] !== undefined) patch[k] = d[k];
  }
  for (const k of ['mixed_from', 'rejected', 'constraints_applied'] as const) {
    if (d[k] !== undefined) patch[k] = d[k] as object;
  }
  if (d.unlock_reason) {
    patch.rationale = `${cur.rationale ?? ''}\n[unlocked ${new Date().toISOString()}] ${d.unlock_reason}`;
  }

  const row = db.update(schema.design_decisions).set(patch)
    .where(eq(schema.design_decisions.id, Number(id))).returning().get();
  return NextResponse.json({ decision: row });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Bearer only, no body required — a DELETE that 400s on a missing body is a footgun.
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id } = await ctx.params;
  const db = await getDb();
  const row = db.select().from(schema.design_decisions)
    .where(eq(schema.design_decisions.id, Number(id))).get();
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  db.delete(schema.design_decisions).where(eq(schema.design_decisions.id, Number(id))).run();
  return NextResponse.json({ ok: true, deleted: Number(id) });
}
