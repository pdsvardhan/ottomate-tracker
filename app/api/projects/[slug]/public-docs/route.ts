// /api/projects/[slug]/public-docs — upsert public_docs rows from a repo's
// public_docs/ subdirectory. Called by scripts/write-yaml-mirror.ts on pack-up
// (ADR-011 follow-up). Body shape:
//   { docs: [ { doc_name: 'architecture-summary' | 'feature-spec-public' | 'adr-summary', body: string } ] }
// Hashes each body with FNV-1a; updates mirrored_at only when hash changes.

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const DocSchema = z.object({
  doc_name: z.string().regex(/^[a-z][a-z0-9-]+$/, 'kebab-case doc type').max(60),
  body: z.string().min(1).max(1_000_000),
});
const BodySchema = z.object({
  docs: z.array(DocSchema).min(0).max(10),
  delete_missing: z.boolean().default(false),
});

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const rows = db.select().from(schema.project_docs)
    .where(eq(schema.project_docs.project_slug, slug)).all();
  return NextResponse.json({ count: rows.length, docs: rows });
}

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, BodySchema);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const incomingNames = new Set(result.data.docs.map((d) => d.doc_name));
  const summary: Record<string, 'inserted' | 'updated' | 'unchanged' | 'deleted'> = {};

  for (const doc of result.data.docs) {
    const newHash = sha256(doc.body);
    const existing = db.select().from(schema.project_docs)
      .where(and(
        eq(schema.project_docs.project_slug, slug),
        eq(schema.project_docs.doc_name, doc.doc_name),
      )).get();

    if (!existing) {
      db.insert(schema.project_docs).values({
        project_slug: slug,
        doc_name: doc.doc_name,
        body: doc.body,
        source_hash: newHash,
      }).run();
      summary[doc.doc_name] = 'inserted';
    } else if (existing.source_hash !== newHash) {
      db.update(schema.project_docs).set({
        body: doc.body,
        source_hash: newHash,
        mirrored_at: new Date(),
      }).where(and(
        eq(schema.project_docs.project_slug, slug),
        eq(schema.project_docs.doc_name, doc.doc_name),
      )).run();
      summary[doc.doc_name] = 'updated';
    } else {
      summary[doc.doc_name] = 'unchanged';
    }
  }

  if (result.data.delete_missing) {
    const existing = db.select().from(schema.project_docs)
      .where(eq(schema.project_docs.project_slug, slug)).all();
    for (const row of existing) {
      if (!incomingNames.has(row.doc_name)) {
        db.delete(schema.project_docs).where(and(
          eq(schema.project_docs.project_slug, slug),
          eq(schema.project_docs.doc_name, row.doc_name),
        )).run();
        summary[row.doc_name] = 'deleted';
      }
    }
  }

  return NextResponse.json({
    project_slug: slug,
    summary,
    total_docs: db.select().from(schema.project_docs)
      .where(eq(schema.project_docs.project_slug, slug)).all().length,
  });
}
