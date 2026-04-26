// /api/skill-events — POST: skill emits lifecycle events for the tracker to log.
// Generic JSON payload, stamped with timestamp. Useful for future audit + UI live updates.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const SkillEventSchema = z.object({
  event_type: z.enum([
    'session-start', 'session-end', 'pack-up',
    'stage-1-start', 'stage-1-complete',
    'stage-2-start', 'stage-2-complete',
    'stage-3-start', 'stage-3-complete',
    'stage-4-start', 'stage-4-complete',
    'lock-in-gate', 'verifier-dispatched', 'verifier-result',
    'sanity-check-failed', 'auto-fix-loop-exhausted',
    'misc',
  ]),
  project_slug: z.string().optional(),
  iteration_id: z.number().int().optional(),
  payload: z.unknown().optional(),
});

export async function POST(req: Request) {
  const result = await readAuthBody(req, SkillEventSchema);
  if (!result.ok) return result.res;
  // For now, append-only log to stdout — Phase 9 will persist these.
  const event = {
    received_at: new Date().toISOString(),
    ...result.data,
  };
  console.info('[skill-event]', JSON.stringify(event));
  return NextResponse.json({ ok: true, event });
}
