// /api/iterations/[id]/items/[itemId]/component-options — Stage 4 component-pick.
// Given an iteration item that involves a UI component, return ≥2-3 candidate
// components from the master library, ranked by relevance.
//
// Heuristic ranking:
// 1. Filter by category (passed via ?category= or inferred from item.target_kind)
// 2. Filter by tags if provided (?tags=animated,modern)
// 3. Score: name/description match against item title + description
// 4. Always include at least 3 (pad with category siblings if needed)

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound, parseIntId } from '@/lib/api';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string; itemId: string }>; }

function tokenise(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}

function score(component: typeof schema.master_components.$inferSelect, queryTokens: string[]): number {
  const haystack = [
    component.id,
    component.name,
    component.description ?? '',
    (component.tags ?? []).join(' '),
  ].join(' ').toLowerCase();
  let s = 0;
  for (const tok of queryTokens) {
    if (haystack.includes(tok)) s += 1;
    if (component.name.toLowerCase().includes(tok)) s += 2;
  }
  return s;
}

export async function GET(req: Request, { params }: Ctx) {
  const { id, itemId } = await params;
  const itrId = parseIntId(id);
  const itmId = parseIntId(itemId);
  if (itrId === null || itmId === null) return badRequest('Invalid id');

  const db = await getDb();
  const item = db.select().from(schema.iteration_items)
    .where(and(
      eq(schema.iteration_items.id, itmId),
      eq(schema.iteration_items.iteration_id, itrId),
    )).get();
  if (!item) return notFound(`Item ${itmId} not in iteration ${itrId}`);

  const url = new URL(req.url);
  const categoryFilter = url.searchParams.get('category');
  const tagFilter = (url.searchParams.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '5'), 20);

  const all = db.select().from(schema.master_components).all();
  let pool = all;
  if (categoryFilter) {
    pool = pool.filter((c) => c.category === categoryFilter);
  }
  if (tagFilter.length > 0) {
    pool = pool.filter((c) => Array.isArray(c.tags) && tagFilter.some((t) => c.tags!.includes(t)));
  }

  // Score against item context
  const queryText = `${item.title} ${item.description ?? ''}`;
  const queryTokens = tokenise(queryText);
  const scored = pool
    .map((c) => ({ component: c, score: score(c, queryTokens) }))
    .sort((a, b) => b.score - a.score);

  // Pad: if fewer than 3 with non-zero score, top-up from same category (or all)
  const selected: typeof scored = [];
  for (const entry of scored) {
    if (selected.length < limit) selected.push(entry);
  }
  while (selected.length < 3 && pool.length > selected.length) {
    const next = pool.find((c) => !selected.some((s) => s.component.id === c.id));
    if (!next) break;
    selected.push({ component: next, score: 0 });
  }

  return NextResponse.json({
    item: { id: item.id, title: item.title, item_type: item.item_type, target_kind: item.target_kind },
    query_text: queryText,
    options: selected.map((s) => ({ ...s.component, relevance_score: s.score })),
    catalog_size: all.length,
    filters_applied: {
      category: categoryFilter,
      tags: tagFilter.length > 0 ? tagFilter : null,
    },
  });
}
