// /api/projects/[slug]/risk-instances/[id] — get + patch + delete
// Codex P1 #10: prefer /resolve over DELETE; DELETE is for true mistakes.

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { RiskInstancePatchSchema } from '@/lib/validation/risks';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const ri = db.select().from(schema.risk_instances)
    .where(and(eq(schema.risk_instances.id, idNum), eq(schema.risk_instances.project_slug, slug))).get();
  if (!ri) return notFound(`Risk instance ${idNum} not found in '${slug}'`);
  return NextResponse.json({ risk_instance: ri });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, RiskInstancePatchSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select().from(schema.risk_instances)
    .where(and(eq(schema.risk_instances.id, idNum), eq(schema.risk_instances.project_slug, slug))).get();
  if (!existing) return notFound(`Risk instance ${idNum} not found in '${slug}'`);

  // ── correcting a resolution costs more than making one (B4, 2026-08-27) ──────────────────
  // Rewriting why or when a risk was resolved edits history, so it needs a stated reason and it
  // must not erase what it replaces. Without this, a premature closure could only be corrected
  // by overwriting the evidence that it had been premature.
  const { correction_reason, ...patch } = result.data as Record<string, unknown> & { correction_reason?: string };
  const correcting = patch.resolution_summary !== undefined || patch.resolved_at !== undefined;

  /* #681: THE GUARD USED TO KEY ON `existing.status === 'resolved'`, AND STATUS IS PATCHABLE.
   *
   * So the reason requirement could be walked around in three ordinary requests:
   *     PATCH {status: 'open'}                       -> no longer 'resolved'
   *     PATCH {resolution_summary: 'a better story'} -> guard does not fire: no reason, no stamp
   *     PATCH {status: 'resolved'}                   -> resolved again, history silently rewritten
   * (The single-request form {status:'open', resolution_summary:'...'} WAS caught, because
   * `existing` is read before the write — it was only the multi-step route that was open.)
   *
   * The question was never "is it resolved right now". It is "does this row carry a resolution
   * that would be edited". That is what `hasResolution` asks, so re-opening first no longer
   * disarms the guard.
   *
   * UN-RESOLVING IS ITSELF A HISTORY EDIT and now costs the same. Moving resolved -> anything
   * else retracts a claim the project made, and a retraction nobody has to justify is exactly the
   * silent rewrite this guard exists to prevent. */
  const hasResolution = existing.resolved_at !== null || existing.resolution_summary !== null;
  const unresolving = patch.status !== undefined && patch.status !== 'resolved' && existing.status === 'resolved';

  if ((correcting && hasResolution) || unresolving) {
    if (!correction_reason) {
      return badRequest(
        (unresolving && !correcting
          ? 'Re-opening a resolved risk requires correction_reason: retracting a resolution edits '
          : 'Correcting resolution_summary or resolved_at on a risk that carries a resolution requires correction_reason: rewriting one edits ') +
        'the record this project is judged on. The original claim is preserved in notes; a ' +
        'resolution you can silently rewrite is not a record. (Re-opening the risk first does not ' +
        'lift this — that was the bypass, #681.)',
      );
    }
    const stamp =
      `[${unresolving && !correcting ? 'resolution retracted' : 'resolution corrected'} ${new Date().toISOString()}] ${correction_reason}\n` +
      `  was status: ${existing.status}\n` +
      `  was resolved_at: ${existing.resolved_at ? new Date(existing.resolved_at).toISOString() : 'null'}\n` +
      `  was summary: ${existing.resolution_summary ?? 'null'}`;
    patch.notes = existing.notes ? `${existing.notes}\n${stamp}` : stamp;
  }

  db.update(schema.risk_instances).set(patch).where(eq(schema.risk_instances.id, idNum)).run();
  const updated = db.select().from(schema.risk_instances).where(eq(schema.risk_instances.id, idNum)).get();
  return NextResponse.json({ risk_instance: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select().from(schema.risk_instances)
    .where(and(eq(schema.risk_instances.id, idNum), eq(schema.risk_instances.project_slug, slug))).get();
  if (!existing) return notFound(`Risk instance ${idNum} not found in '${slug}'`);

  /* #681, the cruder half: DELETE walked round the correction guard entirely. Whatever PATCH
   * makes expensive, an unguarded DELETE makes free — a resolution you cannot silently rewrite
   * but CAN silently remove is not protected. This is also operating rule 11 stated in code:
   * risks RESOLVE (status + summary); they are never deleted. A risk that never carried a
   * resolution is still deletable, because there is no record to lose. */
  if (existing.resolved_at !== null || existing.resolution_summary !== null) {
    return badRequest(
      `Risk instance ${idNum} carries a resolution and cannot be deleted: risks resolve, they are ` +
      'never deleted (operating rule 11). Correct it with PATCH + correction_reason, which ' +
      'preserves the original claim in notes.',
    );
  }
  db.delete(schema.risk_instances).where(eq(schema.risk_instances.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
