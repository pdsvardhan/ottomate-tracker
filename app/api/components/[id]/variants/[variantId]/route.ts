// /api/components/[id]/variants/[variantId] — patch + delete

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { VariantPatchSchema } from '@/lib/validation/pages';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string; variantId: string }>; }

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, VariantPatchSchema);
  if (!result.ok) return result.res;
  const { variantId } = await params;
  const idNum = parseIntId(variantId);
  if (idNum === null) return badRequest('Invalid variantId');
  const db = await getDb();
  const existing = db.select({ id: schema.component_variants.id }).from(schema.component_variants)
    .where(eq(schema.component_variants.id, idNum)).get();
  if (!existing) return notFound(`Variant ${idNum} not found`);
  db.update(schema.component_variants).set(result.data).where(eq(schema.component_variants.id, idNum)).run();
  const updated = db.select().from(schema.component_variants).where(eq(schema.component_variants.id, idNum)).get();
  return NextResponse.json({ variant: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { variantId } = await params;
  const idNum = parseIntId(variantId);
  if (idNum === null) return badRequest('Invalid variantId');
  const db = await getDb();
  db.delete(schema.component_variants).where(eq(schema.component_variants.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
