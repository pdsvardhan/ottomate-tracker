// /api/inspirations — visual inspirations catalog (Dribbble, Figma community, etc.).
// GET: list with optional ?domain= / ?source_type= / ?q= / ?match_confidence= / ?tag= filters.
// POST: create a new inspiration (bearer). iter-7 #63 added the write side.

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { conflict, readAuthBody } from '@/lib/api';
import { InspirationCreateSchema } from '@/lib/validation/inspirations';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase().trim();
  const domain = url.searchParams.get('domain');
  const sourceType = url.searchParams.get('source_type');
  const matchConfidence = url.searchParams.get('match_confidence');
  const tag = url.searchParams.get('tag');

  const db = await getDb();
  const all = db.select().from(schema.inspirations).orderBy(asc(schema.inspirations.id)).all();

  let filtered = all;
  if (q) {
    filtered = filtered.filter((i) => {
      const haystack = [i.id, i.title, i.notes ?? '', (i.style_tags ?? []).join(' '), i.domain ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }
  if (domain) filtered = filtered.filter((i) => i.domain === domain);
  if (sourceType) filtered = filtered.filter((i) => i.source_type === sourceType);
  if (matchConfidence) filtered = filtered.filter((i) => i.match_confidence === matchConfidence);
  if (tag) filtered = filtered.filter((i) => Array.isArray(i.style_tags) && i.style_tags.includes(tag));

  return NextResponse.json({ count: filtered.length, inspirations: filtered });
}

export async function POST(req: Request) {
  const result = await readAuthBody(req, InspirationCreateSchema);
  if (!result.ok) return result.res;
  const db = await getDb();

  const existing = db.select({ id: schema.inspirations.id })
    .from(schema.inspirations)
    .where(eq(schema.inspirations.id, result.data.id))
    .get();
  if (existing) return conflict(`Inspiration '${result.data.id}' already exists`);

  db.insert(schema.inspirations).values(result.data as typeof schema.inspirations.$inferInsert).run();
  const created = db.select().from(schema.inspirations)
    .where(eq(schema.inspirations.id, result.data.id)).get();
  return NextResponse.json({ inspiration: created }, { status: 201 });
}
