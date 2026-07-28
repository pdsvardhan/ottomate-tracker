// /api/test-runs/[id] — prune a single test_runs row (bearer-gated mutation; send a JSON body,
// e.g. {"reason":"..."}). Mirrors DELETE /api/feature-verification-reports/[id]: the nightly/CI
// substrate accumulates disposable dogfood/smoke/demo rows (rule 9) and had no prune door. Real
// audit runs are left in place. Added 2026-07-29 (Task-3 P3-C tail).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRawSqlite } from '@/lib/db/client';
import { badRequest, notFound, readAuthBody, parseIntId } from '@/lib/api';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ id: string }>; }

const DeleteBody = z.object({ reason: z.string().max(500).optional() });

export async function DELETE(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, DeleteBody);
  if (!result.ok) return result.res;
  const { id } = await params;
  const n = parseIntId(id);
  if (n === null) return badRequest('id must be an integer');
  const sqlite = await getRawSqlite();
  const row = sqlite.prepare('SELECT id FROM test_runs WHERE id = ?').get(n);
  if (!row) return notFound(`test run ${id} not found`);
  sqlite.prepare('DELETE FROM test_runs WHERE id = ?').run(n);
  return NextResponse.json({ ok: true, deleted: n });
}
