// /api/projects/[slug]/architecture — list .mmd files in /repos/<slug>/architecture/

import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from '@/lib/api';

export const runtime = 'nodejs';

const REPOS_DIR = process.env.OTTOMATE_REPOS_DIR ?? '/repos';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const archDir = path.join(REPOS_DIR, slug, 'architecture');
  let entries: string[] = [];
  try {
    entries = readdirSync(archDir);
  } catch {
    return NextResponse.json({ files: [], note: `No architecture/ dir at ${archDir}` });
  }
  const files = entries
    .filter((f) => f.endsWith('.mmd'))
    .map((f) => {
      try {
        const full = path.join(archDir, f);
        const stat = statSync(full);
        return { name: f, size_bytes: stat.size, mtime: stat.mtime.toISOString() };
      } catch {
        return null;
      }
    })
    .filter((x): x is { name: string; size_bytes: number; mtime: string } => x !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ files });
}
