// app/api/drift/[id]/resolve/route.ts
// User resolves a drift row: import (DB ← YAML) | overwrite (YAML ← DB) | abort

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { drift_resolutions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

const ResolveBody = z.object({
  resolution: z.enum(['import', 'overwrite', 'abort']),
  session_id: z.string().min(1),
  notes: z.string().optional(),
});

// ============================================================================
// POST /api/drift/[id]/resolve
// ============================================================================
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // iter-208 #1509: requireBearer RETURNS the 401/403 response (it never throws); the old
  // try/catch discarded it, so this route accepted writes without the token.
  const denied = requireBearer(req);
  if (denied) return denied;

  const { id } = await params;
  const driftId = parseInt(id, 10);
  if (isNaN(driftId)) {
    return NextResponse.json(
      { error: 'validation', details: { id, reason: 'must be integer' } },
      { status: 400 },
    );
  }

  let body: z.infer<typeof ResolveBody>;
  try {
    body = ResolveBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'validation', details: err instanceof z.ZodError ? err.flatten() : String(err) },
      { status: 400 },
    );
  }

  const db = await getDb();

  const existing = await db.select()
    .from(drift_resolutions)
    .where(eq(drift_resolutions.id, driftId))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json(
      { error: 'not-found', details: { resource: 'drift_resolution', id: driftId } },
      { status: 404 },
    );
  }

  if (existing[0]!.resolution) {
    return NextResponse.json(
      {
        error: 'conflict',
        details: { reason: `Already resolved as ${existing[0]!.resolution} at ${existing[0]!.resolved_at}` },
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  await db.update(drift_resolutions)
    .set({
      resolution: body.resolution,
      resolved_at: now,
      resolved_session_id: body.session_id,
      notes: body.notes ?? existing[0]!.notes,
    })
    .where(eq(drift_resolutions.id, driftId));

  const updated = await db.select()
    .from(drift_resolutions)
    .where(eq(drift_resolutions.id, driftId))
    .limit(1);

  return NextResponse.json({
    drift_row: updated[0],
    next_action: body.resolution === 'import'
      ? 'Skill should parse YAML and update DB tables matching doc_kind'
      : body.resolution === 'overwrite'
        ? 'Skill should regenerate YAML from DB and write to file_path'
        : 'No action; pack-up halted by user',
  });
}
