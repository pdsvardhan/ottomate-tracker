// /api/master-components/[id]/source — return the raw source file(s) for a component.
// Used by /components-browser/[id] to render the live preview + code panel.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from '@/lib/api';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

// Path inside the container; mounted from /mnt/storage/ottomate/assets on host.
const ASSET_ROOT = '/asset-library/components';
// Whitelist of extensions we'll read + return (don't accidentally surface binaries).
const READABLE_EXT = new Set(['.tsx', '.ts', '.jsx', '.js', '.html', '.css', '.scss', '.md', '.json', '.pug']);

interface FilePayload {
  name: string;
  content: string;
  size: number;
  ext: string;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const component = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  if (!component) return notFound(`Component '${id}' not found`);

  // The asset dir is always /asset-library/components/<id>/ regardless of what
  // source_paths records (some legacy rows have container paths without the
  // `components/` prefix — those orphans are flagged in iteration #5 follow-ups).
  const dir = path.join(ASSET_ROOT, id);

  let files: FilePayload[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile()) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (!READABLE_EXT.has(ext)) continue;
      const full = path.join(dir, e.name);
      const stat = await fs.stat(full);
      if (stat.size > 500_000) continue; // skip huge files
      const content = await fs.readFile(full, 'utf8');
      files.push({ name: e.name, content, size: stat.size, ext });
    }
  } catch {
    files = [];
  }

  // Sort: primary_file first (if set), then index.html / index.tsx, then alphabetic.
  files.sort((a, b) => {
    const primary = component.primary_file ?? '';
    if (a.name === primary) return -1;
    if (b.name === primary) return 1;
    const indexFiles = ['index.html', 'index.tsx', 'index.ts', 'index.jsx', 'index.js'];
    const aIdx = indexFiles.indexOf(a.name);
    const bIdx = indexFiles.indexOf(b.name);
    if (aIdx !== -1 || bIdx !== -1) {
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    }
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({
    component_id: id,
    asset_dir: dir,
    files,
    file_count: files.length,
  });
}
