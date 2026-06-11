// DB client — Codex P0 #1 fix: migration-first bootstrap with promise mutex.
// Don't copy tasks-dashboard's _sqlite-before-runBootstrap race.

import { readFileSync, existsSync, readdirSync, readlinkSync } from 'node:fs';
import { basename } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || './data/ottomate.db';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;
let _sqlite: Database.Database | null = null;
let _bootstrap_promise: Promise<DrizzleDb> | null = null;

/**
 * Get DB client. Awaits migration completion before returning.
 * All callers MUST await this — never use module-level _db directly.
 */
export async function getDb() {
  if (_db) return _db;
  if (_bootstrap_promise) return _bootstrap_promise;

  _bootstrap_promise = (async () => {
    const sqlite = new Database(DB_PATH);
    // adr-018: rollback journal (TRUNCATE), not WAL. Both 2026-06 data-loss
    // incidents were the WAL orphaned-shm cascade: the app's DMS lock lived on
    // a deleted -shm inode, external clients saw a lockless DB and unlinked the
    // -wal underneath us, and commits landed in a deleted file. With no -wal /
    // -shm files, that class cannot exist. Single-user localhost load does not
    // need WAL concurrency; synchronous=FULL because durability beats latency.
    sqlite.pragma('journal_mode = TRUNCATE');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('synchronous = FULL');
    sqlite.pragma('busy_timeout = 5000');

    const db = drizzle(sqlite, { schema });

    // Codex P0 #1: migration-first. App doesn't proceed until DDL complete.
    try {
      migrate(db, { migrationsFolder: './lib/db/migrations' });
      ensureFreshSchema(sqlite);
      setupFts5(sqlite);
    } catch (err) {
      console.error('[ottomate] Migration failed:', err);
      throw new Error(`DB bootstrap failed: ${err}`);
    }

    _db = db;
    _sqlite = sqlite;
    return db;
  })();

  return _bootstrap_promise;
}

/**
 * Raw better-sqlite3 handle. Use for FTS5 / virtual-table queries that
 * fall outside drizzle's typed schema (e.g. /api/search).
 */
export async function getRawSqlite(): Promise<Database.Database> {
  await getDb();
  if (!_sqlite) throw new Error('SQLite handle not initialised');
  return _sqlite;
}

// adr-018: deleted-fd self-check — the mid-session tripwire for the WAL-split
// class. If any of this process's fds to the database files point at deleted
// inodes, "successful" commits are going into a file nobody else can see.
// Mutations refuse with 503 instead of faking 200s (see lib/api.ts), and
// /api/health degrades. Cached 30s; /proc scan is cheap but not free.
let _fdCheckCache: { at: number; deleted: string[] } | null = null;

export function scanDeletedDbFds(): string[] {
  if (_fdCheckCache && Date.now() - _fdCheckCache.at < 30_000) return _fdCheckCache.deleted;
  const dbBase = basename(DB_PATH);
  const deleted: string[] = [];
  try {
    for (const fd of readdirSync('/proc/self/fd')) {
      try {
        const target = readlinkSync(`/proc/self/fd/${fd}`);
        if (target.includes(dbBase) && target.endsWith('(deleted)')) deleted.push(target);
      } catch {
        // fd closed mid-scan
      }
    }
  } catch {
    // non-linux dev environment — no /proc
  }
  _fdCheckCache = { at: Date.now(), deleted };
  return deleted;
}

