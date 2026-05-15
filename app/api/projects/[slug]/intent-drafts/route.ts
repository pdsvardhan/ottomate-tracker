// app/api/projects/[slug]/intent-drafts/route.ts
// Stage 0.4 — capture user's free-form intent dump verbatim.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { intent_drafts, projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

const PostBody = z.object({
  core_idea_raw: z.string().min(20, 'core_idea_raw must be at least 20 chars'),
  session_id: z.string().min(1),
});

// ============================================================================
// POST — capture initial intent
// ============================================================================
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    requireBearer(req);
  } catch (e) {
    return e as Response;
  }

  const { slug } = await params;

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

  const db = await getDb();

  // Verify project exists
  const project = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  if (project.length === 0) {
    return NextResponse.json(
      { error: 'not-found', details: { resource: 'project', slug } },
      { status: 404 },
    );
  }

  const now = new Date().toISOString();

  // Upsert intent_drafts row (single row per project)
  const existing = await db.select().from(intent_drafts).where(eq(intent_drafts.project_slug, slug)).limit(1);
  if (existing.length > 0) {
    // Don't overwrite core_idea_raw (immutable per audit); update if status was reset
    if (existing[0]!.core_idea_raw !== body.core_idea_raw) {
      return NextResponse.json(
        { error: 'conflict', details: { reason: 'core_idea_raw is immutable; existing value differs' } },
        { status: 409 },
      );
    }
    return NextResponse.json({ intent_draft: existing[0], message: 'idempotent: already captured' });
  }

  await db.insert(intent_drafts).values({
    project_slug: slug,
    core_idea_raw: body.core_idea_raw,
    core_idea_raw_captured_at: now,
    core_idea_raw_session_id: body.session_id,
    status: 'captured',
    created_at: now,
    updated_at: now,
  });

  const inserted = await db.select().from(intent_drafts).where(eq(intent_drafts.project_slug, slug)).limit(1);

  return NextResponse.json({ intent_draft: inserted[0] }, { status: 201 });
}

// ============================================================================
// GET — fetch the intent draft
// ============================================================================
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const db = await getDb();
  const draft = await db.select().from(intent_drafts).where(eq(intent_drafts.project_slug, slug)).limit(1);
  if (draft.length === 0) {
    return NextResponse.json(
      { error: 'not-found', details: { resource: 'intent_draft', slug } },
      { status: 404 },
    );
  }
  return NextResponse.json({ intent_draft: draft[0] });
}
