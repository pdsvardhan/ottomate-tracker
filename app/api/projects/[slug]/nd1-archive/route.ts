// app/api/projects/[slug]/nd1-archive/route.ts
// Stage 0 exit — finalize ND1 (todo #225).
//
// The gap this closes: `intent_drafts` and `nd1_archive` both existed, but nothing could WRITE
// the finalize step. Stage 0 could capture an intent dump and Stage 1 could read an archive row,
// with no endpoint in between — so ND1 lived only as a YAML file on disk (cap-a's has sat at
// staging/ND1.yaml since 2026-07-01) and the 0->1 gate's "ND1 finalized" condition was
// unsatisfiable. adr-014: a gate may only reference state that can actually be written.
//
// POST   — snapshot the draft into nd1_archive (status 'finalized').
// PATCH  — Stage 1 intake marks the archive 'consumed'; that is Stage 1's exit marker.
// GET    — read the latest archive row for a project.

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/lib/db/client';
import { intent_drafts, nd1_archive, projects } from '@/lib/db/schema';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

const PostBody = z.object({
  session_id: z.string().min(1),
  // 1 = new build, 2 = existing codebase adopted into the pipeline (Stage 0 Type 1/2 detection).
  journey_type: z.union([z.literal(1), z.literal(2)]),
  archive_path: z.string().max(500).nullish(),
});

const PatchBody = z.object({
  session_id: z.string().min(1),
  status: z.enum(['finalized', 'consumed', 'superseded']),
});

function countOf(json: string | null): number | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.length : null;
  } catch {
    return null;
  }
}

async function readJson<T>(req: Request, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  try {
    const json = await req.json();
    return { ok: true, data: schema.parse(json) };
  } catch (err) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: 'validation', details: err instanceof z.ZodError ? err.flatten() : String(err) },
        { status: 400 },
      ),
    };
  }
}

