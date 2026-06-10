// Shared contract-test helpers. Import this module FIRST in every test file:
// its './setup' import guarantees the throwaway DATABASE_URL + test token are
// set before any route module pulls in lib/db/client.ts.

import './setup';

export const TEST_TOKEN = 'test-token-123';

/** Absolute path of this worker's throwaway SQLite DB (under /tmp). */
export function testDbPath(): string {
  return (process.env.DATABASE_URL ?? '').replace('file:', '');
}

export function authHeaders(token: string = TEST_TOKEN): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

/** Build a fetch Request against a fake absolute origin (routes call new URL(req.url)). */
export function makeReq(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): Request {
  const absolute = url.startsWith('http') ? url : `http://ottomate.test${url}`;
  return new Request(absolute, {
    method,
    headers: headers ?? (body !== undefined ? { 'content-type': 'application/json' } : undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Next.js 15+ dynamic-route context: params is a Promise. */
export function ctx<P extends Record<string, string>>(params: P): { params: Promise<P> } {
  return { params: Promise.resolve(params) };
}
