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
  if (correcting && existing.status === 'resolved') {
    if (!correction_reason) {
      return badRequest(
        'Correcting resolution_summary or resolved_at on an already-resolved risk requires ' +
        'correction_reason. The original claim is preserved in notes; a resolution you can ' +
        'silently rewrite is not a record.',
      );
    }
    const stamp =
      `[resolution corrected ${new Date().toISOString()}] ${correction_reason}\n` +
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
  const existing = db.select({ id: schema.risk_instances.id }).from(schema.risk_instances)
    .where(and(eq(schema.risk_instances.id, idNum), eq(schema.risk_instances.project_slug, slug))).get();
  if (!existing) return notFound(`Risk instance ${idNum} not found in '${slug}'`);
  db.delete(schema.risk_instances).where(eq(schema.risk_instances.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
