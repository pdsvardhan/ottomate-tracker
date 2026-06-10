// Test env bootstrap — MUST run before any route/lib module is imported.
//
// 1) lib/db/client.ts computes DB_PATH from DATABASE_URL at module load
//    (verified 2026-06-10: `const DB_PATH = process.env.DATABASE_URL?...` is
//    top-level), so the env is set HERE, in a vitest setupFile, before any
//    test-file import graph loads. lib/db/client is imported DYNAMICALLY below
//    for the same reason — a static import would hoist above the env
//    assignment and point the client at the live DB.
//
// 2) drizzle's journal only lists 0000/0001; the 0002-0006 + audit-* deltas
//    were hand-applied to the live DB and never journaled. As of 2026-06-10
//    (task #11) lib/db/client.ts's getDb() bootstrap handles this itself:
//    after migrate() it runs ensureFreshSchema(), which applies
//    fresh-catchup.sql (generated from the live schema, proven to reproduce it
//    exactly) on any DB missing the deltas. So tests just call getRawSqlite()
//    and get a complete schema — no hand-maintained migration list here.
//
// Each isolated vitest worker gets its own throwaway DB under /tmp.
// The live DB (data/ottomate.db) is never touched.

import { randomBytes } from 'node:crypto';

if (!process.env.DATABASE_URL?.includes('/tmp/ottomate-test-')) {
  process.env.DATABASE_URL = `file:/tmp/ottomate-test-${process.pid}-${randomBytes(6).toString('hex')}.db`;
}
// lib/auth.ts reads TRACKER_API_TOKEN_FILE first — make sure a stray env from
// the shell can't shadow the test token.
delete process.env.TRACKER_API_TOKEN_FILE;
process.env.TRACKER_API_TOKEN = 'test-token-123';

// Dynamic import AFTER env is set (see header). Same module instance the
// route handlers get — vite dedupes by resolved path. getRawSqlite() triggers
// the full bootstrap: journaled migrate() (0000/0001) + ensureFreshSchema()
// (applies fresh-catchup.sql on the fresh /tmp DB — same path the production
// container uses for a cold clone). No hand-maintained migration list here
// anymore: fresh-catchup.sql is the single source of truth (task #11).
const { getRawSqlite } = await import('../lib/db/client');
await getRawSqlite();
