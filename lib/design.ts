// lib/design.ts — N2 (2026-07-28): the design index as a STATUS BOARD.
//
// A "target" is the set of design_decisions rows sharing target_id. Everything the board needs —
// what kind it is, how far it has got, how many axes are still open — is derivable from those rows,
// so there is NO schema change (the same lesson as the design surface itself). This module is the
// pure, unit-tested summariser; the page renders it.

export type TargetStatus = 'final' | 'in-progress' | 'not-started';
export type TargetGroup = 'Pages' | 'Components';

// The minimal row shape the summary needs — a subset of DesignDecision, so tests need no DB row.
export interface DecisionRowLike {
  target_id: string;
  target_kind: string | null;
  status: string; // proposed | in-review | locked | rejected | superseded
  round: number | null;
  updated_at: Date | number | null;
  preview_url: string | null;
}

export interface TargetSummary {
  target_id: string;
  target_kind: string | null;
  group: TargetGroup;
  status: TargetStatus;
  rounds: number[];
  latestRound: number;
  openAxes: number; // non-locked, non-superseded rows
  lockedAxes: number;
  total: number; // non-superseded rows
  supersededCount: number;
  lastActivity: number | null; // ms epoch
  previewUrl: string | null;
}

export interface BoardSummary {
  targets: TargetSummary[];
  pages: TargetSummary[];
  components: TargetSummary[];
  rollup: { total: number; final: number; inProgress: number; notStarted: number };
}

const OPEN = new Set(['proposed', 'in-review']);

// drizzle timestamp mode returns a Date; a raw unix-seconds int can appear in a test fixture.
function toMs(v: Date | number | null | undefined): number | null {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  return v < 1e12 ? v * 1000 : v;
}

function bucket(kind: string | null): TargetGroup {
  return kind === 'page' || kind === 'site' || kind === 'foundation' ? 'Pages' : 'Components';
}

/** One target's roll-up. Status: superseded rows never count toward progress. */
export function summariseTarget(target_id: string, rows: DecisionRowLike[]): TargetSummary {
  const active = rows.filter((r) => r.status !== 'superseded');
  const supersededCount = rows.length - active.length;

  let status: TargetStatus;
  if (active.length === 0) status = 'not-started'; // only superseded rows (or none) — not started
  else if (active.some((r) => OPEN.has(r.status))) status = 'in-progress';
  else if (active.every((r) => r.status === 'locked')) status = 'final';
  else status = 'in-progress'; // e.g. a rejected axis with nothing open and not all locked

  const rounds = [...new Set(active.map((r) => r.round ?? 1))].sort((a, b) => a - b);
  const latestRound = rounds.length ? rounds[rounds.length - 1] : (rows[0]?.round ?? 1);
  const lockedAxes = active.filter((r) => r.status === 'locked').length;
  const openAxes = active.length - lockedAxes;
  const lastActivity = rows.reduce<number | null>((m, r) => {
    const t = toMs(r.updated_at);
    return t != null && (m == null || t > m) ? t : m;
  }, null);
  const latestRow = [...active, ...rows].find((r) => (r.round ?? 1) === latestRound && r.preview_url);
  const kind = rows[0]?.target_kind ?? null;

  return {
    target_id, target_kind: kind, group: bucket(kind), status,
    rounds, latestRound, openAxes, lockedAxes, total: active.length,
    supersededCount, lastActivity, previewUrl: latestRow?.preview_url ?? null,
  };
}

// in-progress first (needs attention), then not-started, then final; each group by recency.
const STATUS_ORDER: Record<TargetStatus, number> = { 'in-progress': 0, 'not-started': 1, final: 2 };

/** The whole board: one summary per target, split Pages vs Components, with a project roll-up. */
export function summariseTargets(rows: DecisionRowLike[]): BoardSummary {
  const byTarget = new Map<string, DecisionRowLike[]>();
  for (const r of rows) {
    const arr = byTarget.get(r.target_id);
    if (arr) arr.push(r);
    else byTarget.set(r.target_id, [r]);
  }
  const targets = [...byTarget.entries()].map(([id, rs]) => summariseTarget(id, rs));
  targets.sort(
    (a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || ((b.lastActivity ?? 0) - (a.lastActivity ?? 0)),
  );

  const rollup = { total: targets.length, final: 0, inProgress: 0, notStarted: 0 };
  for (const t of targets) {
    if (t.status === 'final') rollup.final += 1;
    else if (t.status === 'in-progress') rollup.inProgress += 1;
    else rollup.notStarted += 1;
  }

  return {
    targets,
    pages: targets.filter((t) => t.group === 'Pages'),
    components: targets.filter((t) => t.group === 'Components'),
    rollup,
  };
}
