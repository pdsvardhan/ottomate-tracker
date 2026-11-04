'use server';
// Server action for the "Verify site" button (BP-4). Runs server-side, so it enqueues
// via the lib directly — no client-side bearer token exposed. The host-side runner
// (run.mjs queue) actually executes the run.
//
// iter-208 #1509 (adr-026): a Next server action is reachable by POSTing its action id to ANY
// page path, including the public showcase paths, so it cannot rely on /coverage being private.
// It refuses in the visitor view: only the signed-in or LAN owner can enqueue a run.
import { enqueueVerify } from '@/lib/verify-queue';
import { getViewer } from '@/lib/viewer-server';

export async function requestSiteVerify(): Promise<{ id: string; status: string }> {
  const { owner } = await getViewer();
  if (!owner) throw new Error('Owner sign-in required to request a site verification.');
  const run = await enqueueVerify({ scope: 'site', requested_by: 'ui' });
  return { id: run.id, status: run.status };
}
