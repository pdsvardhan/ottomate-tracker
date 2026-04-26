// /api/projects/[slug]/risk-instances/[id]/links/pages/[pageId]

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId } from '@/lib/api';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string; pageId: string }>; }

export async function PUT(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id, pageId } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid risk instance id');
  const db = await getDb();
  const ri = db.select({ id: schema.risk_instances.id }).from(schema.risk_instances)
    .where(and(eq(schema.risk_instances.id, idNum), eq(schema.risk_instances.project_slug, slug))).get();
  if (!ri) return notFound(`Risk instance ${idNum} not in '${slug}'`);
  const page = db.select({ id: schema.pages.id }).from(schema.pages)
    .where(and(eq(schema.pages.id, pageId), eq(schema.pages.project_slug, slug))).get();
  if (!page) return notFound(`Page '${pageId}' not in '${slug}'`);
  try {
    db.insert(schema.risk_instance_pages).values({ risk_instance_id: idNum, page_id: pageId }).run();
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('UNIQUE') && !msg.includes('PRIMARY KEY')) throw err;
  }
  return NextResponse.json({ risk_instance_id: idNum, page_id: pageId, linked: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id, pageId } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid risk instance id');
  const db = await getDb();
  db.delete(schema.risk_instance_pages).where(and(
    eq(schema.risk_instance_pages.risk_instance_id, idNum),
    eq(schema.risk_instance_pages.page_id, pageId),
  )).run();
  return NextResponse.json({ risk_instance_id: idNum, page_id: pageId, linked: false });
}