// ============================================================================
// POST — finalize the draft into an immutable archive row
// ============================================================================
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // requireBearer RETURNS the rejection response (or null); it does not throw.
  const auth = requireBearer(req);
  if (auth) return auth;

  const { slug } = await params;
  const parsed = await readJson(req, PostBody);
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const db = await getDb();
  const project = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  if (project.length === 0) {
    return NextResponse.json({ error: 'not-found', details: { resource: 'project', slug } }, { status: 404 });
  }

  const drafts = await db.select().from(intent_drafts).where(eq(intent_drafts.project_slug, slug)).limit(1);
  const draft = drafts[0];
  if (!draft) {
    return NextResponse.json(
      { error: 'not-found', details: { resource: 'intent_draft', slug, hint: 'POST the intent dump to /intent-drafts first' } },
      { status: 404 },
    );
  }

  // The 0->1 gate floor, enforced here rather than trusted: >=1 feature sketch AND >=1 flow
  // sketch. risk_concerns_initial is deliberately NOT required (floor removed 2026-06-10) —
  // Stage 1 catalogs risks regardless.
  const features_sketch_count = countOf(draft.features_sketch);
  const flows_sketch_count = countOf(draft.flows_sketch);
  const missing: string[] = [];
  if (!features_sketch_count) missing.push('features_sketch (>=1 required)');
  if (!flows_sketch_count) missing.push('flows_sketch (>=1 required)');
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: 'gate-unsatisfied',
        details: {
          reason: 'ND1 cannot be finalized until the draft carries sketches',
          missing,
          hint: 'PATCH /api/projects/' + slug + '/intent-drafts with features_sketch and flows_sketch',
        },
      },
      { status: 422 },
    );
  }

  // The payload IS the draft at this instant. Hashing it makes the archive verifiable against
  // the YAML mirror later, which is what the traceability ledger compares.
  const payload = {
    core_idea_raw: draft.core_idea_raw,
    core_idea_refined: draft.core_idea_refined,
    extracted_hints: draft.extracted_hints ? JSON.parse(draft.extracted_hints) : null,
    features_sketch: draft.features_sketch ? JSON.parse(draft.features_sketch) : null,
    flows_sketch: draft.flows_sketch ? JSON.parse(draft.flows_sketch) : null,
    risk_concerns_initial: draft.risk_concerns_initial ? JSON.parse(draft.risk_concerns_initial) : null,
    dropped_hallucinations: draft.dropped_hallucinations ? JSON.parse(draft.dropped_hallucinations) : null,
  };
  const payload_json = JSON.stringify(payload);
  const payload_hash = createHash('sha256').update(payload_json).digest('hex');

  const now = new Date().toISOString();

  // Re-finalizing is idempotent when nothing changed: an identical hash returns the existing row
  // rather than stacking duplicate versions (the same single-write discipline as verification
  // reports). A CHANGED payload creates the next version, so history is never overwritten.
  const priors = await db.select().from(nd1_archive)
    .where(eq(nd1_archive.project_slug, slug)).orderBy(desc(nd1_archive.version));
  const latest = priors[0];
  if (latest && latest.payload_hash === payload_hash) {
    return NextResponse.json({ nd1_archive: latest, message: 'idempotent: identical payload already finalized' });
  }

  await db.insert(nd1_archive).values({
    project_slug: slug,
    version: (latest?.version ?? 0) + 1,
    finalized_at: now,
    finalized_session_id: body.session_id,
    payload_json,
    payload_hash,
    journey_type: body.journey_type,
    features_sketch_count,
    flows_sketch_count,
    risk_concerns_count: countOf(draft.risk_concerns_initial),
    // NOT 'consumed' — the column default is, but consumption is Stage 1 intake's marker to set.
    status: 'finalized',
    archive_path: body.archive_path ?? null,
  });

  // The draft is now finalized; Stage 0 is done with it.
  await db.update(intent_drafts)
    .set({ status: 'finalized', updated_at: now })
    .where(eq(intent_drafts.project_slug, slug));

  const created = await db.select().from(nd1_archive)
    .where(and(eq(nd1_archive.project_slug, slug), eq(nd1_archive.payload_hash, payload_hash)))
    .limit(1);

  return NextResponse.json({ nd1_archive: created[0], intent_draft_status: 'finalized' }, { status: 201 });
}

// ============================================================================
// PATCH — Stage 1 intake marks the archive consumed (its exit marker)
// ============================================================================
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // requireBearer RETURNS the rejection response (or null); it does not throw.
  const auth = requireBearer(req);
  if (auth) return auth;

  const { slug } = await params;
  const parsed = await readJson(req, PatchBody);
  if (!parsed.ok) return parsed.res;
  const body = parsed.data;

  const db = await getDb();
  const rows = await db.select().from(nd1_archive)
    .where(eq(nd1_archive.project_slug, slug)).orderBy(desc(nd1_archive.version));
  const latest = rows[0];
  if (!latest) {
    return NextResponse.json({ error: 'not-found', details: { resource: 'nd1_archive', slug } }, { status: 404 });
  }

  await db.update(nd1_archive)
    .set({
      status: body.status,
      consumed_at: body.status === 'consumed' ? new Date().toISOString() : latest.consumed_at,
    })
    .where(eq(nd1_archive.id, latest.id));

  const updated = await db.select().from(nd1_archive).where(eq(nd1_archive.id, latest.id)).limit(1);
  return NextResponse.json({ nd1_archive: updated[0] });
}

// ============================================================================
// GET — latest archive row (unauthenticated read, like the other project GETs)
// ============================================================================
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const rows = await db.select().from(nd1_archive)
    .where(eq(nd1_archive.project_slug, slug)).orderBy(desc(nd1_archive.version));
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not-found', details: { resource: 'nd1_archive', slug } }, { status: 404 });
  }
  return NextResponse.json({ nd1_archive: rows[0], versions: rows.length });
}
