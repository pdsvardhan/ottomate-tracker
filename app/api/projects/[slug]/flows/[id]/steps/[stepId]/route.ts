// /api/projects/[slug]/flows/[id]/steps/[stepId] — patch + delete

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { FlowStepPatchSchema } from '@/lib/validation/flows';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string; stepId: string }>; }

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, FlowStepPatchSchema);
  if (!result.ok) return result.res;
  const { id, stepId } = await params;
  const stepIdNum = parseIntId(stepId);
  if (stepIdNum === null) return badRequest('Invalid stepId');
  const db = await getDb();
  const existing = db.select({ id: schema.flow_steps.id }).from(schema.flow_steps)
    .where(and(eq(schema.flow_steps.id, stepIdNum), eq(schema.flow_steps.flow_id, id))).get();
  if (!existing) return notFound(`Step ${stepIdNum} not found for flow '${id}'`);
  db.update(schema.flow_steps).set(result.data).where(eq(schema.flow_steps.id, stepIdNum)).run();
  const updated = db.select().from(schema.flow_steps).where(eq(schema.flow_steps.id, stepIdNum)).get();
  return NextResponse.json({ step: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id, stepId } = await params;
  const stepIdNum = parseIntId(stepId);
  if (stepIdNum === null) return badRequest('Invalid stepId');
  const db = await getDb();
  const existing = db.select({ id: schema.flow_steps.id }).from(schema.flow_steps)
    .where(and(eq(schema.flow_steps.id, stepIdNum), eq(schema.flow_steps.flow_id, id))).get();
  if (!existing) return notFound(`Step ${stepIdNum} not found for flow '${id}'`);
  db.delete(schema.flow_steps).where(eq(schema.flow_steps.id, stepIdNum)).run();
  return NextResponse.json({ deleted: stepIdNum });
}
