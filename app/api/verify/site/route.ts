// POST /api/verify/site — enqueue a whole-site verification run (BP-4).
// Bearer required. Returns 202 + the queued run; the host-side runner executes it.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthBody } from '@/lib/api';
import { enqueueVerify } from '@/lib/verify-queue';

export const runtime = 'nodejs';
const Schema = z.object({}).passthrough();

export async function POST(req: Request) {
  const r = await readAuthBody(req, Schema);
  if (!r.ok) return r.res;
  const run = await enqueueVerify({ scope: 'site' });
  return NextResponse.json({ ok: true, run }, { status: 202 });
}
