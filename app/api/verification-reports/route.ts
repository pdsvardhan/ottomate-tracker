// /api/verification-reports — persist a verifier verdict for a Stage-3 feature.
// 2026-06-10 (WS4): the verifier step (stage-3-verifier.md) had no API to write a
// stage-3-feature report — only the Stage-4 iteration path could. This closes that
// gap so an independent verifier sub-agent can record APPROVE/BLOCK with evidence.
// Bearer required (it is a mutation). The 4-pass columns mirror the schema.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const ReportCreateSchema = z.object({
  project_slug: z.string().min(1),
  target_kind: z.enum(['stage-3-feature', 'stage-4-iteration-item']).default('stage-3-feature'),
  target_id: z.string().min(1),
  verifier_session_id: z.string().min(1),
  pass_a_code_reality: z.string().optional(),
  pass_b_stub_detection: z.string().optional(),
  pass_c_data_correctness: z.string().optional(),
  pass_d_acceptance_criteria: z.string().optional(),
  recommendation_overall: z.enum(['APPROVE', 'BLOCK', 'ITERATE']),
  recommendation_reason: z.string().optional(),
  mandatory_user_review: z.boolean().optional(),
  full_report: z.unknown().optional(),
});

// GET /api/verification-reports?project_slug=&target_id=&limit=
export async function GET(req: Request) {
  const url = new URL(req.url);
  const project_slug = url.searchParams.get('project_slug');
  const target_id = url.searchParams.get('target_id');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
  const db = await getDb();
  const conds = [];
  if (project_slug) conds.push(eq(schema.verification_reports.project_slug, project_slug));
  if (target_id) conds.push(eq(schema.verification_reports.target_id, target_id));
  const rows = db
    .select()
    .from(schema.verification_reports)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.verification_reports.ran_at))
    .limit(limit)
    .all();
  return NextResponse.json({ reports: rows, count: rows.length });
}

// POST /api/verification-reports — bearer required.
export async function POST(req: Request) {
  const parsed = await readAuthBody(req, ReportCreateSchema);
  if (!parsed.ok) return parsed.res;
  const data = parsed.data;

  const db = await getDb();
  const proj = db
    .select({ slug: schema.projects.slug })
    .from(schema.projects)
    .where(eq(schema.projects.slug, data.project_slug))
    .get();
  if (!proj) return NextResponse.json({ error: `project '${data.project_slug}' not found` }, { status: 404 });

  if (data.target_kind === 'stage-3-feature') {
    const feat = db
      .select({ id: schema.features.id })
      .from(schema.features)
      .where(and(eq(schema.features.id, data.target_id), eq(schema.features.project_slug, data.project_slug)))
      .get();
    if (!feat) {
      return NextResponse.json(
        { error: `feature '${data.target_id}' not found in '${data.project_slug}'` },
        { status: 404 },
      );
    }
  }

  db.insert(schema.verification_reports)
    .values({
      project_slug: data.project_slug,
      target_kind: data.target_kind,
      target_id: data.target_id,
      verifier_session_id: data.verifier_session_id,
      pass_a_code_reality: data.pass_a_code_reality ?? null,
      pass_b_stub_detection: data.pass_b_stub_detection ?? null,
      pass_c_data_correctness: data.pass_c_data_correctness ?? null,
      pass_d_acceptance_criteria: data.pass_d_acceptance_criteria ?? null,
      recommendation_overall: data.recommendation_overall,
      recommendation_reason: data.recommendation_reason ?? null,
      mandatory_user_review: data.mandatory_user_review ?? false,
      full_report: (data.full_report ?? null) as object | null,
    })
    .run();

  const created = db
    .select()
    .from(schema.verification_reports)
    .where(eq(schema.verification_reports.target_id, data.target_id))
    .orderBy(desc(schema.verification_reports.ran_at))
    .limit(1)
    .get();

  return NextResponse.json({ report: created }, { status: 201 });
}
