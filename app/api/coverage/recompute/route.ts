// POST /api/coverage/recompute — backfill feature.test_status from linked flows.
// The roll-up ("AND of linked flows") is driven on each flow-test write; this
// recomputes EVERY feature at once — a one-time backfill and a manual re-sync.
// Bearer required (mutation). Body is ignored (send {}).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db/client';
import { readAuthBody } from '@/lib/api';
import { recomputeAllFeatures } from '@/lib/feature-rollup';

export const runtime = 'nodejs';

const Schema = z.object({}).passthrough();

export async function POST(req: Request) {
  const result = await readAuthBody(req, Schema);
  if (!result.ok) return result.res;
  const db = await getDb();
  const all = recomputeAllFeatures(db);
  const derived = all.filter((r) => r.linked_flows > 0);
  return NextResponse.json({
    ok: true,
    features_total: all.length,
    features_with_flows: derived.length,
    results: derived,
  });
}
