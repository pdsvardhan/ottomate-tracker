// /api/deploy-artifacts — anti-gaslight Rule 5 substrate
// Records each deploy to a live URL for traceability + deploy-gap detection.
// 2026-05-13: added per worksheet § 0 design.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRawSqlite } from '@/lib/db/client';
import { readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const DeployCreateSchema = z.object({
  project_slug: z.string().min(1),
  feature_ids: z.array(z.string()).min(0),
  commit_sha: z.string().min(7),
  deploy_url: z.string().url(),
  deployed_at: z.string().optional(),
  deployed_by_session: z.string().optional(),
  smoke_test_passed: z.boolean().optional(),
  smoke_test_run_id: z.number().int().nullable().optional(),
  rollback_of: z.number().int().nullable().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// GET /api/deploy-artifacts
// Query params: project_slug, since (ISO), limit
// ============================================================================
export async function GET(req: Request) {
  const url = new URL(req.url);
  const project_slug = url.searchParams.get('project_slug');
  const since = url.searchParams.get('since');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);

  const sqlite = await getRawSqlite();
  const where: string[] = [];
  const params: unknown[] = [];
  if (project_slug) { where.push('project_slug = ?'); params.push(project_slug); }
  if (since) { where.push('deployed_at >= ?'); params.push(since); }

  const sql = `
    SELECT * FROM deploy_artifacts
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY deployed_at DESC
    LIMIT ?`;
  params.push(limit);
  const rows = (sqlite.prepare(sql).all(...params) as Array<Record<string, unknown>>).map((r) => ({
    ...r,
    feature_ids: typeof r.feature_ids === 'string' ? JSON.parse(r.feature_ids) : r.feature_ids,
    smoke_test_passed: r.smoke_test_passed === 1 ? true : r.smoke_test_passed === 0 ? false : null,
  }));
  return NextResponse.json({ deploys: rows, count: rows.length });
}

// ============================================================================
// POST /api/deploy-artifacts — record a new deploy
// ============================================================================
export async function POST(req: Request) {
  const parsed = await readAuthBody(req, DeployCreateSchema);
  if (!parsed.ok) return parsed.res;
  const d = parsed.data;

  const sqlite = await getRawSqlite();
  const proj = sqlite.prepare('SELECT slug FROM projects WHERE slug = ?').get(d.project_slug);
  if (!proj) return NextResponse.json({ error: `project ${d.project_slug} not found` }, { status: 404 });

  const result = sqlite.prepare(`
    INSERT INTO deploy_artifacts
      (project_slug, feature_ids, commit_sha, deploy_url, deployed_at, deployed_by_session,
       smoke_test_passed, smoke_test_run_id, rollback_of, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.project_slug,
    JSON.stringify(d.feature_ids),
    d.commit_sha,
    d.deploy_url,
    d.deployed_at ?? new Date().toISOString(),
    d.deployed_by_session ?? null,
    d.smoke_test_passed === undefined ? null : (d.smoke_test_passed ? 1 : 0),
    d.smoke_test_run_id ?? null,
    d.rollback_of ?? null,
    d.notes ?? null,
  );

  return NextResponse.json({ id: result.lastInsertRowid, status: 'recorded' }, { status: 201 });
}
