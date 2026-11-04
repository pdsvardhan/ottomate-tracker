-- 0016 - the showcase marker on a to-do (iter-208 item 1513, locked by the owner 2026-11-04).
--
-- HAND-WRITTEN, hand-journaled (same discipline as 0007-0015). Do NOT run drizzle-kit
-- generate/migrate.
--
-- WHY. The showcase's "What's next" listed raw to-dos: file paths, line numbers, and on Cointrail
-- masked card digits and bank names. The owner wants only to-dos marked for display, each shown by
-- a plain-English title. project_todos has no JSON field that could carry a marker (blocked_by is a
-- number[]), so this is one nullable column: NULL = internal (never shown, the default for every
-- existing row); a value = marked for display AND the title the showcase prints. The raw title and
-- body never reach the page.
--
-- Fresh DBs: 0015 creates project_todos (CREATE TABLE IF NOT EXISTS) before this runs, and
-- fresh-catchup.sql only does CREATE TABLE IF NOT EXISTS on it, so the column survives both paths.

ALTER TABLE project_todos ADD COLUMN showcase_title TEXT;
