// /api/projects/[slug]/adr-index/[id]/links/risks/[riskId]
// adr_risks: PK is adr_id alone. Either risk_instance_id or risk_type_id.
// PUT replaces (since adr_id is primary key alone).

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

const LinkSchema = z.object({
  kind: z.enum(['instance', 'type']),
});

interface Ctx { params: Promise<{ slug: string; id: string; riskId: string }>; }

export async function PUT(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, LinkSchema);
  if (!result.ok) return result.res;
  const { slug, id, riskId } = await params;
  const db = await getDb();
  const adr = db.select({ id: schema.adr_index.id }).from(schema.adr_index)
    .where(and(eq(schema.adr_index.id, id), eq(schema.adr_index.project_slug, slug))).get();
  if (!adr) return notFound(`Decision '${id}' not in '${slug}'`);

  if (result.data.kind === 'instance') {
    const idNum = Number(riskId);
    if (!Number.isInteger(idNum) || idNum <= 0) return badRequest('Invalid risk instance id');
    const ri = db.select({ id: schema.risk_instances.id }).from(schema.risk_instances)
      .where(and(eq(schema.risk_instances.id, idNum), eq(schema.risk_instances.project_slug, slug))).get();
    if (!ri) return notFound(`Risk instance ${idNum} not in '${slug}'`);
    db.delete(schema.adr_risks).where(eq(schema.adr_risks.adr_id, id)).run();
    db.insert(schema.adr_risks).values({ adr_id: id, risk_instance_id: idNum }).run();
    return NextResponse.json({ adr_id: id, risk_instance_id: idNum, linked: true });
  }
  // risk_type_id
  const catalog = db.select({ id: schema.risks_catalog.id }).from(schema.risks_catalog)
    .where(eq(schema.risks_catalog.id, riskId)).get();
  if (!catalog) return notFound(`Risk type '${riskId}' not in catalog`);
  db.delete(schema.adr_risks).where(eq(schema.adr_risks.adr_id, id)).run();
  db.insert(schema.adr_risks).values({ adr_id: id, risk_type_id: riskId }).run();
  return NextResponse.json({ adr_id: id, risk_type_id: riskId, linked: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id } = await params;
  const db = await getDb();
  db.delete(schema.adr_risks).where(eq(schema.adr_risks.adr_id, id)).run();
  return NextResponse.json({ adr_id: id, linked: false });
}
