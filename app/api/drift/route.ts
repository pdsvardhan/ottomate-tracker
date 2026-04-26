// /api/drift — GET drift report across projects (Codex P0 #2).
// Used by the project banner + a future cross-project drift dashboard.

import { NextResponse } from 'next/server';
import { scanDrift } from '@/lib/sync/drift';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('project_slug') ?? undefined;
  const onlyDrifted = url.searchParams.get('only_drifted') === 'true';

  const all = await scanDrift(slug);
  const filtered = onlyDrifted ? all.filter((d) => d.state !== 'in-sync') : all;
  const summary = {
    total: all.length,
    drifted: all.filter((d) => d.state === 'drifted').length,
    missing_on_disk: all.filter((d) => d.state === 'missing-on-disk').length,
    no_mirror: all.filter((d) => d.state === 'no-mirror-recorded').length,
  };
  return NextResponse.json({ summary, entries: filtered });
}
