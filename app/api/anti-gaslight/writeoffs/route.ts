// /api/anti-gaslight/writeoffs — GET list, POST record, DELETE revoke.
//
// Plan B item B4 (2026-08-27). A violation can be TRUE, understood, and deliberately accepted.
// adr-048 did exactly that for three July deploys, and recorded what it cost:
//
//   "There is no 'written off with a reason' state in the anti-gaslight tool: R5 is a pure query
//    over two tables, so the only ways to clear it are to fabricate test runs or destroy deploy
//    history. Both are worse than a red mark. The violation stays red."
//
// So it stayed red permanently — and a permanent red teaches people to stop reading red, which is
// the exact failure the anti-gaslight rules exist to prevent. The ADR itself said the gap "is
// filed against Ottomate itself"; no such filing existed until this route.
//
// WHAT A WRITE-OFF IS NOT: it is not a delete and not a hide. The row is still returned by
// /api/anti-gaslight/violations under `written_off`, carrying its reason and its ADR. It only
// stops inflating a count that could otherwise never go down.
//
// The friction is deliberate and mirrors the rest of this codebase (design decisions need an
// unlock_reason; a corrected risk resolution needs a correction_reason): a write-off REQUIRES a
// reason AND an adr_id. Writing one off should cost a decision record — that is more friction
// than fixing it, which is the right way round.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import { getRawSqlite } from '@/lib/db/client';
import { badRequest, readAuthBody } from '@/lib/api';
import { requireBearer } from '@/lib/auth';

export const runtime = 'nodejs';

const WriteoffSchema = z.object({
  rule: z.string().min(1).max(80),
  project_slug: z.string().min(1).max(80),
  item_id: z.string().min(1).max(200),
  // An unexplained write-off is just a delete with extra steps.
  reason: z.string().min(1).max(2000),
  // adr-NNN-<slug>, matching operating rule 14 — the decision must exist as a record.
  adr_id: z.string().regex(/^adr-\d{3}-[a-z0-9-]+$/, 'adr_id must look like adr-NNN-short-slug'),
  written_off_by: z.string().max(120).nullish(),
});

function table(sqlite: Database.Database): boolean {
  return !!sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='violation_writeoffs'`)
    .get();
}

export async function GET(req: Request) {
  const sqlite = await getRawSqlite();
  if (!table(sqlite)) return NextResponse.json({ writeoffs: [], note: 'violation_writeoffs table absent — migration 0014 not applied' });
  const slug = new URL(req.url).searchParams.get('project_slug');
  const rows = sqlite
    .prepare(
      `SELECT id, rule, project_slug, item_id, reason, adr_id, written_off_at, written_off_by
       FROM violation_writeoffs ${slug ? 'WHERE project_slug = ?' : ''}
       ORDER BY written_off_at DESC`,
    )
    .all(...(slug ? [slug] : []));
  return NextResponse.json({ count: rows.length, writeoffs: rows });
}

export async function POST(req: Request) {
  const parsed = await readAuthBody(req, WriteoffSchema);
  if (!parsed.ok) return parsed.res;
  const sqlite = await getRawSqlite();
  if (!table(sqlite)) return badRequest('violation_writeoffs table absent — apply migration 0014 first');
  const d = parsed.data;

  // The ADR must actually exist. A write-off pointing at a decision nobody wrote is the same
  // unbacked claim this subsystem is built to catch.
  const adrTable = !!sqlite.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='adr_index'`).get();
  if (adrTable) {
    const adr = sqlite.prepare(`SELECT 1 FROM adr_index WHERE id = ? AND project_slug = ?`).get(d.adr_id, d.project_slug);
    if (!adr) return badRequest(`adr_id '${d.adr_id}' is not an ADR on project '${d.project_slug}' — write the decision first, then write off against it`);
  }

  try {
    sqlite
      .prepare(
        `INSERT INTO violation_writeoffs (rule, project_slug, item_id, reason, adr_id, written_off_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(d.rule, d.project_slug, d.item_id, d.reason, d.adr_id, d.written_off_by ?? null);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/UNIQUE/i.test(msg)) return badRequest(`${d.rule}/${d.item_id} on '${d.project_slug}' is already written off`);
    throw e;
  }

  const row = sqlite
    .prepare(`SELECT * FROM violation_writeoffs WHERE rule=? AND project_slug=? AND item_id=?`)
    .get(d.rule, d.project_slug, d.item_id);
  return NextResponse.json({ writeoff: row }, { status: 201 });
}

export async function DELETE(req: Request) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const sqlite = await getRawSqlite();
  if (!table(sqlite)) return badRequest('violation_writeoffs table absent');
  const u = new URL(req.url);
  const id = u.searchParams.get('id');
  if (!id) return badRequest('id query param required');
  const info = sqlite.prepare(`DELETE FROM violation_writeoffs WHERE id = ?`).run(Number(id));
  if (!info.changes) return badRequest(`no writeoff with id ${id}`);
  // Revoking is cheap on purpose: putting a violation BACK into the count needs no ceremony.
  return NextResponse.json({ revoked: Number(id) });
}
