// GET /api/verify/[id] — poll a verification run's status (BP-4). Read-only, open
// (same as /api/coverage) so the in-app button can poll without a client-side token.
import { NextResponse } from 'next/server';
import { readVerify } from '@/lib/verify-queue';

export const runtime = 'nodejs';
interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const run = await readVerify(id);
  if (!run) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ run });
}
