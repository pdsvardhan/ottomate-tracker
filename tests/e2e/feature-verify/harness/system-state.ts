// Feature-verify harness — SYSTEM-STATE assertions (Task 3). This layer IS the anti-gaslight:
// a 200 response is not proof; the file on disk / the DB row / the rescan is. Every assertion
// returns a structured result you fold into the case's system_state (never throws blind — the
// caller decides pass/fail/skipped so "couldn't check" is recorded, not silently green).

import { promises as fs } from 'node:fs';
import type { APIRequestContext } from '@playwright/test';

export interface StateCheck {
  ok: boolean;
  detail: string;
  observed?: unknown;
}

/** File on disk: exists + byte length (+ optional exact bytes). Reads the bytes back. */
export async function assertFileOnDisk(
  absPath: string,
  opts: { minBytes?: number; exactBytes?: Buffer } = {},
): Promise<StateCheck> {
  try {
    const buf = await fs.readFile(absPath);
    if (opts.exactBytes && !buf.equals(opts.exactBytes)) {
      return { ok: false, detail: `bytes differ (${buf.length} vs ${opts.exactBytes.length})`, observed: buf.length };
    }
    if (opts.minBytes !== undefined && buf.length < opts.minBytes) {
      return { ok: false, detail: `only ${buf.length} bytes (< ${opts.minBytes})`, observed: buf.length };
    }
    return { ok: true, detail: `${absPath} present, ${buf.length} bytes`, observed: buf.length };
  } catch (err) {
    return { ok: false, detail: `not readable: ${(err as Error).message}` };
  }
}

/** GET a tracker/app resource and run a predicate on the JSON — the ONE-DOOR DB assertion
 *  (never open the live .db with a second sqlite client; go through the app's own API). */
export async function assertViaApi<T = unknown>(
  request: APIRequestContext,
  url: string,
  predicate: (json: T) => StateCheck,
  opts: { headers?: Record<string, string> } = {},
): Promise<StateCheck> {
  const res = await request.get(url, { headers: opts.headers });
  if (!res.ok()) return { ok: false, detail: `GET ${url} → ${res.status()}` };
  let json: T;
  try {
    json = (await res.json()) as T;
  } catch {
    return { ok: false, detail: `GET ${url} → non-JSON body` };
  }
  return predicate(json);
}

/** Poll an async effect (a rescan, an index update) until it lands or times out. */
export async function pollUntil(
  fn: () => Promise<StateCheck>,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<StateCheck> {
  const timeout = opts.timeoutMs ?? 10_000;
  const interval = opts.intervalMs ?? 500;
  const start = Date.now();
  let last: StateCheck = { ok: false, detail: 'never ran' };
  while (Date.now() - start < timeout) {
    last = await fn();
    if (last.ok) return last;
    await new Promise((r) => setTimeout(r, interval));
  }
  return { ok: false, detail: `timed out after ${timeout}ms — last: ${last.detail}`, observed: last.observed };
}
