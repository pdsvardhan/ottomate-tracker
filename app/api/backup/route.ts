// /api/backup — POST: snapshot the SQLite DB to data/backups/.
// Codex P0 #2 — backup before destructive ops.

import { NextResponse } from 'next/server';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const authError = requireBearer(req);
  if (authError) return authError;

  const dbPath = process.env.DATABASE_URL?.replace('file:', '') ?? './data/ottomate.db';
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  mkdirSync(backupDir, { recursive: true });
  const dest = path.join(backupDir, `backup-${Date.now()}.db`);
  try {
    copyFileSync(dbPath, dest);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
  const size = statSync(dest).size;
  return NextResponse.json({ ok: true, path: dest, size_bytes: size });
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
