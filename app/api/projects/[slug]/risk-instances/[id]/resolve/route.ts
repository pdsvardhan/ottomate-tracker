// /api/projects/[slug]/risk-instances/[id]/resolve — POST
// Codex P1 #10: marks status='resolved', stamps resolved_at, hides by default.
// Preserves history; the right way to "remove" a risk.

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, readAuthBody } from '@/lib/api';
import { RiskResolveSchema } from '@/lib/validation/risks';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, RiskResolveSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const idNum = parseInt(id, 10);
  if (!Number.isInteger(idNum) || idNum <= 0) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select().from(schema.risk_instances)
    .where(and(eq(schema.risk_instances.id, idNum), eq(schema.risk_instances.project_slug, slug))).get();
  if (!existing) return notFound(`Risk instance ${idNum} not found in '${slug}'`);
  if (existing.status === 'resolved') {
    return NextResponse.json({
      error: 'Already resolved',
      risk_instance: existing,
    }, { status: 409 });
  }
  db.update(schema.risk_instances)
    .set({
      status: 'resolved',
      resolved_at: new Date(),
      resolution_summary: result.data.resolution_summary,
      hidden_by_default: true,
    })
    .where(eq(schema.risk_instances.id, idNum)).run();
  const after = db.select().from(schema.risk_instances).where(eq(schema.risk_instances.id, idNum)).get();
  return NextResponse.json({ risk_instance: after });
}
