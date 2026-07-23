// /api/projects/[slug]/design-decisions — Task 2 per-target design ledger.
//
// The blob (ui_master_plans.design_ledger) keeps loose context: audience profile,
// worklist, constraint contract. Per-decision records live here so three questions are
// answerable by INDEX rather than by re-parsing a blob:
//   what is still open on this target?   ?status=proposed,in-review&target_id=
//   what did we already reject here?     ?target_id=  -> rows carry rejected[]
//   what depended on the old profile?    ?profile_at_decision=P2   (the graduation query)
// GET is open (same as the other read endpoints); POST requires bearer.
// rationale is DELIBERATELY UNCAPPED — the 300-char limit is project_todos.title.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const STATUSES = ['proposed', 'in-review', 'locked', 'rejected', 'superseded'] as const;

const DecisionCreateSchema = z.object({
  target_id: z.string().min(1),
  target_kind: z.enum(['component', 'cluster', 'page', 'site', 'foundation']).optional(),
  axis: z.string().min(1),
  status: z.enum(STATUSES).default('proposed'),
  rung: z.number().int().min(0).max(5).optional(),
  round: z.number().int().min(1).optional(),
  variants_shown: z.unknown().optional(),
  chosen_value: z.string().optional(),
  mixed_from: z.unknown().optional(),
  rejected: z.unknown().optional(),
  rationale: z.string().optional(),          // no .max() — uncapped by design
  constraints_applied: z.unknown().optional(),
  profile_at_decision: z.string().optional(),
  snapshot: z.string().optional(),
  preview_url: z.string().optional(),
  confirmed: z.boolean().optional(),
  confirmation_text_shown: z.string().optional(),
  session_id: z.string().optional(),
  supersedes: z.number().int().optional(),
});

// GET /api/projects/<slug>/design-decisions?status=&target_id=&axis=&profile_at_decision=&limit=
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const target_id = url.searchParams.get('target_id');
  const axis = url.searchParams.get('axis');
  const profile = url.searchParams.get('profile_at_decision');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10) || 200, 500);

  const db = await getDb();
  const t = schema.design_decisions;
  const conds = [eq(t.project_slug, slug)];
  if (status) {
    const wanted = status.split(',').map((s) => s.trim()).filter((s): s is typeof STATUSES[number] =>
      (STATUSES as readonly string[]).includes(s));
    if (wanted.length) conds.push(inArray(t.status, wanted));
  }
  if (target_id) conds.push(eq(t.target_id, target_id));
  if (axis) conds.push(eq(t.axis, axis));
  if (profile) conds.push(eq(t.profile_at_decision, profile));

  const rows = db.select().from(t).where(and(...conds)).orderBy(desc(t.updated_at)).limit(limit).all();
  const open = rows.filter((r) => r.status === 'proposed' || r.status === 'in-review').length;
  const locked = rows.filter((r) => r.status === 'locked').length;
  return NextResponse.json({ decisions: rows, count: rows.length, open, locked });
}

// POST /api/projects/<slug>/design-decisions — bearer required.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const parsed = await readAuthBody(req, DecisionCreateSchema);
  if (!parsed.ok) return parsed.res;
  const d = parsed.data;

  const db = await getDb();
  const proj = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!proj) return NextResponse.json({ error: `project '${slug}' not found` }, { status: 404 });

  const row = db.insert(schema.design_decisions).values({
    project_slug: slug,
    target_id: d.target_id,
    target_kind: d.target_kind ?? null,
    axis: d.axis,
    status: d.status,
    rung: d.rung ?? null,
    round: d.round ?? 1,
    variants_shown: (d.variants_shown ?? null) as object | null,
    chosen_value: d.chosen_value ?? null,
    mixed_from: (d.mixed_from ?? null) as object | null,
    rejected: (d.rejected ?? null) as object | null,
    rationale: d.rationale ?? null,
    constraints_applied: (d.constraints_applied ?? null) as object | null,
    profile_at_decision: d.profile_at_decision ?? null,
    snapshot: d.snapshot ?? null,
    preview_url: d.preview_url ?? null,
    confirmed: d.confirmed ?? false,
    confirmation_text_shown: d.confirmation_text_shown ?? null,
    session_id: d.session_id ?? null,
    supersedes: d.supersedes ?? null,
  }).returning().get();

  // A supersede is a two-sided link, so history stays walkable from either end.
  if (d.supersedes) {
    db.update(schema.design_decisions)
      .set({ superseded_by: row.id, status: 'superseded', updated_at: new Date() })
      .where(eq(schema.design_decisions.id, d.supersedes)).run();
  }
  return NextResponse.json({ decision: row }, { status: 201 });
}
