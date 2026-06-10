// /api/backup — POST: snapshot the SQLite DB to data/backups/.
// Codex P0 #2 — backup before destructive ops.
// 2026-06-10: copyFileSync -> VACUUM INTO after the WAL-split incident. A raw
// file copy misses un-checkpointed WAL pages (the Jun 4-10 backups silently
// excluded 6 days of writes) and can tear mid-write. VACUUM INTO snapshots
// through the app's own SQLite connection, then the result is integrity-checked
// before reporting ok.

import { NextResponse } from 'next/server';
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { requireBearer } from '@/lib/auth';
import { getRawSqlite } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const authError = requireBearer(req);
  if (authError) return authError;

  const dbPath = process.env.DATABASE_URL?.replace('file:', '') ?? './data/ottomate.db';
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  mkdirSync(backupDir, { recursive: true });
  const dest = path.join(backupDir, `backup-${Date.now()}.db`);
  try {
    const raw = await getRawSqlite();
    raw.prepare('VACUUM INTO ?').run(dest);
    const check = new Database(dest, { readonly: true });
    const integrity = check.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    check.close();
    if (integrity.integrity_check !== 'ok') {
      try { unlinkSync(dest); } catch {}
      return NextResponse.json(
        { error: 'backup_failed_integrity', detail: integrity.integrity_check },
        { status: 500 }
      );
    }
  } catch (err) {
    try { unlinkSync(dest); } catch {}
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  const size = statSync(dest).size;
  return NextResponse.json({ ok: true, path: dest, size_bytes: size, method: 'vacuum_into' });
}

export async function GET() {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') ?? './data/ottomate.db';
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  let entries: string[] = [];
  try {
    entries = readdirSync(backupDir);
  } catch {
    return NextResponse.json({ backups: [] });
  }
  const backups = entries
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const full = path.join(backupDir, f);
      const stat = statSync(full);
      return { name: f, size_bytes: stat.size, mtime: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
  return NextResponse.json({ backups });
}
