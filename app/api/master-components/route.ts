// /api/master-components — central asset library catalog.
// GET: list with optional ?q= text filter and ?category= filter.
// POST: create new component (Task 4 — enrichment workflow).

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { conflict, readAuthBody } from '@/lib/api';
import { MasterComponentCreateSchema } from '@/lib/validation/master-components';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase().trim();
  const category = url.searchParams.get('category');
  const tag = url.searchParams.get('tag');
  const db = await getDb();
  const all = db.select().from(schema.master_components)
    .orderBy(asc(schema.master_components.category), asc(schema.master_components.id)).all();
  let filtered = all;
  if (q) {
    filtered = filtered.filter((c) => {
      const desc = (c.description ?? '').toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        desc.includes(q)
      );
    });
  }
  if (category) {
    filtered = filtered.filter((c) => c.category === category);
  }
  if (tag) {
    filtered = filtered.filter((c) => Array.isArray(c.tags) && c.tags.includes(tag));
  }
  return NextResponse.json({ count: filtered.length, components: filtered });
}

export async function POST(req: Request) {
  const result = await readAuthBody(req, MasterComponentCreateSchema);
  if (!result.ok) return result.res;
  const db = await getDb();

  const existing = db.select({ id: schema.master_components.id })
    .from(schema.master_components)
    .where(eq(schema.master_components.id, result.data.id))
    .get();
  if (existing) return conflict(`Component '${result.data.id}' already exists`);

  db.insert(schema.master_components).values(result.data).run();
  const created = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, result.data.id)).get();
  return NextResponse.json({ component: created }, { status: 201 });
}
