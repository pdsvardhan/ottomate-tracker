// /api/projects/[slug]/third-party-services — list + create

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { ThirdPartyServiceCreateSchema } from '@/lib/validation/risks';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const services = db.select().from(schema.third_party_services)
    .where(eq(schema.third_party_services.project_slug, slug))
    .orderBy(asc(schema.third_party_services.name)).all();
  return NextResponse.json({ third_party_services: services });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, ThirdPartyServiceCreateSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);
  const inserted = db.insert(schema.third_party_services)
    .values({ ...result.data, project_slug: slug }).returning().get();
  return NextResponse.json({ third_party_service: inserted }, { status: 201 });
}
