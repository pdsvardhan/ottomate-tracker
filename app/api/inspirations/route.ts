// /api/inspirations — visual inspirations catalog (Dribbble, Figma community, etc.).
// GET: list with optional ?domain= / ?source_type= / ?q= / ?match_confidence= / ?tag= filters.
// POST: create a new inspiration (bearer). iter-7 #63 added the write side.

import { promises as fs } from 'node:fs';
import path from 'node:path';
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

// iter-65 #524: uploaded images land in the asset-library volume (rw since
// iteration #5) next to the seeded thumbnails, and are served by the existing
// /api/inspirations/[id]/thumbnail route.
const THUMB_ROOT = '/asset-library/inspirations';

export async function POST(req: Request) {
  const result = await readAuthBody(req, InspirationCreateSchema);
  if (!result.ok) return result.res;
  const db = await getDb();

  const { image_base64, ...row } = result.data;

  const existing = db.select({ id: schema.inspirations.id })
    .from(schema.inspirations)
    .where(eq(schema.inspirations.id, row.id))
    .get();
  if (existing) return conflict(`Inspiration '${row.id}' already exists`);

  if (image_base64) {
    const m = image_base64.match(/^data:image\/(png|jpe?g|webp|gif|avif);base64,(.+)$/s);
    if (!m) return NextResponse.json({ error: 'image_base64 is not a valid data URL' }, { status: 400 });
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    let buf: Buffer;
    try {
      buf = Buffer.from(m[2], 'base64');
    } catch {
      return NextResponse.json({ error: 'image_base64 could not be decoded' }, { status: 400 });
    }
    if (buf.length < 24) return NextResponse.json({ error: 'image payload is empty' }, { status: 400 });
    try {
      await fs.mkdir(THUMB_ROOT, { recursive: true });
      await fs.writeFile(path.join(THUMB_ROOT, `${row.id}.${ext}`), buf);
    } catch (err) {
      return NextResponse.json({ error: `could not store image: ${String(err)}` }, { status: 500 });
    }
    row.thumbnail_url = `/api/inspirations/${row.id}/thumbnail`;
  }

  db.insert(schema.inspirations).values(row as typeof schema.inspirations.$inferInsert).run();
  const created = db.select().from(schema.inspirations)
    .where(eq(schema.inspirations.id, row.id)).get();
  return NextResponse.json({ inspiration: created }, { status: 201 });
}
