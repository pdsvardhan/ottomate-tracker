// app/api/drift/route.ts
// Mirror drift detection (CC-1 + Codex P0 #2).
// GET — list unresolved drift rows for a project (or all)
// POST — register a new drift row (skill detected mismatch during pack-up)

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { drift_resolutions } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

// ============================================================================
// GET /api/drift?project_slug=<slug>&unresolved=true
// ============================================================================
export async function GET(req: Request) {
  const url = new URL(req.url);
  const project_slug = url.searchParams.get('project_slug');
  const onlyUnresolved = url.searchParams.get('unresolved') !== 'false';

  const db = await getDb();

  let rows;
  if (project_slug && onlyUnresolved) {
    rows = await db.select()
      .from(drift_resolutions)
      .where(and(
        eq(drift_resolutions.project_slug, project_slug),
        isNull(drift_resolutions.resolution),
      ));
  } else if (project_slug) {
    rows = await db.select()
      .from(drift_resolutions)
      .where(eq(drift_resolutions.project_slug, project_slug));
  } else if (onlyUnresolved) {
    rows = await db.select()
      .from(drift_resolutions)
      .where(isNull(drift_resolutions.resolution));
  } else {
    rows = await db.select().from(drift_resolutions).limit(100);
  }

  return NextResponse.json({
    drift_rows: rows,
    count: rows.length,
    filter: { project_slug: project_slug, unresolved_only: onlyUnresolved },
  });
}

// ============================================================================
// POST /api/drift — register a drift detection
// ============================================================================
const PostBody = z.object({
  project_slug: z.string().min(1),
  file_path: z.string().min(1),
  doc_kind: z.enum(['overview', 'flows', 'features', 'ui', 'data', 'risks', 'other']),
  db_canonical_hash: z.string().min(1),
  file_hash: z.string().min(1),
  last_synced_hash: z.string().optional().nullable(),
  detected_session_id: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  // iter-208 #1509: requireBearer RETURNS the 401/403 response (it never throws); the old
  // try/catch discarded it, so this route accepted writes without the token.
  const denied = requireBearer(req);
  if (denied) return denied;

  let body: z.infer<typeof PostBody>;
  try {
    const json = await req.json();
    body = PostBody.parse(json);
  } catch (err) {
    return NextResponse.json(
      { error: 'validation', details: err instanceof z.ZodError ? err.flatten() : String(err) },
      { status: 400 },
    );
  }

  // Skip if hashes match (no drift)
  if (body.db_canonical_hash === body.file_hash) {
    return NextResponse.json(
      { message: 'no_drift', reason: 'hashes match' },
      { status: 200 },
    );
  }

  const db = await getDb();
  const detected_at = new Date().toISOString();

  await db.insert(drift_resolutions).values({
    project_slug: body.project_slug,
    detected_at,
    detected_session_id: body.detected_session_id,
    file_path: body.file_path,
    doc_kind: body.doc_kind,
    db_canonical_hash: body.db_canonical_hash,
    file_hash: body.file_hash,
    last_synced_hash: body.last_synced_hash ?? null,
    notes: body.notes ?? null,
  });

  const inserted = await db.select()
    .from(drift_resolutions)
    .where(and(
      eq(drift_resolutions.project_slug, body.project_slug),
      eq(drift_resolutions.file_path, body.file_path),
      eq(drift_resolutions.detected_at, detected_at),
    ))
    .limit(1);

  return NextResponse.json({ drift_row: inserted[0] }, { status: 201 });
}
