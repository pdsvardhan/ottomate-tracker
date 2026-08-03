// POST /api/verify/project/[slug] — enqueue a single-project verification run (BP-4).
// Bearer required. Returns 202 + the queued run.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthBody } from '@/lib/api';
import { enqueueVerify } from '@/lib/verify-queue';

export const runtime = 'nodejs';
const Schema = z.object({}).passthrough();
interface Ctx {
  params: Promise<{ slug: string }>;
}

export async function POST(req: Request, { params }: Ctx) {
  const r = await readAuthBody(req, Schema);
  if (!r.ok) return r.res;
  const { slug } = await params;
  const run = await enqueueVerify({ scope: 'project', project_slug: slug });
  return NextResponse.json({ ok: true, run }, { status: 202 });
}
