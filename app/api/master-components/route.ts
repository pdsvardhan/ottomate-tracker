// /api/master-components — central asset library catalog.
// GET: list with optional ?q= text filter and ?category= filter.
// POST: create new component (Task 4 — enrichment workflow).
//        If body includes `source_code` + `primary_file`, the route writes the
//        source file to /asset-library/<id>/<primary_file> and populates
//        source_paths accordingly. Otherwise behaves as a metadata-only insert.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, conflict, readAuthBody } from '@/lib/api';
import { MasterComponentCreateSchema } from '@/lib/validation/master-components';

export const runtime = 'nodejs';

// Catalog assets canonically live at /asset-library/components/<id>/<file>
// (host: /mnt/storage/ottomate/assets/components/<id>/<file>). Older orphan
// source_paths at /asset-library/<id>/ are tracked for cleanup separately.
const ASSET_ROOT = '/asset-library/components';

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

  // Separate the filesystem-side fields from the DB-side fields.
  const { source_code, ...dbRow } = result.data;
  const finalRow: Record<string, unknown> = { ...dbRow };

  if (source_code && source_code.trim().length > 0) {
    const filename = (dbRow.primary_file ?? 'index.tsx').replace(/[^a-zA-Z0-9._-]/g, '');
    if (filename.length === 0) {
      return badRequest('primary_file must contain at least one valid character');
    }
    const dir = path.join(ASSET_ROOT, dbRow.id);
    const filePath = path.join(dir, filename);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, source_code, 'utf8');
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to write source file', detail: String(err) },
        { status: 500 },
      );
    }
    if (!dbRow.source_paths || dbRow.source_paths.length === 0) {
      finalRow.source_paths = [filePath];
      finalRow.primary_file = filename;
    }
  }

  db.insert(schema.master_components).values(finalRow as typeof schema.master_components.$inferInsert).run();
  const created = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, result.data.id)).get();
  return NextResponse.json({ component: created }, { status: 201 });
}
