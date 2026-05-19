// /api/components/[id]/pick — record a Stage 2.4 component pick (or skip-with-reason).

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const PickSchema = z.object({
  asset_library_ref: z.string().min(1).max(80).nullish(),
  picked_variant: z.string().max(80).nullish(),
  skip_reason: z.string().max(500).nullish(),
}).refine((data) => Boolean(data.asset_library_ref) !== Boolean(data.skip_reason), {
  message: 'Provide either asset_library_ref OR skip_reason — not both, not neither.',
});

interface Ctx { params: Promise<{ id: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, PickSchema);
  if (!result.ok) return result.res;

  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');

  const db = await getDb();
  const component = db.select().from(schema.components).where(eq(schema.components.id, idNum)).get();
  if (!component) return notFound(`Component ${idNum} not found`);

  if (result.data.asset_library_ref) {
    // Validate the master_component exists.
    const mc = db.select({ id: schema.master_components.id }).from(schema.master_components)
      .where(eq(schema.master_components.id, result.data.asset_library_ref)).get();
    if (!mc) return notFound(`master_component '${result.data.asset_library_ref}' not in catalog`);

    db.update(schema.components).set({
      picked: true,
      asset_library_ref: result.data.asset_library_ref,
      picked_variant: result.data.picked_variant ?? null,
      picked_at: new Date().toISOString(),
      skip_reason: null,
      current_phase: 'PICKED',
    }).where(eq(schema.components.id, idNum)).run();
  } else {
    // Skip with reason.
    db.update(schema.components).set({
      picked: false,
      asset_library_ref: null,
      picked_variant: null,
      picked_at: null,
      skip_reason: result.data.skip_reason,
      current_phase: 'SKIPPED',
    }).where(eq(schema.components.id, idNum)).run();
  }

  const updated = db.select().from(schema.components).where(eq(schema.components.id, idNum)).get();
  return NextResponse.json({ component: updated });
}
