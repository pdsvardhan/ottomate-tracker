// Contract tests: /api/health, /api/sanity-check, /api/search, /api/backup.
// Handlers are imported directly and called with Request objects against a
// throwaway /tmp DB (see tests/setup.ts) — the live DB is never touched.

import { describe, it, expect } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import Database from 'better-sqlite3';
import { authHeaders, makeReq } from './helpers';
import { GET as healthGet } from '@/app/api/health/route';
import { GET as searchGet } from '@/app/api/search/route';
import { GET as sanityGet } from '@/app/api/sanity-check/route';
import { POST as backupPost } from '@/app/api/backup/route';

describe('/api/health', () => {
  it('GET returns 200 with db connected', async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.db).toBe('connected');
  });
});

describe('/api/sanity-check', () => {
  it('GET ?phase=bootstrap returns a verdict and includes the wal-integrity check', async () => {
    const res = await sanityGet(makeReq('GET', '/api/sanity-check?phase=bootstrap'));
    expect(res.status).toBe(200);
    const json = await res.json();
    // Fresh test DB has an empty risks_catalog, so db-schema-healthy may fail
    // → verdict can legitimately be BLOCKED here. Shape is what we contract on.
    expect(['PROCEED', 'BLOCKED']).toContain(json.sanity_check.verdict);
    expect(Array.isArray(json.sanity_check.checks)).toBe(true);
    const ids = json.sanity_check.checks.map((c: { id: string }) => c.id);
    expect(ids).toContain('wal-integrity');
  });
});

describe('/api/search', () => {
  it('GET with q returns 200 with {q, total, grouped} shape (FTS may be empty)', async () => {
    const res = await searchGet(makeReq('GET', '/api/search?q=nonexistentterm'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.q).toBe('nonexistentterm');
    expect(typeof json.total).toBe('number');
    expect(json.grouped).toBeTypeOf('object');
  });

  it('GET with a too-short q returns 400', async () => {
    const res = await searchGet(makeReq('GET', '/api/search?q=x'));
    expect(res.status).toBe(400);
  });
});

describe('/api/backup', () => {
  it('POST without auth returns 401', async () => {
    const res = await backupPost(makeReq('POST', '/api/backup'));
    expect(res.status).toBe(401);
  });

  it('POST with auth vacuums a clean snapshot next to the test DB', async () => {
    const res = await backupPost(makeReq('POST', '/api/backup', undefined, authHeaders()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.method).toBe('vacuum_into');
    // Route writes to <dirname(DATABASE_URL)>/backups — for the test DB that
    // is /tmp/backups, NOT the live data/backups dir.
    expect(json.path.startsWith('/tmp/')).toBe(true);
    expect(existsSync(json.path)).toBe(true);
    expect(json.size_bytes).toBeGreaterThan(0);
    const check = new Database(json.path, { readonly: true });
    const integrity = check.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    check.close();
    expect(integrity.integrity_check).toBe('ok');
    unlinkSync(json.path); // clean up the /tmp/backups artifact
  });
});
