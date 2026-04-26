// /api/iterations/[id]/items/[itemId]/verifier-result — POST
// Verifier sub-agent submits its 4-pass report. Codex P0 #4: independent inputs.

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { VerifierResultSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string; itemId: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, VerifierResultSchema);
  if (!result.ok) return result.res;
  const { id, itemId } = await params;
  const itrId = parseIntId(id);
  const itmId = parseIntId(itemId);
  if (itrId === null || itmId === null) return badRequest('Invalid id');
  const db = await getDb();
  const item = db.select().from(schema.iteration_items)
    .where(and(eq(schema.iteration_items.id, itmId), eq(schema.iteration_items.iteration_id, itrId))).get();
  if (!item) return notFound(`Item ${itmId} not in iteration ${itrId}`);
  const iteration = db.select({ project_slug: schema.iterations.project_slug }).from(schema.iterations)
    .where(eq(schema.iterations.id, itrId)).get();
  if (!iteration) return notFound(`Iteration ${itrId} not found`);

  // Persist full verification report.
  const vr = db.insert(schema.verification_reports).values({
    project_slug: iteration.project_slug,
    target_kind: 'stage-4-iteration-item',
    target_id: String(itmId),
    verifier_session_id: result.data.verifier_session_id,
    pass_a_code_reality: result.data.pass_a_code_reality ?? null,
    pass_b_stub_detection: result.data.pass_b_stub_detection ?? null,
    pass_c_data_correctness: result.data.pass_c_data_correctness ?? null,
    pass_d_acceptance_criteria: result.data.pass_d_acceptance_criteria ?? null,
    recommendation_overall: result.data.recommendation_overall,
    recommendation_reason: result.data.recommendation_reason,
    mandatory_user_review: result.data.mandatory_user_review,
    full_report: result.data.full_report as Record<string, unknown> | null | undefined,
  }).returning().get();

  // Update item with summary verifier result (verbatim quick-look).
  const itemStatus =
    result.data.recommendation_overall === 'APPROVE' ? 'verified'
    : result.data.recommendation_overall === 'BLOCK' ? 'rejected'
    : 'building';

  db.update(schema.iteration_items).set({
    verifier_result: {
      report_id: vr.id,
      recommendation: result.data.recommendation_overall,
      reason: result.data.recommendation_reason,
      mandatory_user_review: result.data.mandatory_user_review,
    },
    status: itemStatus,
  }).where(eq(schema.iteration_items.id, itmId)).run();

  const updated = db.select().from(schema.iteration_items).where(eq(schema.iteration_items.id, itmId)).get();
  return NextResponse.json({ verification_report: vr, item: updated });
}
