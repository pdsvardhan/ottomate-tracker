// /api/inspirations — visual inspirations catalog (Dribbble, Figma community, etc.).
// GET: list with optional ?domain= / ?source_type= / ?q= / ?match_confidence= / ?tag= filters.
// (Mutation routes added when the UI grows beyond browse — currently READ-only.)

import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

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
