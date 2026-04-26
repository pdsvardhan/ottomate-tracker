// /api/projects/[slug]/pages/[id]/entry-points — list + create

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { EntryPointCreateSchema } from '@/lib/validation/pages';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const items = db.select().from(schema.page_entry_points)
    .where(eq(schema.page_entry_points.page_id, id))
    .orderBy(asc(schema.page_entry_points.id)).all();
  return NextResponse.json({ entry_points: items });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, EntryPointCreateSchema);
  if (!result.ok) return result.res;
  const { slug, id } = await params;
  const db = await getDb();
  const page = db.select({ id: schema.pages.id }).from(schema.pages)
    .where(and(eq(schema.pages.id, id), eq(schema.pages.project_slug, slug))).get();
  if (!page) return notFound(`Page '${id}' not found in '${slug}'`);
  const inserted = db.insert(schema.page_entry_points).values({ ...result.data, page_id: id }).returning().get();
  return NextResponse.json({ entry_point: inserted }, { status: 201 });
}
