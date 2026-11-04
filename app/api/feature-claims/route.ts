// /api/feature-claims — anti-gaslight Rule 1 substrate
// Captures every "this feature is done" assertion and reconciles them.
// 2026-05-13: added per worksheet § 0 design.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRawSqlite } from '@/lib/db/client';
import { readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const ClaimCreateSchema = z.object({
  feature_id: z.string().min(1),
  claim_text: z.string().optional(),
  source: z.enum(['coder-agent', 'user', 'iteration-summary', 'chat', 'skill-auto']),
  claimed_by_session: z.string().min(1),
  claimed_at: z.string().optional(), // ISO; defaults to now
});

const ReconcileSchema = z.object({
  reconciled_with: z.enum(['verified', 'partial', 'stub-detected', 'dropped', 'unreconciled']),
  reconciler_id: z.number().int().nullable().optional(),
  reconciled_at: z.string().optional(),
});

// ============================================================================
// GET /api/feature-claims
// Query params: feature_id, reconciled_with, project_slug, limit (default 100)
// ============================================================================
export async function GET(req: Request) {
  const url = new URL(req.url);
  const feature_id = url.searchParams.get('feature_id');
  const reconciled_with = url.searchParams.get('reconciled_with');
  const project_slug = url.searchParams.get('project_slug');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

  const sqlite = await getRawSqlite();
  const where: string[] = [];
  const params: unknown[] = [];
  if (feature_id) { where.push('fc.feature_id = ?'); params.push(feature_id); }
  if (reconciled_with) { where.push('fc.reconciled_with = ?'); params.push(reconciled_with); }
  if (project_slug) { where.push('f.project_slug = ?'); params.push(project_slug); }

  const sql = `
    SELECT fc.*, f.project_slug, f.title AS feature_title
    FROM feature_claims fc
    LEFT JOIN features f ON f.id = fc.feature_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY fc.claimed_at DESC
    LIMIT ?`;
  params.push(limit);
  const rows = sqlite.prepare(sql).all(...params);
  return NextResponse.json({ claims: rows, count: rows.length });
}

// ============================================================================
// POST /api/feature-claims — record a new claim
// Bearer required.
// ============================================================================
export async function POST(req: Request) {
  const parsed = await readAuthBody(req, ClaimCreateSchema);
  if (!parsed.ok) return parsed.res;
  const { feature_id, claim_text, source, claimed_by_session, claimed_at } = parsed.data;

  const sqlite = await getRawSqlite();

  // Verify the feature exists
  const feat = sqlite.prepare('SELECT id FROM features WHERE id = ?').get(feature_id);
  if (!feat) {
    return NextResponse.json({ error: `feature ${feature_id} not found` }, { status: 404 });
  }

  const result = sqlite.prepare(`
    INSERT INTO feature_claims (feature_id, claimed_at, claimed_by_session, claim_text, source, reconciled_with)
    VALUES (?, ?, ?, ?, ?, 'unreconciled')
  `).run(feature_id, claimed_at ?? new Date().toISOString(), claimed_by_session, claim_text ?? null, source);

  return NextResponse.json({ id: result.lastInsertRowid, status: 'recorded' }, { status: 201 });
}

// ============================================================================
// PATCH /api/feature-claims?id=N — reconcile a claim
// Bearer required.
// ============================================================================
export async function PATCH(req: Request) {
  // iter-208 #1509: the bearer check runs FIRST, like every other mutating route — a token-less
  // request is refused with 401 before the id is even looked at (tests/mutation-auth.test.ts).
  const parsed = await readAuthBody(req, ReconcileSchema);
  if (!parsed.ok) return parsed.res;
  const { reconciled_with, reconciler_id, reconciled_at } = parsed.data;

  const url = new URL(req.url);
  const idStr = url.searchParams.get('id');
  if (!idStr) return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const sqlite = await getRawSqlite();
  const result = sqlite.prepare(`
    UPDATE feature_claims
    SET reconciled_with = ?, reconciler_id = ?, reconciled_at = ?
    WHERE id = ?
  `).run(reconciled_with, reconciler_id ?? null, reconciled_at ?? new Date().toISOString(), id);

  if (result.changes === 0) {
    return NextResponse.json({ error: `claim ${id} not found` }, { status: 404 });
  }
  return NextResponse.json({ id, reconciled_with, status: 'reconciled' });
}
