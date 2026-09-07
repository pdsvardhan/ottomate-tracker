// /api/verification-reports — persist a verifier verdict for a Stage-3 feature.
// 2026-06-10 (WS4): the verifier step (stage-3-verifier.md) had no API to write a
// stage-3-feature report — only the Stage-4 iteration path could. This closes that
// gap so an independent verifier sub-agent can record APPROVE/BLOCK with evidence.
// Bearer required (it is a mutation). The 4-pass columns mirror the schema.
//
// Single-write boundary (2026-07-16): this endpoint is the SOLE writer for
// stage-3-feature reports only. Stage-4 iteration-item reports are written
// exclusively by POST /api/iterations/[id]/items/[itemId]/verifier-result, which
// inserts the report AND links it to the item in one call and returns its id.
// Accepting stage-4-iteration-item here duplicated that row (two near-identical
// reports per item verification, e.g. mapsofbharat iter 78/79). It is now rejected.
//
// Commit targets (2026-09-08, to-do #817): a verification covering a COMMIT or a
// COMMIT RANGE had nowhere to live. Every target_id was resolved as a feature id, so
// such a report 404'd — it produced no row and left no trace. That silence is the
// structural reason #779 was possible: a ship claim could not be contradicted by
// evidence because the evidence had no drawer to go in. 'commit' / 'commit-range'
// now file here alongside the feature verdicts, same 4-pass columns.
//
// A sha is not a foreign key into any table, so the target is validated by SHAPE, not
// by existence: a full 40-hex sha, or '<sha>..<sha>' / '<sha>...<sha>'. Full form is
// adr-023's rule, for the same reason it was made there — reads are exact-match
// (GET ?target_id=), so a short sha stored here could never be found again, and that
// reads as "never verified" rather than "format mismatch". Arbitrary strings are still
// refused: this must not become an anything-goes sink.
//
// Existing sinks checked first, and why none of them fit:
//   · POST /api/test-runs is commit-keyed but stores a CI suite RESULT
//     (passed/failed + counts). No verdict vocabulary, no verifier_session_id, no
//     4-pass columns — a BLOCK-with-reason degrades to result='failed' with the
//     reasoning stranded in free-text notes.
//   · POST /api/deploy-artifacts is commit-keyed but records a DEPLOY, and requires
//     a deploy_url.
//   · POST /api/feature-verification-reports has a commit_sha COLUMN, but that column
//     answers "at which commit was this FLOW verified". adr-023 requires target_id to
//     resolve to a flow and returns 422 on a gated project — including screenroom,
//     which filed #817. A commit with no flow behind it cannot be filed there.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

// Shape rules for the non-FK targets. Full 40-hex only (adr-023): a caller always has
// it via `git rev-parse HEAD`, and pinning the write form removes the silent
// short-vs-full mismatch class entirely. `..` is a range, `...` git's symmetric
// difference — both are literal git range syntax, so both are accepted.
const COMMIT_SHA_RE = /^[0-9a-f]{40}$/;
const COMMIT_RANGE_RE = /^[0-9a-f]{40}\.\.\.?[0-9a-f]{40}$/;

const ReportCreateSchema = z.object({
  project_slug: z.string().min(1),
  target_kind: z
    .enum(['stage-3-feature', 'stage-4-iteration-item', 'commit', 'commit-range'])
    .default('stage-3-feature'),
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

  // Single-write guard: Stage-4 item reports belong to verifier-result, not here.
  if (data.target_kind === 'stage-4-iteration-item') {
    return NextResponse.json(
      {
        error:
          'stage-4-iteration-item reports must be written via ' +
          'POST /api/iterations/[id]/items/[itemId]/verifier-result (single-write design). ' +
          'That endpoint inserts the report, links it to the item, and returns ' +
          'verification_report.id for feature-claim reconciliation.',
      },
      { status: 400 },
    );
  }

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

  // Commit targets are shape-checked, never existence-checked — there is no table to
  // join against. Canonicalised (trim + lowercase) before the shape test so the stored
  // value is the one an exact-match GET ?target_id= will look for. Feature targets are
  // left byte-identical: target_id below is data.target_id unchanged for those.
  let target_id = data.target_id;
  if (data.target_kind === 'commit' || data.target_kind === 'commit-range') {
    target_id = data.target_id.trim().toLowerCase();
    const shaped =
      data.target_kind === 'commit' ? COMMIT_SHA_RE.test(target_id) : COMMIT_RANGE_RE.test(target_id);
    if (!shaped) {
      const expected =
        data.target_kind === 'commit'
          ? 'a full 40-hex commit sha'
          : "'<sha>..<sha>' or '<sha>...<sha>', each a full 40-hex sha";
      return NextResponse.json(
        {
          error:
            `target_id for target_kind='${data.target_kind}' must be ${expected} ` +
            `(use \`git rev-parse HEAD\`) — got '${data.target_id}'. ` +
            'adr-023: sha writes are pinned to the full form because reads match exactly, ' +
            'so a short sha could never be found again.',
        },
        { status: 422 },
      );
    }
  }

  db.insert(schema.verification_reports)
    .values({
      project_slug: data.project_slug,
      target_kind: data.target_kind,
      target_id,
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
    .where(eq(schema.verification_reports.target_id, target_id))
    .orderBy(desc(schema.verification_reports.ran_at))
    .limit(1)
    .get();

  return NextResponse.json({ report: created }, { status: 201 });
}
