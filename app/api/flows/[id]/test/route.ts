// /api/flows/[id]/test — record a flow_test_runs row (E.9).

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { recomputeFeaturesForFlow } from '@/lib/feature-rollup';

export const runtime = 'nodejs';

const RecordSchema = z.object({
  status: z.enum(['passing', 'failing', 'not-tested']),
  notes: z.string().max(500).nullish(),
  ran_by: z.enum(['user', 'automated']).default('user'),
});

interface Ctx { params: Promise<{ id: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, RecordSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const db = await getDb();
  const flow = db.select().from(schema.flows).where(eq(schema.flows.id, id)).get();
  if (!flow) return notFound(`Flow '${id}' not found`);

  db.insert(schema.flow_test_runs).values({
    flow_id: id,
    status: result.data.status,
    notes: result.data.notes ?? null,
    ran_by: result.data.ran_by,
  }).run();

  // Also update the flow's test_status snapshot for fast read.
  db.update(schema.flows).set({
    test_status: result.data.status,
    last_tested_date: new Date(),
  }).where(eq(schema.flows.id, id)).run();

  // Roll the result up to any linked features (feature.test_status = AND of its
  // flows). The documented "derived from linked flows" rule, now actually computed.
  recomputeFeaturesForFlow(db, id);

  const latest = db.select().from(schema.flows).where(eq(schema.flows.id, id)).get();
  return NextResponse.json({ flow: latest });
}
