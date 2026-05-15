// app/api/projects/[slug]/intent-drafts/extract-hints/route.ts
// Stage 0.4 Phase 2 — hybrid Claude refinement of mechanical pre-pass hints.
// Per prompts/extract-intent.md.
//
// Note: this route ASSUMES skill performs the Claude call locally and POSTS
// the structured result. Tracker validates source-substring rule + persists.
// Anthropic SDK call from server-side would require ANTHROPIC_API_KEY exposure;
// skill-side dispatch keeps tokens client-side.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { intent_drafts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

const HintEntry = z.object({
  value: z.string().min(1),
  source_substring: z.string().optional(),
  why_inferred: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.7),
});

const ExtractHintsBody = z.object({
  session_id: z.string().min(1),
  feature_hints: z.array(HintEntry).default([]),
  negated_features: z.array(HintEntry).default([]),
  target_users_candidates: z.array(HintEntry).default([]),
  inspirations_candidates: z.array(z.object({
    value: z.string(),
    emulate_or_avoid: z.enum(['emulate', 'avoid']),
    source_substring: z.string().optional(),
  })).default([]),
  integrations_candidates: z.array(HintEntry).default([]),
  domain_hints: z.array(HintEntry).default([]),
  ui_hints_candidates: z.object({
    dark_mode_pref: z.boolean().nullable().optional(),
    palette_hint: z.string().nullable().optional(),
    animation_level: z.enum(['none', 'subtle', 'smooth', 'playful']).nullable().optional(),
    layout_style: z.string().nullable().optional(),
    _provenance: z.string().nullable().optional(),
  }).optional(),
  tech_hints_candidates: z.object({
    framework_hint: z.string().nullable().optional(),
    db_hint: z.string().nullable().optional(),
    deploy_hint: z.string().nullable().optional(),
    _provenance: z.string().nullable().optional(),
  }).optional(),
  auth_intent_candidate: z.object({
    value: z.enum(['none', 'password', 'magic-link', 'oauth', 'sso', 'custom']).nullable(),
    _provenance: z.string().nullable().optional(),
  }).optional(),
  likes_candidates: z.array(HintEntry).default([]),
  dislikes_candidates: z.array(HintEntry).default([]),
  must_haves_candidates: z.array(HintEntry).default([]),
  implicit_features_inferred: z.array(HintEntry).default([]),
});

// ============================================================================
// POST — submit refined hints (skill-side Claude already ran)
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

  let body: z.infer<typeof ExtractHintsBody>;
  try {
    const json = await req.json();
    body = ExtractHintsBody.parse(json);
  } catch (err) {
    return NextResponse.json(
      { error: 'validation', details: err instanceof z.ZodError ? err.flatten() : String(err) },
      { status: 400 },
    );
  }

  const db = await getDb();

  // Fetch existing intent_draft
  const existing = await db.select().from(intent_drafts).where(eq(intent_drafts.project_slug, slug)).limit(1);
  if (existing.length === 0) {
    return NextResponse.json(
      { error: 'not-found', details: { resource: 'intent_draft', slug, hint: 'POST /intent-drafts first' } },
      { status: 404 },
    );
  }

  const draft = existing[0]!;
  const rawText = draft.core_idea_raw;

  // Validate source_substring rule (anti-hallucination guard)
  const validated: typeof body = {
    ...body,
    feature_hints: body.feature_hints.filter((h) => isValidHint(h, rawText)),
    negated_features: body.negated_features.filter((h) => isValidHint(h, rawText)),
    target_users_candidates: body.target_users_candidates.filter((h) => isValidHint(h, rawText)),
    integrations_candidates: body.integrations_candidates.filter((h) => isValidHint(h, rawText)),
    domain_hints: body.domain_hints.filter((h) => isValidHint(h, rawText)),
    likes_candidates: body.likes_candidates.filter((h) => isValidHint(h, rawText)),
    dislikes_candidates: body.dislikes_candidates.filter((h) => isValidHint(h, rawText)),
    must_haves_candidates: body.must_haves_candidates.filter((h) => isValidHint(h, rawText)),
    inspirations_candidates: body.inspirations_candidates.filter((c) => !c.source_substring || rawText.toLowerCase().includes(c.source_substring.toLowerCase())),
    implicit_features_inferred: body.implicit_features_inferred.filter((h) => h.why_inferred && h.why_inferred.length >= 20),
  };

  const droppedCount =
    body.feature_hints.length - validated.feature_hints.length +
    body.negated_features.length - validated.negated_features.length;

  // Persist
  const now = new Date().toISOString();
  await db.update(intent_drafts)
    .set({
      extracted_hints: JSON.stringify(validated),
      hints_extracted_at: now,
      hints_session_id: body.session_id,
      dropped_hallucinations: droppedCount > 0 ? JSON.stringify({ count: droppedCount, ran_at: now }) : null,
      status: 'hints_extracted',
      updated_at: now,
    })
    .where(eq(intent_drafts.project_slug, slug));

  return NextResponse.json({
    extracted_hints: validated,
    dropped_hallucinations: droppedCount,
    rule: 'source_substring_required (anti-hallucination)',
  });
}

function isValidHint(hint: z.infer<typeof HintEntry>, rawText: string): boolean {
  if (hint.source_substring) {
    return rawText.toLowerCase().includes(hint.source_substring.toLowerCase());
  }
  return !!(hint.why_inferred && hint.why_inferred.length >= 20);
}
