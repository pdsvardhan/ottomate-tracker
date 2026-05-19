// /api/projects/[slug]/components-pick/status — Stage 2.4 readiness summary.

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
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

  const components = db.select().from(schema.components)
    .where(eq(schema.components.project_slug, slug)).all();

  const total = components.length;
  const picked = components.filter((c) => c.picked).length;
  const skipped = components.filter((c) => c.skip_reason && c.skip_reason.length > 0).length;
  const unresolved = total - picked - skipped;

  const byPage = new Map<string, { total: number; picked: number; skipped: number }>();
  for (const c of components) {
    const cell = byPage.get(c.page_id) ?? { total: 0, picked: 0, skipped: 0 };
    cell.total += 1;
    if (c.picked) cell.picked += 1;
    else if (c.skip_reason) cell.skipped += 1;
    byPage.set(c.page_id, cell);
  }

  return NextResponse.json({
    project_slug: slug,
    total,
    picked,
    skipped,
    unresolved,
    ready_for_stage_3: unresolved === 0,
    by_page: Object.fromEntries(byPage),
  });
}
