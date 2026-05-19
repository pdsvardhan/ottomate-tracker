// /api/inspirations/[id] — single inspiration with its matched master_components.

import { NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from '@/lib/api';

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
