// /api/pack-up — session-end orchestration (R2.4 / R21).
// Triggered by the skill at "pack up". Runs DB backup + builds YAML
// mirrors so the skill can write them into the project's repo.

import { NextResponse } from 'next/server';
import { mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { z } from 'zod';
import { count, eq } from 'drizzle-orm';
import { getDb, getRawSqlite, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { buildAllMirrors, recordMirrorHashes } from '@/lib/sync/db-to-yaml';

export const runtime = 'nodejs';

const PackUpSchema = z.object({
  project_slug: z.string().min(1),
  session_id: z.string().min(1).optional(),
  summary: z.string().nullish(),
  include_yaml: z.boolean().default(true),
});

export async function POST(req: Request) {
  const result = await readAuthBody(req, PackUpSchema);
  if (!result.ok) return result.res;

  const db = await getDb();
  const project = db.select().from(schema.projects)
    .where(eq(schema.projects.slug, result.data.project_slug)).get();
  if (!project) return notFound(`Project '${result.data.project_slug}' not found`);

  const slug = result.data.project_slug;
  const summary = {
    project_slug: slug,
    timestamp: new Date().toISOString(),
    counts: {
      flows: db.select({ n: count() }).from(schema.flows).where(eq(schema.flows.project_slug, slug)).all()[0].n,
      features: db.select({ n: count() }).from(schema.features).where(eq(schema.features.project_slug, slug)).all()[0].n,
      pages: db.select({ n: count() }).from(schema.pages).where(eq(schema.pages.project_slug, slug)).all()[0].n,
      iterations: db.select({ n: count() }).from(schema.iterations).where(eq(schema.iterations.project_slug, slug)).all()[0].n,
      open_risks: db.select({ n: count() }).from(schema.risk_instances).where(eq(schema.risk_instances.project_slug, slug)).all()[0].n,
    },
    pending_reports: db.select({ n: count() }).from(schema.reports)
      .where(eq(schema.reports.project_slug, slug)).all()[0].n,
  };

  // Snapshot the SQLite DB before any sync would mutate (Codex P0 #2).
  // adr-018 (closing an adr-015 miss): VACUUM INTO through the app's own
  // connection, never a raw file copy of a live DB — raw copies tear and
  // silently exclude journal pages. Integrity-checked before reporting ok.
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') ?? './data/ottomate.db';
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `pack-up-${slug}-${Date.now()}.db`);
  let backup_ok = false;
  try {
    const raw = await getRawSqlite();
    raw.prepare('VACUUM INTO ?').run(backupPath);
    const check = new Database(backupPath, { readonly: true });
    const integrity = check.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    check.close();
    if (integrity.integrity_check === 'ok') {
      backup_ok = true;
    } else {
      try { unlinkSync(backupPath); } catch {}
      console.error('[ottomate] pack-up backup integrity failed:', integrity);
    }
  } catch (err) {
    try { unlinkSync(backupPath); } catch {}
    console.error('[ottomate] pack-up backup failed:', err);
  }

  let yaml_mirror = null;
  if (result.data.include_yaml) {
    try {
      const mirrors = await buildAllMirrors(slug);
      const sqlite = await getRawSqlite();
      await recordMirrorHashes(sqlite, slug, mirrors);
      yaml_mirror = {
        ok: true,
        files: mirrors.map((m) => ({ filename: m.filename, hash: m.hash, size_bytes: m.body.length, body: m.body })),
        note: 'Skill writes these to /mnt/storage/websites/<slug>/ via SCP. Tracker container has /repos mounted read-only.',
      };
    } catch (err) {
      console.error('[ottomate] pack-up YAML build failed:', err);
      yaml_mirror = { ok: false, error: String(err) };
    }
  }

  return NextResponse.json({
    summary,
    backup: { ok: backup_ok, path: backup_ok ? backupPath : null },
    yaml_mirror,
  });
}
