// app/api/skill-events/route.ts
// Generic timeline log — every major skill action emits a row here.
// Powers /audit/[slug] timeline view + cross-stage debugging.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { skill_events } from '@/lib/db/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

// ============================================================================
// POST — emit a skill event
// ============================================================================
const PostBody = z.object({
  project_slug: z.string().nullable().optional(),
  event_type: z.string().min(1),
  session_id: z.string().nullable().optional(),

  iteration_id: z.number().int().nullable().optional(),
  feature_id: z.string().nullable().optional(),
  flow_id: z.string().nullable().optional(),
  page_id: z.string().nullable().optional(),
  component_id: z.number().int().nullable().optional(),

  evidence: z.union([z.record(z.string(), z.unknown()), z.string()]).optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  // iter-208 #1509: requireBearer RETURNS the 401/403 response (it never throws); the old
  // try/catch discarded it, so this route accepted writes without the token.
  const denied = requireBearer(req);
  if (denied) return denied;

  let body: z.infer<typeof PostBody>;
  try {
    body = PostBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'validation', details: err instanceof z.ZodError ? err.flatten() : String(err) },
      { status: 400 },
    );
  }

  const db = await getDb();
  const event_at = new Date().toISOString();

  const evidenceJson = body.evidence
    ? (typeof body.evidence === 'string' ? body.evidence : JSON.stringify(body.evidence))
    : null;

  await db.insert(skill_events).values({
    project_slug: body.project_slug ?? null,
    event_type: body.event_type,
    event_at,
    session_id: body.session_id ?? null,
    iteration_id: body.iteration_id ?? null,
    feature_id: body.feature_id ?? null,
    flow_id: body.flow_id ?? null,
    page_id: body.page_id ?? null,
    component_id: body.component_id ?? null,
    evidence: evidenceJson,
    notes: body.notes ?? null,
  });

  return NextResponse.json(
    {
      event: {
        event_type: body.event_type,
        event_at: event_at,
        project_slug: body.project_slug,
      },
    },
    { status: 201 },
  );
}

// ============================================================================
// GET — query events (timeline view + cross-stage debugging)
// ============================================================================
export async function GET(req: Request) {
  const url = new URL(req.url);
  const project_slug = url.searchParams.get('project_slug');
  const event_type = url.searchParams.get('event_type');
  const since = url.searchParams.get('since');
  const until = url.searchParams.get('until');
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 1000) : 200;

  const db = await getDb();

  const conditions = [];
  if (project_slug) conditions.push(eq(skill_events.project_slug, project_slug));
  if (event_type) conditions.push(eq(skill_events.event_type, event_type));
  if (since) conditions.push(gte(skill_events.event_at, since));
  if (until) conditions.push(lte(skill_events.event_at, until));

  let query = db.select().from(skill_events).$dynamic();
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  const rows = await query.orderBy(desc(skill_events.event_at)).limit(limit);

  return NextResponse.json({
    events: rows,
    count: rows.length,
    filter: { project_slug: project_slug, event_type: event_type, since, until, limit },
  });
}
