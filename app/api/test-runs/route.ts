// /api/test-runs — anti-gaslight Rule 4 substrate
// Records each CI test invocation for regression detection.
// 2026-05-13: added per worksheet § 0 design.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRawSqlite } from '@/lib/db/client';
import { readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const TestRunCreateSchema = z.object({
  project_slug: z.string().min(1),
  commit_sha: z.string().min(7),
  branch: z.string().optional(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  result: z.enum(['passed', 'failed', 'partial', 'errored', 'running']),
  total: z.number().int().nonnegative().optional(),
  passed: z.number().int().nonnegative().optional(),
  failed: z.number().int().nonnegative().optional(),
  skipped: z.number().int().nonnegative().optional(),
  per_test_results: z.unknown().optional(), // JSON-serialized at write
  triggered_by: z.enum(['push', 'schedule', 'manual', 'iteration']).optional(),
  iteration_id: z.number().int().nullable().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// GET /api/test-runs
// Query params: project_slug, result, branch, commit_sha, latest (1=most recent only), limit
// ============================================================================
export async function GET(req: Request) {
  const url = new URL(req.url);
  const project_slug = url.searchParams.get('project_slug');
  const result = url.searchParams.get('result');
  const branch = url.searchParams.get('branch');
  const commit_sha = url.searchParams.get('commit_sha');
  const latest = url.searchParams.get('latest') === '1';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);

  const sqlite = await getRawSqlite();
  const where: string[] = [];
  const params: unknown[] = [];
  if (project_slug) { where.push('project_slug = ?'); params.push(project_slug); }
  if (result) { where.push('result = ?'); params.push(result); }
  if (branch) { where.push('branch = ?'); params.push(branch); }
  if (commit_sha) { where.push('commit_sha = ?'); params.push(commit_sha); }

  const sql = `
    SELECT * FROM test_runs
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY started_at DESC
    LIMIT ?`;
  params.push(latest ? 1 : limit);
  const rows = (sqlite.prepare(sql).all(...params) as Array<Record<string, unknown>>).map((r) => ({
    ...r,
    per_test_results: typeof r.per_test_results === 'string' && r.per_test_results
      ? safeJsonParse(r.per_test_results as string)
      : r.per_test_results,
  }));
  if (latest) return NextResponse.json({ test_run: rows[0] ?? null });
  return NextResponse.json({ test_runs: rows, count: rows.length });
}

// ============================================================================
// POST /api/test-runs — record a new test run
// ============================================================================
export async function POST(req: Request) {
  const parsed = await readAuthBody(req, TestRunCreateSchema);
  if (!parsed.ok) return parsed.res;
  const t = parsed.data;

  const sqlite = await getRawSqlite();
  const proj = sqlite.prepare('SELECT slug FROM projects WHERE slug = ?').get(t.project_slug);
  if (!proj) return NextResponse.json({ error: `project ${t.project_slug} not found` }, { status: 404 });

  const result = sqlite.prepare(`
    INSERT INTO test_runs
      (project_slug, commit_sha, branch, started_at, completed_at, result,
       total, passed, failed, skipped, per_test_results, triggered_by, iteration_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    t.project_slug,
    t.commit_sha,
    t.branch ?? null,
    t.started_at ?? new Date().toISOString(),
    t.completed_at ?? null,
    t.result,
    t.total ?? null,
    t.passed ?? null,
    t.failed ?? null,
    t.skipped ?? null,
    t.per_test_results === undefined ? null : JSON.stringify(t.per_test_results),
    t.triggered_by ?? null,
    t.iteration_id ?? null,
    t.notes ?? null,
  );

  return NextResponse.json({ id: result.lastInsertRowid, status: 'recorded' }, { status: 201 });
}

function safeJsonParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}
