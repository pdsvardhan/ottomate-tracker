// /api/components/[id]/component-options — Stage 2.4 ranked options for one component slot.
// Mirrors the iteration-time component-options endpoint but is scoped to project components.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId } from '@/lib/api';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

function tokenise(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}

function score(component: typeof schema.master_components.$inferSelect, queryTokens: string[]): number {
  const haystack = [
    component.id,
    component.name,
    component.description ?? '',
    ((component.tags ?? []) as string[]).join(' '),
  ].join(' ').toLowerCase();
  let s = 0;
  for (const tok of queryTokens) {
    if (haystack.includes(tok)) s += 1;
    if (component.name.toLowerCase().includes(tok)) s += 2;
  }
  // Boost by quality grade (A > B > C)
  if (component.quality_grade === 'A') s += 2;
  else if (component.quality_grade === 'B') s += 1;
  return s;
}

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const idNum = parseIntId(id);
  if (idNum === null) return badRequest('Invalid id');

  const db = await getDb();
  const component = db.select().from(schema.components).where(eq(schema.components.id, idNum)).get();
  if (!component) return notFound(`Component ${idNum} not found`);

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '5'), 20);

  const all = db.select().from(schema.master_components).all();

  // Filter by category first (mandatory if component has one).
  let pool = all;
  if (component.category) {
    pool = pool.filter((c) => c.category === component.category);
  }
  // If category yields nothing, fall back to all.
  if (pool.length === 0) pool = all;

  const queryText = `${component.name} ${component.purpose_on_page ?? ''}`;
  const queryTokens = tokenise(queryText);
  const scored = pool
    .map((c) => ({ component: c, score: score(c, queryTokens) }))
    .sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, Math.max(limit, 3));
  while (selected.length < 3 && pool.length > selected.length) {
    const next = pool.find((c) => !selected.some((s) => s.component.id === c.id));
    if (!next) break;
    selected.push({ component: next, score: 0 });
  }

  return NextResponse.json({
    component: {
      id: component.id,
      name: component.name,
      category: component.category,
      purpose_on_page: component.purpose_on_page,
      picked: component.picked,
      asset_library_ref: component.asset_library_ref,
    },
    query_text: queryText,
    options: selected.map((s) => ({ ...s.component, relevance_score: s.score })),
    catalog_size: all.length,
    category_filter: component.category,
  });
}
