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
  // requireBearer RETURNS the rejection response (or null); it does not throw.
  const auth = requireBearer(req);
  if (auth) return auth;

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
// PATCH — Stage 0 sketch write-back (todo #225)
// ============================================================================
// core_idea_raw stays immutable (the audit's rule, enforced by POST); everything a Stage 0 pass
// DERIVES from it is written here. Without this, sketches had nowhere to live in the DB and ND1
// could only be finalized on disk — leaving the 0->1 gate unsatisfiable (adr-014).
//
// Every field is optional and only supplied keys are written, so a pass that produces only flows
// cannot blank the features another pass already stored.
const PatchBody = z.object({
  session_id: z.string().min(1),
  core_idea_refined: z.string().min(1).nullish(),
  extracted_hints: z.unknown().nullish(),
  features_sketch: z.array(z.unknown()).nullish(),
  flows_sketch: z.array(z.unknown()).nullish(),
  risk_concerns_initial: z.array(z.unknown()).nullish(),
  dropped_hallucinations: z.array(z.unknown()).nullish(),
  status: z.enum(['captured', 'hints-extracted', 'sketched', 'finalized']).nullish(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // requireBearer RETURNS the rejection response (or null); it does not throw.
  const auth = requireBearer(req);
  if (auth) return auth;

  const { slug } = await params;

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'validation', details: err instanceof z.ZodError ? err.flatten() : String(err) },
      { status: 400 },
    );
  }

  const db = await getDb();
  const existing = await db.select().from(intent_drafts).where(eq(intent_drafts.project_slug, slug)).limit(1);
  if (existing.length === 0) {
    return NextResponse.json(
      { error: 'not-found', details: { resource: 'intent_draft', slug, hint: 'POST the intent dump first' } },
      { status: 404 },
    );
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (body.core_idea_refined !== undefined && body.core_idea_refined !== null) {
    updates.core_idea_refined = body.core_idea_refined;
    updates.core_idea_refined_at = now;
    updates.core_idea_refined_session_id = body.session_id;
  }
  if (body.extracted_hints !== undefined && body.extracted_hints !== null) {
    updates.extracted_hints = JSON.stringify(body.extracted_hints);
    updates.hints_extracted_at = now;
    updates.hints_session_id = body.session_id;
  }

  // The three sketch arrays share one timestamp: they are produced by the same Stage 0 pass.
  let touchedSketches = false;
  for (const key of ['features_sketch', 'flows_sketch', 'risk_concerns_initial'] as const) {
    const value = body[key];
    if (value !== undefined && value !== null) {
      updates[key] = JSON.stringify(value);
      touchedSketches = true;
    }
  }
  if (touchedSketches) updates.sketches_generated_at = now;

  if (body.dropped_hallucinations !== undefined && body.dropped_hallucinations !== null) {
    updates.dropped_hallucinations = JSON.stringify(body.dropped_hallucinations);
  }
  if (body.status) updates.status = body.status;

  if (Object.keys(updates).length === 1) {
    return NextResponse.json(
      { error: 'validation', details: { reason: 'no writable field supplied' } },
      { status: 400 },
    );
  }

  await db.update(intent_drafts).set(updates).where(eq(intent_drafts.project_slug, slug));
  const updated = await db.select().from(intent_drafts).where(eq(intent_drafts.project_slug, slug)).limit(1);
  return NextResponse.json({ intent_draft: updated[0], written: Object.keys(updates).filter((k) => k !== 'updated_at') });
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
