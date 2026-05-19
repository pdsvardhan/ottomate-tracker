// /api/component-feedback — per-project verdicts on master_components.
// GET ?mc_id=&project_slug= — return existing feedback rows.
// POST — record a new verdict.

import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const FeedbackSchema = z.object({
  project_slug: z.string().min(1).max(80),
  mc_id: z.string().min(1).max(80),
  verdict: z.enum(['good', 'bad', 'needs-fix', 'classification-wrong']),
  note: z.string().max(500).nullish(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mc_id = url.searchParams.get('mc_id');
  const project_slug = url.searchParams.get('project_slug');
  const db = await getDb();

  const conditions = [];
  if (mc_id) conditions.push(eq(schema.component_feedback.mc_id, mc_id));
  if (project_slug) conditions.push(eq(schema.component_feedback.project_slug, project_slug));

  const rows = db.select().from(schema.component_feedback)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.component_feedback.created_at))
    .all();
  return NextResponse.json({ count: rows.length, feedback: rows });
}

export async function POST(req: Request) {
  const result = await readAuthBody(req, FeedbackSchema);
  if (!result.ok) return result.res;
  const db = await getDb();

  // Validate refs exist.
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, result.data.project_slug)).get();
  if (!project) return notFound(`Project '${result.data.project_slug}' not found`);
  const mc = db.select({ id: schema.master_components.id }).from(schema.master_components)
    .where(eq(schema.master_components.id, result.data.mc_id)).get();
  if (!mc) return notFound(`master_component '${result.data.mc_id}' not found`);

  db.insert(schema.component_feedback).values({
    project_slug: result.data.project_slug,
    mc_id: result.data.mc_id,
    verdict: result.data.verdict,
    note: result.data.note ?? null,
  }).run();

  const latest = db.select().from(schema.component_feedback)
    .where(and(
      eq(schema.component_feedback.project_slug, result.data.project_slug),
      eq(schema.component_feedback.mc_id, result.data.mc_id),
    ))
    .orderBy(desc(schema.component_feedback.created_at))
    .limit(1).get();
  return NextResponse.json({ feedback: latest }, { status: 201 });
}
