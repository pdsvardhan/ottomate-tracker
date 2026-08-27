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
    /* #651 was filed as "a prematurely-resolved risk cannot be corrected via the API", because
     * this 409 looked like a dead end. It is not: refusing to re-resolve is deliberate — a second
     * resolve would silently overwrite the first resolution's summary and timestamp with no
     * record that it had ever said something else. The correction path exists and is PATCH, which
     * REQUIRES a correction_reason and preserves the original claim in notes.
     * The behaviour was right; the message was not saying so, which is why the gap kept getting
     * re-filed. It says so now. */
    return NextResponse.json({
      error: 'Already resolved — re-resolving would overwrite the existing resolution with no record of it.',
      correct_it_with: `PATCH /api/projects/${slug}/risk-instances/${idNum}`,
      correct_it_body: { resolution_summary: '<the corrected summary>', correction_reason: '<why the first one was wrong>' },
      note: 'correction_reason is mandatory and the previous summary, timestamp and status are appended to notes. Risks resolve, they are never deleted (operating rule 11).',
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
