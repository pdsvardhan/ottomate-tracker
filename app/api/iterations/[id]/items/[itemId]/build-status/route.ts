// /api/iterations/[id]/items/[itemId]/build-status — POST
// Coder agent updates the item's build status during execution.
//
// Progress only (2026-07-16). This endpoint reports what the CODER is doing; it may
// neither record a verdict nor close an item:
// - `verified` is rejected (400) — that is the independent verifier's call, not the
//   coder's (bedrock rule 4: inputs are the locked manifest + diff, never coder claims).
// - `failed` no longer closes the item (bedrock rule 7) — dropping a locked item takes
//   an explicit reason via defer-with-reason.
// See STATUS_MAP for the folds and the sanctioned closure paths.

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, conflict, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { isPreLock, preLockMessage } from '@/lib/lock-guard';
import { BuildStatusSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

// build-status can never CLOSE an item — every accepted label folds into `building`.
// - `verifier-pending`: a progress label, not a distinct state.
// - `failed`: folds into `building`, NOT `rejected`. `rejected` satisfies integrate, so
//   the old mapping let a coder agent drop a locked item with no mandatory reason —
//   precisely the "faking a build failure" that defer-with-reason
//   (POST /api/iterations/[id]/items/[itemId]) was added to replace (bedrock rule 7).
//   A failed build leaves the item OPEN; the failure detail belongs in `notes`.
// Closure paths, all explicit: verifier-result (APPROVE->verified / BLOCK->rejected),
// defer-with-reason (->deferred), or pre-lock DELETE (->rejected).
const STATUS_MAP: Record<'building' | 'verifier-pending' | 'failed', 'building'> = {
  building: 'building',
  'verifier-pending': 'building',
  failed: 'building',
};

interface Ctx { params: Promise<{ id: string; itemId: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, BuildStatusSchema);
  if (!result.ok) return result.res;

  // Bedrock rule 4: a coder agent may not self-certify. `verified` is a terminal state
  // that satisfies integrate, so accepting it here let a coder claim close an item with
  // no verification_reports row behind it — the exact gaslight the verifier prevents.
  const reported = result.data.status;
  if (reported === 'verified') {
    return NextResponse.json(
      {
        error:
          "build-status cannot set 'verified' — a coder agent may not self-certify. " +
          'Post the verdict to POST /api/iterations/[id]/items/[itemId]/verifier-result, ' +
          'which records the verification_reports row and advances the item.',
      },
      { status: 400 },
    );
  }

  const { id, itemId } = await params;
  const itrId = parseIntId(id);
  const itmId = parseIntId(itemId);
  if (itrId === null || itmId === null) return badRequest('Invalid id');
  const db = await getDb();
  const item = db.select().from(schema.iteration_items)
    .where(and(eq(schema.iteration_items.id, itmId), eq(schema.iteration_items.iteration_id, itrId))).get();
  if (!item) return notFound(`Item ${itmId} not in iteration ${itrId}`);

  // Bedrock rule 2 (lock before build): build progress may not be recorded against an
  // iteration the user has not locked yet. Without this, work done before the gate looked
  // identical to work done after it (todo #239a).
  const iteration = db.select({ status: schema.iterations.status }).from(schema.iterations)
    .where(eq(schema.iterations.id, itrId)).get();
  if (!iteration) return notFound(`Iteration ${itrId} not found`);
  if (isPreLock(iteration.status)) {
    return conflict(preLockMessage(itrId, iteration.status, 'build-status'));
  }

  const newStatus = STATUS_MAP[reported];
  db.update(schema.iteration_items).set({
    status: newStatus,
    notes: result.data.notes ?? item.notes,
  }).where(eq(schema.iteration_items.id, itmId)).run();
  const updated = db.select().from(schema.iteration_items).where(eq(schema.iteration_items.id, itmId)).get();
  return NextResponse.json({ item: updated });
}
