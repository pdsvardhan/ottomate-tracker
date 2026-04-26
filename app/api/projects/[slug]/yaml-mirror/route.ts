// /api/projects/[slug]/yaml-mirror — GET: build YAML serialisation on demand
// without doing the full pack-up dance (no backup, no state recording).
// Useful when the user just wants to inspect what the mirror would look like.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from '@/lib/api';
import { buildAllMirrors } from '@/lib/sync/db-to-yaml';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  try {
    const mirrors = await buildAllMirrors(slug);
    return NextResponse.json({
      project_slug: slug,
      files: mirrors.map((m) => ({
        filename: m.filename,
        hash: m.hash,
        size_bytes: m.body.length,
        body: m.body,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
