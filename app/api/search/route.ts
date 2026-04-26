// /api/search — full-text search across flows + features + pages + bugs + decisions.
// Uses sqlite FTS5 virtual table set up in lib/db/client.ts (post-migrate hook).

import { NextResponse } from 'next/server';
import { getRawSqlite } from '@/lib/db/client';
import { badRequest } from '@/lib/api';

export const runtime = 'nodejs';

interface Match {
  doc_type: string;
  doc_id: string;
  project_slug: string;
  title: string;
  snippet: string;
  rank: number;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  if (!q || q.trim().length < 2) {
    return badRequest('q must be at least 2 characters');
  }
  const projectFilter = url.searchParams.get('project_slug');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);

  // FTS5 syntax: column-prefixed search, snippet helper.
  // Some characters are FTS5 operators — sanitise the basic ones.
  const sanitised = q.replace(/['"\(\)\[\]\:\*]/g, ' ').trim();
  if (sanitised.length < 2) return badRequest('q is empty after sanitisation');
  const ftsQuery = sanitised.split(/\s+/).map((t) => `"${t}"*`).join(' ');

  const sqlite = await getRawSqlite();
  let stmt;
  let rows: Match[];
  if (projectFilter) {
    stmt = sqlite.prepare(`
      SELECT
        doc_type,
        doc_id,
        project_slug,
        title,
        snippet(ottomate_fts, -1, '<mark>', '</mark>', '...', 12) AS snippet,
        bm25(ottomate_fts) AS rank
      FROM ottomate_fts
      WHERE ottomate_fts MATCH ? AND project_slug = ?
      ORDER BY rank
      LIMIT ?
    `);
    rows = stmt.all(ftsQuery, projectFilter, limit) as Match[];
  } else {
    stmt = sqlite.prepare(`
      SELECT
        doc_type,
        doc_id,
        project_slug,
        title,
        snippet(ottomate_fts, -1, '<mark>', '</mark>', '...', 12) AS snippet,
        bm25(ottomate_fts) AS rank
      FROM ottomate_fts
      WHERE ottomate_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);
    rows = stmt.all(ftsQuery, limit) as Match[];
  }

  // Group by doc_type for the UI.
  const grouped: Record<string, Match[]> = {};
  for (const r of rows) {
    if (!grouped[r.doc_type]) grouped[r.doc_type] = [];
    grouped[r.doc_type].push(r);
  }
  return NextResponse.json({ q, total: rows.length, grouped });
}
