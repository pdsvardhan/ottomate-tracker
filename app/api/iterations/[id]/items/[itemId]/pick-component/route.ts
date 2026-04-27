// /api/iterations/[id]/items/[itemId]/pick-component — user picks a master_component
// for this iteration item. Stored in iteration_items.proposed_change JSON.

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { PickComponentSchema } from '@/lib/validation/master-components';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string; itemId: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, PickComponentSchema);
  if (!result.ok) return result.res;
  const { id, itemId } = await params;
  const itrId = parseIntId(id);
  const itmId = parseIntId(itemId);
  if (itrId === null || itmId === null) return badRequest('Invalid id');

  const db = await getDb();
  const item = db.select().from(schema.iteration_items)
    .where(and(
      eq(schema.iteration_items.id, itmId),
      eq(schema.iteration_items.iteration_id, itrId),
    )).get();
  if (!item) return notFound(`Item ${itmId} not in iteration ${itrId}`);

  const component = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, result.data.component_id)).get();
  if (!component) return notFound(`Component '${result.data.component_id}' not in catalog`);

  // Merge into existing proposed_change (preserve any other planning data).
  const existingProposed = (item.proposed_change ?? {}) as Record<string, unknown>;
  const newProposed = {
    ...existingProposed,
    picked_component: {
      component_id: component.id,
      component_name: component.name,
      variant_name: result.data.variant_name ?? null,
      framework_tags: component.framework_tags ?? null,
      picked_at: new Date().toISOString(),
      notes: result.data.notes ?? null,
    },
  };

  db.update(schema.iteration_items).set({
    proposed_change: newProposed,
    user_edited: true,
  }).where(eq(schema.iteration_items.id, itmId)).run();

  const updated = db.select().from(schema.iteration_items)
    .where(eq(schema.iteration_items.id, itmId)).get();
  return NextResponse.json({ item: updated, picked_component: component });
}
