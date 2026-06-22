// /api/inspirations/[id] — single inspiration; GET returns it with matched
// master_components. PATCH / DELETE added iter-7 #63 (bearer-protected).

import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { InspirationPatchSchema } from '@/lib/validation/inspirations';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const inspiration = db.select().from(schema.inspirations)
    .where(eq(schema.inspirations.id, id)).get();
  if (!inspiration) return notFound(`Inspiration '${id}' not found`);

  const matchedIds = (inspiration.matched_master_component_ids ?? []) as string[];
  const matched = matchedIds.length > 0
    ? db.select().from(schema.master_components)
        .where(inArray(schema.master_components.id, matchedIds)).all()
    : [];

  return NextResponse.json({ inspiration, matched_components: matched });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, InspirationPatchSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.inspirations.id })
    .from(schema.inspirations)
    .where(eq(schema.inspirations.id, id)).get();
  if (!existing) return notFound(`Inspiration '${id}' not found`);

  db.update(schema.inspirations).set(result.data as Partial<typeof schema.inspirations.$inferInsert>)
    .where(eq(schema.inspirations.id, id)).run();
  const after = db.select().from(schema.inspirations)
    .where(eq(schema.inspirations.id, id)).get();
  return NextResponse.json({ inspiration: after });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id } = await params;
  const db = await getDb();
  const existing = db.select({ id: schema.inspirations.id })
    .from(schema.inspirations)
    .where(eq(schema.inspirations.id, id)).get();
  if (!existing) return notFound(`Inspiration '${id}' not found`);
  db.delete(schema.inspirations).where(eq(schema.inspirations.id, id)).run();
  return NextResponse.json({ deleted: id });
}