// Fresh-install catch-up (task #11, 2026-06-10). drizzle's journal only lists
// 0000/0001, but migrations 0002-0006 + the audit-* dirs were hand-applied to
// the live DB and never journaled — so migrate() leaves a fresh clone missing
// ~20 tables + columns and the app crashes on boot. `fresh-catchup.sql` is
// generated from the live schema (ground truth) and verified to reproduce it
// exactly. Gated on a sentinel (feature_claims = the last delta's table) so it
// is a strict no-op on the live/migrated DB. Runs before setupFts5.
function ensureFreshSchema(sqlite: Database.Database) {
  const hasDelta = sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='feature_claims'`)
    .get();
  if (hasDelta) return; // live or already-caught-up DB → nothing to do
  const file = './lib/db/migrations/fresh-catchup.sql';
  if (!existsSync(file)) {
    console.warn('[ottomate] fresh DB but fresh-catchup.sql missing — schema will be incomplete');
    return;
  }
  sqlite.exec(readFileSync(file, 'utf8'));
  console.log('[ottomate] fresh DB detected — applied fresh-catchup.sql (un-journaled delta schema)');
}

// FTS5 setup — idempotent. Builds the cross-doc search index used by /api/search.
function setupFts5(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS ottomate_fts USING fts5(
      doc_type UNINDEXED,
      doc_id UNINDEXED,
      project_slug UNINDEXED,
      title,
      body,
      tokenize = 'porter unicode61 remove_diacritics 2'
    );
  `);

  // Drop+recreate triggers so a schema change re-syncs the body expression.
  const triggers = [
    'fts_flows_ai', 'fts_flows_au', 'fts_flows_ad',
    'fts_features_ai', 'fts_features_au', 'fts_features_ad',
    'fts_pages_ai', 'fts_pages_au', 'fts_pages_ad',
    'fts_bugs_ai', 'fts_bugs_au', 'fts_bugs_ad',
    'fts_decisions_ai', 'fts_decisions_au', 'fts_decisions_ad',
  ];
  for (const t of triggers) sqlite.exec(`DROP TRIGGER IF EXISTS ${t};`);

  // ── flows ─────────────────────────────────────────────────────────────
  sqlite.exec(`
    CREATE TRIGGER fts_flows_ai AFTER INSERT ON flows BEGIN
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      VALUES ('flow', new.id, new.project_slug, new.title,
        COALESCE(new.notes,'') || ' ' || COALESCE(new.expected_outcome,'') || ' ' || COALESCE(new.trigger,''));
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER fts_flows_au AFTER UPDATE ON flows BEGIN
      DELETE FROM ottomate_fts WHERE doc_type = 'flow' AND doc_id = old.id;
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      VALUES ('flow', new.id, new.project_slug, new.title,
        COALESCE(new.notes,'') || ' ' || COALESCE(new.expected_outcome,'') || ' ' || COALESCE(new.trigger,''));
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER fts_flows_ad AFTER DELETE ON flows BEGIN
      DELETE FROM ottomate_fts WHERE doc_type = 'flow' AND doc_id = old.id;
    END;
  `);

  // ── features ──────────────────────────────────────────────────────────
  sqlite.exec(`
    CREATE TRIGGER fts_features_ai AFTER INSERT ON features BEGIN
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      VALUES ('feature', new.id, new.project_slug, new.title,
        COALESCE(new.short_description,'') || ' ' || COALESCE(new.notes,''));
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER fts_features_au AFTER UPDATE ON features BEGIN
      DELETE FROM ottomate_fts WHERE doc_type = 'feature' AND doc_id = old.id;
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      VALUES ('feature', new.id, new.project_slug, new.title,
        COALESCE(new.short_description,'') || ' ' || COALESCE(new.notes,''));
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER fts_features_ad AFTER DELETE ON features BEGIN
      DELETE FROM ottomate_fts WHERE doc_type = 'feature' AND doc_id = old.id;
    END;
  `);

  // ── pages ─────────────────────────────────────────────────────────────
  sqlite.exec(`
    CREATE TRIGGER fts_pages_ai AFTER INSERT ON pages BEGIN
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      VALUES ('page', new.id, new.project_slug, new.title,
        COALESCE(new.purpose,'') || ' ' || COALESCE(new.empty_state,'') || ' ' || COALESCE(new.error_state,''));
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER fts_pages_au AFTER UPDATE ON pages BEGIN
      DELETE FROM ottomate_fts WHERE doc_type = 'page' AND doc_id = old.id;
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      VALUES ('page', new.id, new.project_slug, new.title,
        COALESCE(new.purpose,'') || ' ' || COALESCE(new.empty_state,'') || ' ' || COALESCE(new.error_state,''));
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER fts_pages_ad AFTER DELETE ON pages BEGIN
      DELETE FROM ottomate_fts WHERE doc_type = 'page' AND doc_id = old.id;
    END;
  `);

  // ── bugs (integer id, store as text) ──────────────────────────────────
  sqlite.exec(`
    CREATE TRIGGER fts_bugs_ai AFTER INSERT ON bugs BEGIN
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      VALUES ('bug', CAST(new.id AS TEXT), new.project_slug, new.title, COALESCE(new.description,''));
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER fts_bugs_au AFTER UPDATE ON bugs BEGIN
      DELETE FROM ottomate_fts WHERE doc_type = 'bug' AND doc_id = CAST(old.id AS TEXT);
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      VALUES ('bug', CAST(new.id AS TEXT), new.project_slug, new.title, COALESCE(new.description,''));
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER fts_bugs_ad AFTER DELETE ON bugs BEGIN
      DELETE FROM ottomate_fts WHERE doc_type = 'bug' AND doc_id = CAST(old.id AS TEXT);
    END;
  `);

  // ── decisions (adr_index — body lives as MD in git, index just title+tags) ─
  sqlite.exec(`
    CREATE TRIGGER fts_decisions_ai AFTER INSERT ON adr_index BEGIN
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      VALUES ('decision', new.id, new.project_slug, new.title, COALESCE(new.tags, ''));
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER fts_decisions_au AFTER UPDATE ON adr_index BEGIN
      DELETE FROM ottomate_fts WHERE doc_type = 'decision' AND doc_id = old.id;
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      VALUES ('decision', new.id, new.project_slug, new.title, COALESCE(new.tags, ''));
    END;
  `);
  sqlite.exec(`
    CREATE TRIGGER fts_decisions_ad AFTER DELETE ON adr_index BEGIN
      DELETE FROM ottomate_fts WHERE doc_type = 'decision' AND doc_id = old.id;
    END;
  `);

  // First-time backfill: only if FTS table is empty.
  const row = sqlite.prepare('SELECT COUNT(*) AS n FROM ottomate_fts').get() as { n: number };
  if (row.n === 0) {
    sqlite.exec(`
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      SELECT 'flow', id, project_slug, title,
        COALESCE(notes,'') || ' ' || COALESCE(expected_outcome,'') || ' ' || COALESCE(trigger,'')
      FROM flows;
    `);
    sqlite.exec(`
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      SELECT 'feature', id, project_slug, title,
        COALESCE(short_description,'') || ' ' || COALESCE(notes,'')
      FROM features;
    `);
    sqlite.exec(`
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      SELECT 'page', id, project_slug, title,
        COALESCE(purpose,'') || ' ' || COALESCE(empty_state,'') || ' ' || COALESCE(error_state,'')
      FROM pages;
    `);
    sqlite.exec(`
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      SELECT 'bug', CAST(id AS TEXT), project_slug, title, COALESCE(description,'')
      FROM bugs;
    `);
    sqlite.exec(`
      INSERT INTO ottomate_fts(doc_type, doc_id, project_slug, title, body)
      SELECT 'decision', id, project_slug, title, COALESCE(tags, '')
      FROM adr_index;
    `);
  }
}

// Type-safe export for IDE support — actual usage MUST await getDb()
export type DbClient = Awaited<ReturnType<typeof getDb>>;

export { schema };
