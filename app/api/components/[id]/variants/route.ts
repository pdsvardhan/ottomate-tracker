// /api/components/[id]/variants — list + create

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { VariantCreateSchema } from '@/lib/validation/pages';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const items = db.select().from(schema.component_variants)
    .where(eq(schema.component_variants.component_id, idNum))
    .orderBy(asc(schema.component_variants.sort_order)).all();
  return NextResponse.json({ variants: items });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, VariantCreateSchema);
  if (!result.ok) return result.res;
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const component = db.select({ id: schema.components.id }).from(schema.components)
    .where(eq(schema.components.id, idNum)).get();
  if (!component) return notFound(`Component ${idNum} not found`);
  const inserted = db.insert(schema.component_variants)
    .values({ ...result.data, component_id: idNum }).returning().get();
  return NextResponse.json({ variant: inserted }, { status: 201 });
}
