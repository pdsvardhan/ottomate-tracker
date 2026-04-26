// /api/projects/[slug]/third-party-services/[id] — patch + delete

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { ThirdPartyServicePatchSchema } from '@/lib/validation/risks';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function PATCH(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, ThirdPartyServicePatchSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select({ id: schema.third_party_services.id }).from(schema.third_party_services)
    .where(and(
      eq(schema.third_party_services.id, idNum),
      eq(schema.third_party_services.project_slug, slug),
    )).get();
  if (!existing) return notFound(`Third-party service ${idNum} not found in '${slug}'`);
  db.update(schema.third_party_services).set(result.data).where(eq(schema.third_party_services.id, idNum)).run();
  const updated = db.select().from(schema.third_party_services).where(eq(schema.third_party_services.id, idNum)).get();
  return NextResponse.json({ third_party_service: updated });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');
  const db = await getDb();
  const existing = db.select({ id: schema.third_party_services.id }).from(schema.third_party_services)
    .where(and(
      eq(schema.third_party_services.id, idNum),
      eq(schema.third_party_services.project_slug, slug),
    )).get();
  if (!existing) return notFound(`Third-party service ${idNum} not found in '${slug}'`);
  db.delete(schema.third_party_services).where(eq(schema.third_party_services.id, idNum)).run();
  return NextResponse.json({ deleted: idNum });
}
