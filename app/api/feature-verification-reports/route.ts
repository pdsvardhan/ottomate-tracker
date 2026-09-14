// /api/feature-verification-reports — persist a FEATURE-verifier verdict (Task 3).
//
// Sibling to /api/verification-reports (the CODE verifier). The code verifier proves
// the code; the feature verifier drives the REAL running app via Playwright, feeds it
// real + nasty inputs, and asserts user-visible outcomes + SYSTEM STATE with evidence.
// This is the rich sink: it stores the case×outcome matrix + evidence paths + the gate
// verdict (APPROVE/BLOCK/ITERATE, same vocabulary as the code verifier).
//
// Reuse boundary: per-flow pass/fail is ALSO written to flow_test_runs (ran_by
// 'automated') via POST /api/flows/[id]/test so the Stage-3→deploy gate consumes it,
// and the CI subset to POST /api/test-runs. This endpoint owns only the rich report.
// Bearer required (mutation). Unlike the code-verifier endpoint, both target_kinds are
// accepted here directly — there is no second writer to duplicate against.
//
// Report identity (2026-09-15, to-do #887): the row this POST works with downstream —
// the 201 body AND the report id stamped into feature_claims by the P3-B reconcile —
// used to be re-derived from `target_id` + the newest `ran_at`. Second-granular
// timestamps made two reports for one target in one second indistinguishable, and the
// filter omitted project_slug, so the row picked up could be an older one, a different
// verdict, or another project's entirely. It is now the row the INSERT returned. See the
// comment at the insert for the measurement.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, getRawSqlite, schema } from '@/lib/db/client';
import { readAuthBody } from '@/lib/api';
import { reconcileClaimsForFlow } from '@/lib/claim-reconcile';

export const runtime = 'nodejs';

const CaseSchema = z.object({
  case: z.string(),
  variant: z.string().optional(),
  axis: z.string().optional(),           // the decision/axis this case isolates
  inputs: z.unknown().optional(),
  action_log: z.unknown().optional(),
  system_state: z.unknown().optional(),  // the asserted real effect (fs/DB/downstream values)
  outcome: z.enum(['pass', 'fail', 'warn', 'skipped']),
  evidence: z.unknown().optional(),      // { trace, video, screenshot, network, console }
  judge_verdict: z.unknown().optional(), // advisory AI-judge cell + the evidence it saw
}).passthrough();

// 2026-08-11: commit_sha was `z.string().optional()`, so rows accumulated in two shapes —
// 40-hex and 7-char abbreviations — while the deploy gate compared them with `=`. A report
// stored short could never satisfy a full-sha gate query, which read as "never verified"
// rather than "format mismatch". Writes are now pinned to the full 40-hex form (a caller
// always has it: `git rev-parse HEAD`), and the gate resolves prefixes on read.
const CommitShaSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[0-9a-f]{40}$/, 'commit_sha must be the full 40-hex sha (use `git rev-parse HEAD`)');

const ReportCreateSchema = z.object({
  project_slug: z.string().min(1),
  target_kind: z.enum(['stage-3-feature', 'stage-4-iteration-item', 'flow']).default('stage-3-feature'),
  target_id: z.string().min(1),
  verifier_session_id: z.string().min(1),
  commit_sha: CommitShaSchema.optional(),
  recommendation_overall: z.enum(['APPROVE', 'BLOCK', 'ITERATE']),
  recommendation_reason: z.string().optional(),
  risk_policy: z.enum(['block', 'warn']).optional(),
  mandatory_user_review: z.boolean().optional(),
  case_matrix: z.array(CaseSchema).optional(),
  evidence_root: z.string().optional(),
  full_report: z.unknown().optional(),
});

