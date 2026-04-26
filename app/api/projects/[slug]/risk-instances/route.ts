// /api/projects/[slug]/risk-instances — list + create
// Codex P1 #10: resolved instances hidden by default unless ?include_resolved=true.

import { NextResponse } from 'next/server';
import { and, desc, eq, ne } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { RiskInstanceCreateSchema } from '@/lib/validation/risks';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const url = new URL(req.url);
  const includeResolved = url.searchParams.get('include_resolved') === 'true';
  const db = await getDb();
  const where = includeResolved
    ? eq(schema.risk_instances.project_slug, slug)
    : and(
        eq(schema.risk_instances.project_slug, slug),
        ne(schema.risk_instances.status, 'resolved'),
      );
  const instances = db.select().from(schema.risk_instances)
    .where(where)
    .orderBy(desc(schema.risk_instances.created_at)).all();
  return NextResponse.json({ risk_instances: instances });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, RiskInstanceCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);
  const catalog = db.select({ id: schema.risks_catalog.id }).from(schema.risks_catalog)
    .where(eq(schema.risks_catalog.id, result.data.risk_type_id)).get();
  if (!catalog) return notFound(`Risk type '${result.data.risk_type_id}' not in catalog`);
  const inserted = db.insert(schema.risk_instances)
    .values({ ...result.data, project_slug: slug }).returning().get();
  return NextResponse.json({ risk_instance: inserted }, { status: 201 });
}
