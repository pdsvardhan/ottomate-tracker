// /api/projects/[slug]/secrets/[id] — patch + delete

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { SecretPatchSchema } from '@/lib/validation/risks';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, SecretPatchSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select({ id: schema.project_secrets.id }).from(schema.project_secrets)
    .where(and(eq(schema.project_secrets.id, idNum), eq(schema.project_secrets.project_slug, slug))).get();
  if (!existing) return notFound(`Secret ${idNum} not found in '${slug}'`);
  db.update(schema.project_secrets).set(result.data).where(eq(schema.project_secrets.id, idNum)).run();
  const updated = db.select().from(schema.project_secrets).where(eq(schema.project_secrets.id, idNum)).get();
  return NextResponse.json({ secret: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select({ id: schema.project_secrets.id }).from(schema.project_secrets)
    .where(and(eq(schema.project_secrets.id, idNum), eq(schema.project_secrets.project_slug, slug))).get();
  if (!existing) return notFound(`Secret ${idNum} not found in '${slug}'`);
  db.delete(schema.project_secrets).where(eq(schema.project_secrets.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
