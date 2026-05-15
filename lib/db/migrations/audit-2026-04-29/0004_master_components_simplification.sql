-- Migration 0004: master_components storage redesign (CC-2.3 lightweight version)
-- Per user decision: DB row = lightweight index (id, name, category, description,
-- source_code_path); source code lives on filesystem at
-- /mnt/storage/ottomate/assets/components/<id>/<primary_file>.
--
-- DROPS the large source_code blob column (if it existed in v3 design).
-- ADDS source_code_path + primary_file pointer columns.

-- For SQLite, "ALTER TABLE DROP COLUMN" is supported in 3.35+. Verify with:
--   SELECT sqlite_version();
-- If older, use the column-rename idiom (CREATE NEW + INSERT FROM OLD + DROP OLD).

-- Path A — modern SQLite (3.35+):
ALTER TABLE master_components DROP COLUMN IF EXISTS source_code;

ALTER TABLE master_components ADD COLUMN IF NOT EXISTS source_code_path TEXT;
ALTER TABLE master_components ADD COLUMN IF NOT EXISTS primary_file TEXT;
ALTER TABLE master_components ADD COLUMN IF NOT EXISTS license_note TEXT;

-- Backfill source_code_path for existing rows
UPDATE master_components
SET source_code_path = '/mnt/storage/ottomate/assets/components/' || id || '/'
WHERE source_code_path IS NULL;

-- Set primary_file default for existing seed entries (assume react.tsx)
UPDATE master_components
SET primary_file = 'react.tsx'
WHERE primary_file IS NULL;

-- Path B — older SQLite (if Path A fails, comment out Path A and uncomment below):
-- (rename old → new, copy data, drop old, rename back)
-- BEGIN TRANSACTION;
-- CREATE TABLE master_components_new (
--   id            TEXT PRIMARY KEY,
--   name          TEXT NOT NULL,
--   category      TEXT NOT NULL,
--   description   TEXT NOT NULL,
--   source_code_path TEXT NOT NULL,
--   primary_file  TEXT,
--   framework_tags TEXT,
--   tags          TEXT,
--   dependencies  TEXT,
--   variants_json TEXT,
--   preview_url   TEXT,
--   license_note  TEXT,
--   created_at    TEXT NOT NULL,
--   updated_at    TEXT NOT NULL
-- );
-- INSERT INTO master_components_new SELECT
--   id, name, category, description,
--   '/mnt/storage/ottomate/assets/components/' || id || '/',
--   'react.tsx',
--   framework_tags, tags, dependencies, variants_json,
--   preview_url, NULL,
--   created_at, updated_at
-- FROM master_components;
-- DROP TABLE master_components;
-- ALTER TABLE master_components_new RENAME TO master_components;
-- CREATE INDEX idx_mc_category ON master_components(category);
-- CREATE INDEX idx_mc_tags ON master_components(tags);
-- COMMIT;
