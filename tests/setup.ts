// Test env bootstrap — MUST run before any route/lib module is imported.
//
// 1) lib/db/client.ts computes DB_PATH from DATABASE_URL at module load
//    (verified 2026-06-10: `const DB_PATH = process.env.DATABASE_URL?...` is
//    top-level), so the env is set HERE, in a vitest setupFile, before any
//    test-file import graph loads. lib/db/client is imported DYNAMICALLY below
//    for the same reason — a static import would hoist above the env
//    assignment and point the client at the live DB.
//
// 2) drizzle's migration journal (lib/db/migrations/meta/_journal.json) only
//    contains 0000+0001. Migrations 0002/0003 and the audit-2026-* files were
//    applied to the live DB manually and never journaled, so a fresh DB from
//    getDb()'s migrate() is missing schema that lib/db/schema.ts expects
//    (e.g. projects.archived, adr_index.anchored_to) plus the raw ledger
//    tables (feature_claims / deploy_artifacts / test_runs). We exec those
//    files here. 0004/0005/0006 are live-data-only migrations (no DDL) and
//    audit 0004/0005 use `ADD COLUMN IF NOT EXISTS` (not valid SQLite) for
//    columns the drizzle schema doesn't reference — both groups are skipped.
//
// Each isolated vitest worker gets its own throwaway DB under /tmp.
// The live DB (data/ottomate.db) is never touched.

import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

if (!process.env.DATABASE_URL?.includes('/tmp/ottomate-test-')) {
  process.env.DATABASE_URL = `file:/tmp/ottomate-test-${process.pid}-${randomBytes(6).toString('hex')}.db`;
}
// lib/auth.ts reads TRACKER_API_TOKEN_FILE first — make sure a stray env from
// the shell can't shadow the test token.
delete process.env.TRACKER_API_TOKEN_FILE;
process.env.TRACKER_API_TOKEN = 'test-token-123';

const MANUAL_MIGRATIONS = [
  'lib/db/migrations/0002_iteration5_foundation.sql',
  'lib/db/migrations/0003_chunk3_archived_col.sql',
  'lib/db/migrations/audit-2026-04-29/0001_phase_transitions.sql',
  'lib/db/migrations/audit-2026-04-29/0002_intent_drafts.sql',
  'lib/db/migrations/audit-2026-04-29/0003_sanity_check_runs.sql',
  'lib/db/migrations/audit-2026-04-29/0006_drift_resolutions.sql',
  'lib/db/migrations/audit-2026-04-29/0007_skill_events.sql',
  'lib/db/migrations/audit-2026-05-13/0008_feature_claims_deploy_artifacts_test_runs.sql',
];

// Dynamic import AFTER env is set (see header). Same module instance the
// route handlers get — vite dedupes by resolved path.
const { getRawSqlite } = await import('../lib/db/client');
const sqlite = await getRawSqlite(); // triggers journaled migrate() on the fresh DB

for (const file of MANUAL_MIGRATIONS) {
  try {
    sqlite.exec(readFileSync(path.join(process.cwd(), file), 'utf8'));
  } catch (err) {
    // Fresh DB → all statements should apply; surface loudly if one doesn't.
    console.warn(`[tests/setup] manual migration ${file} failed:`, err);
  }
}
