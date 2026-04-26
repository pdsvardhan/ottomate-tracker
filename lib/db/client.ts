// DB client — Codex P0 #1 fix: migration-first bootstrap with promise mutex.
// Don't copy tasks-dashboard's _sqlite-before-runBootstrap race.

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || './data/ottomate.db';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;
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
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('synchronous = NORMAL');

    const db = drizzle(sqlite, { schema });

    // Codex P0 #1: migration-first. App doesn't proceed until DDL complete.
    try {
      migrate(db, { migrationsFolder: './lib/db/migrations' });
    } catch (err) {
      console.error('[ottomate] Migration failed:', err);
      throw new Error(`DB bootstrap failed: ${err}`);
    }

    _db = db;
    return db;
  })();

  return _bootstrap_promise;
}

// Type-safe export for IDE support — actual usage MUST await getDb()
export type DbClient = Awaited<ReturnType<typeof getDb>>;

export { schema };
