// tests/mutation-auth.test.ts — every change needs the bearer token (iter-208 #1509, AC 933).
//
// Discovers EVERY route file under app/api, imports it, and calls each exported mutating handler
// (POST / PUT / PATCH / DELETE) with no Authorization header. Each must answer 401 before doing
// anything. A new route that forgets the guard — or swallows requireBearer's returned 401 in a
// try/catch, as skill-events / drift / drift resolve / extract-hints did until iter-208 — fails here.
//
// Runs against this worker's throwaway /tmp DB (tests/setup.ts); the verify queue is pointed at /tmp
// too, so even a regression could not enqueue a real run.

import { authHeaders } from './helpers';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

process.env.VERIFY_QUEUE_DIR = `/tmp/ottomate-test-verify-queue-${process.pid}`;

const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'api');
const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

// The catch-all answers 404 JSON for any method and touches no data — it is the one documented
// unauthenticated "mutation" in docs/api-inventory.md.
const EXEMPT = new Set(['[...notfound]']);

interface RouteFile { file: string; urlPath: string; params: Record<string, string | string[]> }

function discover(dir: string, segs: string[] = []): RouteFile[] {
  const out: RouteFile[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...discover(full, [...segs, name]));
    } else if (name === 'route.ts' && !segs.some((s) => EXEMPT.has(s))) {
      const params: Record<string, string | string[]> = {};
      const urlSegs = segs.map((s) => {
        const catchAll = s.match(/^\[\.\.\.(.+)\]$/);
        if (catchAll) { params[catchAll[1]!] = ['x']; return 'x'; }
        const dyn = s.match(/^\[(.+)\]$/);
        if (dyn) { params[dyn[1]!] = '1'; return '1'; }
        return s;
      });
      out.push({ file: full, urlPath: `/api/${urlSegs.join('/')}`, params });
    }
  }
  return out;
}

const routes = discover(API_ROOT);

type Handler = (req: Request, ctx: { params: Promise<Record<string, string | string[]>> }) => Promise<Response>;

async function handlersOf(r: RouteFile): Promise<[string, Handler][]> {
  const mod = (await import(r.file)) as Record<string, unknown>;
  return MUTATING.filter((m) => typeof mod[m] === 'function').map((m) => [m, mod[m] as Handler]);
}

function request(method: string, urlPath: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://ottomate.test${urlPath}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: '{}',
  });
}

describe('every mutating API route refuses a request without the bearer token', () => {
  it('discovers the whole API surface (guards against a vacuous pass)', async () => {
    let handlers = 0;
    for (const r of routes) handlers += (await handlersOf(r)).length;
    expect(routes.length).toBeGreaterThanOrEqual(120);
    expect(handlers).toBeGreaterThanOrEqual(130);
  });

  it('answers 401 for every POST / PUT / PATCH / DELETE with no Authorization header', async () => {
    const accepted: string[] = [];
    let checked = 0;
    for (const r of routes) {
      for (const [method, handler] of await handlersOf(r)) {
        const res = await handler(request(method, r.urlPath), { params: Promise.resolve(r.params) });
        checked += 1;
        if (res.status !== 401) accepted.push(`${method} ${r.urlPath} -> ${res.status}`);
      }
    }
    expect(accepted, `routes that did not refuse a token-less write:\n${accepted.join('\n')}`).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(130);
  });
});

describe('the four routes that used to swallow the 401 (iter-208 #1509)', () => {
  const fixed: [string, string, Record<string, string>][] = [
    ['skill-events/route.ts', '/api/skill-events', {}],
    ['drift/route.ts', '/api/drift', {}],
    ['drift/[id]/resolve/route.ts', '/api/drift/1/resolve', { id: '1' }],
    ['projects/[slug]/intent-drafts/extract-hints/route.ts', '/api/projects/x/intent-drafts/extract-hints', { slug: 'x' }],
  ];
  for (const [file, urlPath, params] of fixed) {
    it(`POST ${urlPath}: no token -> 401, wrong token -> 403`, async () => {
      const mod = (await import(path.join(API_ROOT, file))) as { POST: Handler };
      const ctx = () => ({ params: Promise.resolve(params) });
      expect((await mod.POST(request('POST', urlPath), ctx())).status).toBe(401);
      expect((await mod.POST(request('POST', urlPath, authHeaders('wrong-token')), ctx())).status).toBe(403);
    });
  }

  it('with the right token, skill-events still accepts the write', async () => {
    const mod = (await import(path.join(API_ROOT, 'skill-events/route.ts'))) as { POST: Handler };
    const req = new Request('http://ottomate.test/api/skill-events', {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ event_type: 'session-note', notes: 'contract test' }),
    });
    expect((await mod.POST(req, { params: Promise.resolve({}) })).status).toBe(201);
  });
});
