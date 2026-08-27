-- 0014 - written-off anti-gaslight violations (2026-08-27, Plan B item B4).
--
-- HAND-WRITTEN, hand-journaled (same discipline as 0007-0013). Do NOT run
-- drizzle-kit generate/migrate.
--
-- WHY. A violation could be true, understood, and deliberately accepted - and there was
-- nowhere to say so. adr-048 wrote off three July deploys with a stated reason and recorded
-- the consequence plainly: "There is no 'written off with a reason' state in the anti-gaslight
-- tool: R5 is a pure query over two tables, so the only ways to clear it are to fabricate test
-- runs or destroy deploy history. Both are worse than a red mark." So the violation stays red
-- forever, and a permanent red trains people to stop reading red - which is the failure this
-- whole subsystem exists to prevent.
--
-- WHAT THIS IS NOT. It is not a way to make a violation go away. A written-off row is still
-- reported; it moves to a separate `written_off` list with its reason and its ADR, and it stops
-- inflating the count. The evidence is preserved, not deleted. Requiring an ADR id is the point:
-- writing one off costs a decision record, which is more friction than fixing it deserves to be.
--
-- Keyed on (rule, project_slug, item_id) so it generalises to any rule, not just R5. item_id is
-- TEXT because rules key on different id shapes (deploy_artifacts.id, feature ids, commit shas).

CREATE TABLE IF NOT EXISTS violation_writeoffs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  rule           TEXT NOT NULL,
  project_slug   TEXT NOT NULL,
  item_id        TEXT NOT NULL,
  reason         TEXT NOT NULL,
  adr_id         TEXT NOT NULL,
  written_off_at TEXT NOT NULL DEFAULT (datetime('now')),
  written_off_by TEXT,
  UNIQUE (rule, project_slug, item_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_violation_writeoffs_lookup
  ON violation_writeoffs (rule, project_slug);
