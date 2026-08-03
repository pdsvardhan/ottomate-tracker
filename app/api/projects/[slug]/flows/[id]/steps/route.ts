// /api/projects/[slug]/flows/[id]/steps — list (GET) + create (POST)

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { FlowStepCreateSchema } from '@/lib/validation/flows';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const steps = db.select().from(schema.flow_steps)
    .where(eq(schema.flow_steps.flow_id, id))
    .orderBy(asc(schema.flow_steps.sort_order)).all();
  return NextResponse.json({ steps });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, FlowStepCreateSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const db = await getDb();
  const flow = db.select({ id: schema.flows.id }).from(schema.flows)
    .where(and(eq(schema.flows.id, id), eq(schema.flows.project_slug, slug))).get();
  if (!flow) return notFound(`Flow '${id}' not found in '${slug}'`);

  const inserted = db.insert(schema.flow_steps).values({ ...result.data, flow_id: id }).returning().get();
  // A flow's spec changed when its steps change → bump the parent's updated_at
  // (so the D2 doc-gate sees the spec was touched).
  db.update(schema.flows).set({ updated_at: new Date() }).where(eq(schema.flows.id, id)).run();
  return NextResponse.json({ step: inserted }, { status: 201 });
}
