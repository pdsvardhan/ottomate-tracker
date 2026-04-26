// /api/projects/[slug]/flows/[id] — detail + patch + delete

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { FlowPatchSchema } from '@/lib/validation/flows';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const db = await getDb();
  const flow = db
    .select()
    .from(schema.flows)
    .where(and(eq(schema.flows.id, id), eq(schema.flows.project_slug, slug)))
    .get();
  if (!flow) return notFound(`Flow '${id}' not found in '${slug}'`);

  const steps = db
    .select()
    .from(schema.flow_steps)
    .where(eq(schema.flow_steps.flow_id, id))
    .orderBy(asc(schema.flow_steps.sort_order))
    .all();
  const pre_conditions = db
    .select()
    .from(schema.flow_pre_conditions)
    .where(eq(schema.flow_pre_conditions.flow_id, id))
    .orderBy(asc(schema.flow_pre_conditions.sort_order))
    .all();
  const edge_cases = db
    .select()
    .from(schema.flow_edge_cases)
    .where(eq(schema.flow_edge_cases.flow_id, id))
    .orderBy(asc(schema.flow_edge_cases.sort_order))
    .all();

  return NextResponse.json({ flow, steps, pre_conditions, edge_cases });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, FlowPatchSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.flows.id }).from(schema.flows)
    .where(and(eq(schema.flows.id, id), eq(schema.flows.project_slug, slug))).get();
  if (!existing) return notFound(`Flow '${id}' not found in '${slug}'`);

  const updates = { ...result.data, updated_at: new Date() };
  db.update(schema.flows).set(updates).where(eq(schema.flows.id, id)).run();
  const updated = db.select().from(schema.flows).where(eq(schema.flows.id, id)).get();
  return NextResponse.json({ flow: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.flows.id }).from(schema.flows)
    .where(and(eq(schema.flows.id, id), eq(schema.flows.project_slug, slug))).get();
  if (!existing) return notFound(`Flow '${id}' not found in '${slug}'`);
  db.delete(schema.flows).where(eq(schema.flows.id, id)).run();
  return NextResponse.json({ deleted: id });
}
