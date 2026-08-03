'use server';
// Server action for the "Verify site" button (BP-4). Runs server-side, so it enqueues
// via the lib directly — no client-side bearer token exposed. The host-side runner
// (run.mjs queue) actually executes the run.
import { enqueueVerify } from '@/lib/verify-queue';

export async function requestSiteVerify(): Promise<{ id: string; status: string }> {
  const run = await enqueueVerify({ scope: 'site', requested_by: 'ui' });
  return { id: run.id, status: run.status };
}
