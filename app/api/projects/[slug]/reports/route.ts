// /api/projects/[slug]/reports — list + submit report
// R8.4 — reports stay status='pending' until /classify is called manually.

import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { ReportCreateSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const db = await getDb();
  const all = db.select().from(schema.reports)
    .where(eq(schema.reports.project_slug, slug))
    .orderBy(desc(schema.reports.submitted_at)).all();
  const filtered = status ? all.filter((r) => r.status === status) : all;
  return NextResponse.json({ reports: filtered });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, ReportCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);
  const inserted = db.insert(schema.reports)
    .values({ ...result.data, project_slug: slug }).returning().get();
  return NextResponse.json({ report: inserted }, { status: 201 });
}
