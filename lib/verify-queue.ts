// A tiny FILE-based run-request queue for the "Verify site" trigger (BP-4).
// The tracker is prod-docker and CANNOT run the Playwright/sandbox harness in-process,
// so the API only ENQUEUES a request into the shared ./data volume; the host-side
// run.mjs (queue mode) is the consumer that actually runs planFullSite on sandboxes and
// writes the result back. One writer per run file + one consumer → no locking needed.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const QUEUE_DIR = process.env.VERIFY_QUEUE_DIR ?? '/app/data/verify-queue';

export type VerifyStatus = 'queued' | 'running' | 'done' | 'error';

export interface VerifyRun {
  id: string;
  scope: 'site' | 'project';
  project_slug: string | null;
  status: VerifyStatus;
  requested_at: string;
  requested_by: string;
  started_at: string | null;
  finished_at: string | null;
  plan: unknown | null;
  results: unknown | null;
  error: string | null;
}

const sanitize = (id: string) => String(id).replace(/[^\w.-]/g, '_');
const fileFor = (id: string) => path.join(QUEUE_DIR, `${sanitize(id)}.json`);

export function queueDir(): string {
  return QUEUE_DIR;
}

export async function enqueueVerify(input: {
  scope: 'site' | 'project';
  project_slug?: string | null;
  requested_by?: string;
}): Promise<VerifyRun> {
  await fs.mkdir(QUEUE_DIR, { recursive: true });
  const id = `vr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const run: VerifyRun = {
    id,
    scope: input.scope,
    project_slug: input.project_slug ?? null,
    status: 'queued',
    requested_at: new Date().toISOString(),
    requested_by: input.requested_by ?? 'user',
    started_at: null,
    finished_at: null,
    plan: null,
    results: null,
    error: null,
  };
  await fs.writeFile(fileFor(id), JSON.stringify(run, null, 2));
  return run;
}

export async function readVerify(id: string): Promise<VerifyRun | null> {
  try {
    return JSON.parse(await fs.readFile(fileFor(id), 'utf8')) as VerifyRun;
  } catch {
    return null;
  }
}

export async function listVerify(limit = 20): Promise<VerifyRun[]> {
  try {
    const files = (await fs.readdir(QUEUE_DIR)).filter((f) => f.endsWith('.json'));
    const runs = await Promise.all(
      files.map(async (f) => JSON.parse(await fs.readFile(path.join(QUEUE_DIR, f), 'utf8')) as VerifyRun),
    );
    return runs.sort((a, b) => b.requested_at.localeCompare(a.requested_at)).slice(0, limit);
  } catch {
    return [];
  }
}