// GET /api/feature-verification-reports?project_slug=&target_id=&latest=1&limit=
export async function GET(req: Request) {
  const url = new URL(req.url);
  const project_slug = url.searchParams.get('project_slug');
  const target_id = url.searchParams.get('target_id');
  const latest = url.searchParams.get('latest') === '1';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
  const db = await getDb();
  const conds = [];
  if (project_slug) conds.push(eq(schema.feature_verification_reports.project_slug, project_slug));
  if (target_id) conds.push(eq(schema.feature_verification_reports.target_id, target_id));
  const rows = db
    .select()
    .from(schema.feature_verification_reports)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.feature_verification_reports.ran_at))
    .limit(latest ? 1 : limit)
    .all();
  if (latest) return NextResponse.json({ report: rows[0] ?? null });
  return NextResponse.json({ reports: rows, count: rows.length });
}

// POST /api/feature-verification-reports — bearer required.
export async function POST(req: Request) {
  const parsed = await readAuthBody(req, ReportCreateSchema);
  if (!parsed.ok) return parsed.res;
  const data = parsed.data;

  const db = await getDb();
  const proj = db
    .select({ slug: schema.projects.slug, verify_gate: schema.projects.verify_gate })
    .from(schema.projects)
    .where(eq(schema.projects.slug, data.project_slug))
    .get();
  if (!proj) return NextResponse.json({ error: `project '${data.project_slug}' not found` }, { status: 404 });

  // ── target_id must name a FLOW (owner ruling, 2026-08-11) ──────────────────────────────
  // The deploy gate resolves per (feature × linked flow) and matches r.target_id against the
  // FLOW id. Reports were arriving with three different conventions — flow ids, feature ids
  // (run-matrix posts `m.feature`) and bare iteration numbers — so most APPROVEs were simply
  // invisible to the gate while looking perfectly healthy in the table. Keying on the feature
  // instead was rejected: one APPROVE would then clear a feature whose other flows were never
  // driven, which is the exact failure the gate exists to catch.
  //
  // Enforcement is ramped on verify_gate, matching how the anti-gaslight rules already ramp:
  // where a gate is live the wrong id is a silent hole, so refuse it; where it is 'off' the
  // report is a record and refusing would break existing harnesses (mapsofbharat has 46 rows
  // in the older shapes) — so warn instead and let it through.
  const gate = proj.verify_gate ?? 'off';
  let target_warning: string | null = null;
  if (data.target_kind === 'stage-3-feature' || data.target_kind === 'flow') {
    const flow = db
      .select({ id: schema.flows.id })
      .from(schema.flows)
      .where(and(eq(schema.flows.id, data.target_id), eq(schema.flows.project_slug, data.project_slug)))
      .get();
    if (!flow) {
      const msg =
        `target_id '${data.target_id}' is not a flow in '${data.project_slug}'. ` +
        `target_kind='${data.target_kind}' reports are keyed on the FLOW id — the deploy gate ` +
        `matches feature_verification_reports.target_id against flows linked to the feature.`;
      if (gate !== 'off') return NextResponse.json({ error: msg }, { status: 422 });
      target_warning = msg + ` Accepted because '${data.project_slug}' has verify_gate='off'.`;
    }
  }

  // Derive headline counts from the matrix (source of truth) so they can't disagree.
  const matrix = data.case_matrix ?? [];
  const total = matrix.length;
  const passed = matrix.filter((c) => c.outcome === 'pass').length;
  const failed = matrix.filter((c) => c.outcome === 'fail').length;
  const warned = matrix.filter((c) => c.outcome === 'warn').length;

  // `created` is the row the INSERT itself returned, not a row re-found afterwards.
  //
  // Until 2026-09-15 (to-do #887) this ran the insert with .run() and then re-derived
  // "the row I just wrote" as `WHERE target_id = ? ORDER BY ran_at DESC LIMIT 1`.
  // ran_at is second-granular (`integer(... mode: 'timestamp' ).default(unixepoch())`),
  // so two reports for one target inside the same second are indistinguishable to that
  // ordering and the tie surfaced the EARLIER row. The WHERE also omitted project_slug,
  // so the row that won the tie did not even have to belong to the posting project.
  //
  // Measured on the live container 2026-09-15, both inside epoch second 1789417012:
  //   · same flow target — POST 2 stored id 492 / APPROVE, `created` came back id 491 /
  //     BLOCK (the first write's row, session zz-probe-887-FIRST).
  //   · cross-project — POST 4 stored id 494 in zz-probe-887b, `created` came back id
  //     493 / BLOCK belonging to zz-probe-887, project_slug and all.
  //
  // This route is the reason that matters more here than in the code-verifier sibling
  // (#869, commit 9310dcc), where the wrong row stopped at the response body. Here
  // `created.id` is ALSO handed to the P3-B claim reconcile below, which stamps it into
  // feature_claims.reconciler_id — stored state. In the measurement above, claim 247 was
  // flipped to reconciled_with='verified' with reconciler_id=491, a BLOCK report, by an
  // APPROVE that was actually stored as 492. And reconcileClaimsForFlow only ever looks
  // at claims still marked 'unreconciled', so a later correct APPROVE does not repair the
  // attribution: the wrong provenance is permanent once written.
  //
  // The insert is what knows its own identity, so nothing downstream should have to work
  // it out again. .returning() carries the id, the DB-assigned ran_at and the stored
  // values back out of the same statement that produced them. That removes the derivation
  // rather than narrowing it: a finer timestamp, ORDER BY id DESC, or an added
  // project_slug filter would each keep a guess and only shrink the window in which it
  // can be wrong. Single-statement insert-and-return is already the house pattern for
  // verifier rows — POST /api/iterations/[id]/items/[itemId]/verifier-result writes its
  // verification_reports row with .returning().get() and hands the id straight on.
  const created = db
    .insert(schema.feature_verification_reports)
    .values({
      project_slug: data.project_slug,
      target_kind: data.target_kind,
      target_id: data.target_id,
      verifier_session_id: data.verifier_session_id,
      commit_sha: data.commit_sha ?? null,
      cases_total: total,
      cases_passed: passed,
      cases_failed: failed,
      cases_warned: warned,
      recommendation_overall: data.recommendation_overall,
      recommendation_reason: data.recommendation_reason ?? null,
      risk_policy: data.risk_policy ?? null,
      mandatory_user_review: data.mandatory_user_review ?? false,
      case_matrix: (data.case_matrix ?? null) as object | null,
      evidence_root: data.evidence_root ?? null,
      full_report: (data.full_report ?? null) as object | null,
    })
    .returning()
    .get();

  // P3-B: an APPROVE report is proof the flow passed → auto-reconcile the claim
  // ledger for every feature linked to this flow (target_id). Keyed on target_id
  // + APPROVE, never target_kind (reports in practice carry 'stage-3-feature').
  // Best-effort: a reconcile failure must not fail the (already-persisted) report.
  //
  // `created.id` lands in feature_claims.reconciler_id, so this is the consumer that
  // turns a misidentified row into stored state rather than a wrong response body —
  // and reconcileClaimsForFlow skips claims that are already reconciled, so a bad
  // attribution never gets corrected later. It is safe now only because `created` is
  // the INSERT's own returned row (#887); do not reintroduce a read-back here.
  let reconciled: Awaited<ReturnType<typeof reconcileClaimsForFlow>> | null = null;
  if (data.recommendation_overall === 'APPROVE' && created?.id != null) {
    try {
      const sqlite = await getRawSqlite();
      reconciled = reconcileClaimsForFlow(sqlite, data.target_id, created.id as number);
    } catch (err) {
      console.error('[ottomate] claim auto-reconcile failed (report persisted):', err);
    }
  }

  return NextResponse.json(
    target_warning ? { report: created, reconciled, warning: target_warning } : { report: created, reconciled },
    { status: 201 },
  );
}
