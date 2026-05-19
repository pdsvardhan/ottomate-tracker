// /api/projects/[slug]/context-packet — Codex Round 2 token saver.
// Returns a compact, scoped JSON the skill loads ONCE per session
// instead of querying many endpoints. Cuts Claude prompt size dramatically.

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from '@/lib/api';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const url = new URL(req.url);
  const include = (url.searchParams.get('include') ?? '').split(',').filter(Boolean);
  const want = (key: string) => include.length === 0 || include.includes(key);

  const db = await getDb();
  const project = db.select().from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const packet: Record<string, unknown> = {
    project: {
      slug: project.slug,
      display_name: project.display_name,
      core_idea: project.core_idea,
      lifecycle_phase: project.lifecycle_phase,
      current_status: project.current_status,
      preferences: project.preferences,
    },
  };

  if (want('flows')) {
    packet.flows = db.select({
      id: schema.flows.id,
      title: schema.flows.title,
      type: schema.flows.type,
      priority: schema.flows.priority,
      test_status: schema.flows.test_status,
    }).from(schema.flows).where(eq(schema.flows.project_slug, slug)).all();
  }
  if (want('features')) {
    packet.features = db.select({
      id: schema.features.id,
      title: schema.features.title,
      status: schema.features.status,
      priority: schema.features.priority,
      test_status: schema.features.test_status,
    }).from(schema.features).where(eq(schema.features.project_slug, slug)).all();
  }
  if (want('pages')) {
    packet.pages = db.select({
      id: schema.pages.id,
      title: schema.pages.title,
      route: schema.pages.route,
      layout_type: schema.pages.layout_type,
    }).from(schema.pages).where(eq(schema.pages.project_slug, slug)).all();
  }
  if (want('risks')) {
    packet.risks = db.select({
      id: schema.risk_instances.id,
      risk_type_id: schema.risk_instances.risk_type_id,
      status: schema.risk_instances.status,
      notes: schema.risk_instances.notes,
    }).from(schema.risk_instances)
      .where(eq(schema.risk_instances.project_slug, slug)).all();
  }
  if (want('decisions')) {
    packet.decisions = db.select({
      id: schema.adr_index.id,
      title: schema.adr_index.title,
      status: schema.adr_index.status,
      date: schema.adr_index.date,
    }).from(schema.adr_index)
      .where(eq(schema.adr_index.project_slug, slug))
      .orderBy(asc(schema.adr_index.date)).all();
  }
  return NextResponse.json(packet);
}
