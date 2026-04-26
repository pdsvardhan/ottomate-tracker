// /api/projects/[slug]/flows/[id]/links/pages/[pageId] — link/unlink (M:N flow_pages)

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from '@/lib/api';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string; pageId: string }>; }

export async function PUT(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, id, pageId } = await params;
  const db = await getDb();
  const flow = db.select({ id: schema.flows.id }).from(schema.flows)
    .where(and(eq(schema.flows.id, id), eq(schema.flows.project_slug, slug))).get();
  if (!flow) return notFound(`Flow '${id}' not in '${slug}'`);
  const page = db.select({ id: schema.pages.id }).from(schema.pages)
    .where(and(eq(schema.pages.id, pageId), eq(schema.pages.project_slug, slug))).get();
  if (!page) return notFound(`Page '${pageId}' not in '${slug}'`);
  try {
    db.insert(schema.flow_pages).values({ flow_id: id, page_id: pageId }).run();
  } catch (err) {
    const msg = String(err);
    if (!msg.includes('UNIQUE') && !msg.includes('PRIMARY KEY')) throw err;
  }
  return NextResponse.json({ flow_id: id, page_id: pageId, linked: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { id, pageId } = await params;
  const db = await getDb();
  db.delete(schema.flow_pages).where(and(
    eq(schema.flow_pages.flow_id, id),
    eq(schema.flow_pages.page_id, pageId),
  )).run();
  return NextResponse.json({ flow_id: id, page_id: pageId, linked: false });
}
