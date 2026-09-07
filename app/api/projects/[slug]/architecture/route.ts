// /api/projects/[slug]/architecture — DB-backed diagram artifacts.
// GET: diagram_artifacts rows (primary, what the Architecture tab renders)
//      plus the legacy .mmd file listing from <repoRoot(slug)>/architecture/ (lib/repo-root.ts, #848).
// POST: bearer-auth'd upsert on (project_slug, kind) — replaces any existing
//      rows of that kind with the new diagram.

import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { DiagramUpsertSchema } from '@/lib/validation/diagrams';
import { repoRoot } from '@/lib/repo-root';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

interface MmdFile { name: string; size_bytes: number; mtime: string; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  // Primary source: DB-backed diagram artifacts.
  const diagrams = db.select().from(schema.diagram_artifacts)
    .where(eq(schema.diagram_artifacts.project_slug, slug))
    .orderBy(asc(schema.diagram_artifacts.kind), asc(schema.diagram_artifacts.position))
    .all();

  // Legacy source: .mmd files on disk (kept for back-compat consumers).
  const archDir = path.join(repoRoot(slug), 'architecture');
  let files: MmdFile[] = [];
  try {
    files = readdirSync(archDir)
      .filter((f) => f.endsWith('.mmd'))
      .map((f) => {
        try {
          const stat = statSync(path.join(archDir, f));
          return { name: f, size_bytes: stat.size, mtime: stat.mtime.toISOString() };
        } catch {
          return null;
        }
      })
      .filter((x): x is MmdFile => x !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // No architecture/ dir — DB rows are the only source.
  }

  return NextResponse.json({ diagrams, files });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, DiagramUpsertSchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const { kind, title, mermaid_src, caption, position } = result.data;
  // Seed convention (migration 0006): caption column holds "Title — caption".
  const storedCaption = caption ? `${title} — ${caption}` : title;

  // UPSERT on (project_slug, kind): drop existing rows of this kind, insert fresh.
  // (The unique index is (project_slug, kind, position) — per-kind replace keeps
  // exactly one row per kind regardless of the previous row's position.)
  const byProjectAndKind = and(
    eq(schema.diagram_artifacts.project_slug, slug),
    eq(schema.diagram_artifacts.kind, kind),
  );
  db.delete(schema.diagram_artifacts).where(byProjectAndKind).run();
  db.insert(schema.diagram_artifacts).values({
    project_slug: slug,
    kind,
    mermaid_src,
    caption: storedCaption,
    position: position ?? 0,
  }).run();

  const created = db.select().from(schema.diagram_artifacts).where(byProjectAndKind).get();
  return NextResponse.json({ diagram: created }, { status: 201 });
}
