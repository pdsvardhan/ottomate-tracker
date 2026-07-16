// /api/iterations/[id]/items/[itemId]/build-status — POST
// Coder agent updates the item's build status during execution.
//
// Progress only (2026-07-16). This endpoint reports what the CODER is doing; it may
// not record a verdict. `verified` is the independent verifier's call and is rejected
// here — see the guard in POST and bedrock rule 4 (verifier inputs are the locked
// manifest + diff, never coder claims).

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { BuildStatusSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

// `verified` is deliberately absent — only /verifier-result may advance an item to
// verified, because that endpoint writes the verification_reports row proving it.
// `verifier-pending` folds into `building`: it is a progress label, not a distinct state.
const STATUS_MAP: Record<'building' | 'verifier-pending' | 'failed', 'building' | 'rejected'> = {
  building: 'building',
  'verifier-pending': 'building',
  failed: 'rejected',
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

  const newStatus = STATUS_MAP[reported];
  db.update(schema.iteration_items).set({
    status: newStatus,
    notes: result.data.notes ?? item.notes,
  }).where(eq(schema.iteration_items.id, itmId)).run();
  const updated = db.select().from(schema.iteration_items).where(eq(schema.iteration_items.id, itmId)).get();
  return NextResponse.json({ item: updated });
}
