// /api/graph/[slug] — relationships graph (Feature ↔ Flow ↔ Page ↔ Component).
// Powers the Relationships Graph view (R10.5 #3).

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from '@/lib/api';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const flows = db.select({ id: schema.flows.id, title: schema.flows.title }).from(schema.flows)
    .where(eq(schema.flows.project_slug, slug)).all();
  const features = db.select({ id: schema.features.id, title: schema.features.title })
    .from(schema.features).where(eq(schema.features.project_slug, slug)).all();
  const pages = db.select({ id: schema.pages.id, title: schema.pages.title })
    .from(schema.pages).where(eq(schema.pages.project_slug, slug)).all();
  const components = db.select({ id: schema.components.id, name: schema.components.name, page_id: schema.components.page_id })
    .from(schema.components).where(eq(schema.components.project_slug, slug)).all();

  const flow_features_links = db.select().from(schema.flow_features).all()
    .filter((r) => flows.some((f) => f.id === r.flow_id));
  const flow_pages_links = db.select().from(schema.flow_pages).all()
    .filter((r) => flows.some((f) => f.id === r.flow_id));
  const page_features_links = db.select().from(schema.page_features).all()
    .filter((r) => pages.some((p) => p.id === r.page_id));

  return NextResponse.json({
    nodes: {
      flows: flows.map((f) => ({ id: f.id, type: 'flow', label: f.title })),
      features: features.map((f) => ({ id: f.id, type: 'feature', label: f.title })),
      pages: pages.map((p) => ({ id: p.id, type: 'page', label: p.title })),
      components: components.map((c) => ({ id: `c-${c.id}`, type: 'component', label: c.name, page_id: c.page_id })),
    },
    edges: {
      flow_features: flow_features_links,
      flow_pages: flow_pages_links,
      page_features: page_features_links,
      page_components: components.map((c) => ({ page_id: c.page_id, component_id: c.id })),
    },
  });
}
