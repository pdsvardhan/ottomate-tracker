// /api/projects/[slug]/flows/[id]/edge-cases — list (GET) + create (POST)

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { FlowSubItemCreateSchema } from '@/lib/validation/flows';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const items = db.select().from(schema.flow_edge_cases)
    .where(eq(schema.flow_edge_cases.flow_id, id))
    .orderBy(asc(schema.flow_edge_cases.sort_order)).all();
  return NextResponse.json({ edge_cases: items });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, FlowSubItemCreateSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const db = await getDb();
  const flow = db.select({ id: schema.flows.id }).from(schema.flows)
    .where(and(eq(schema.flows.id, id), eq(schema.flows.project_slug, slug))).get();
  if (!flow) return notFound(`Flow '${id}' not found in '${slug}'`);
  const inserted = db.insert(schema.flow_edge_cases).values({ ...result.data, flow_id: id }).returning().get();
  return NextResponse.json({ edge_case: inserted }, { status: 201 });
}
