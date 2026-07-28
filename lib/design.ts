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

// ── N3 (2026-07-28): page-finalizes-from-components + classify-by-flow ────────────────────────────
// A design `target_id` is a free-form label, not a wire to the structure. The match to a component /
// page is by slugified name; where it does not match, the item reads not-started — never a faked final.

export function slugify(s: string | null | undefined): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export function targetLeafSlug(target_id: string): string {
  return slugify(target_id.split('.').pop() || target_id);
}

/** A design-status lookup keyed by the slug of each target's leaf — the join key for structure. */
export function statusByLeaf(board: BoardSummary): Map<string, TargetStatus> {
  const m = new Map<string, TargetStatus>();
  for (const t of board.targets) {
    const k = targetLeafSlug(t.target_id);
    // if two targets collapse to one leaf, the more-advanced status wins (final > in-progress > not)
    const cur = m.get(k);
    if (!cur || STATUS_ORDER[t.status] > STATUS_ORDER[cur]) m.set(k, t.status);
  }
  return m;
}

export interface PageLike { id: string; name?: string | null; route?: string | null; }
export interface ComponentLike { name: string; page_id: string; picked?: boolean; skip_reason?: string | null; }
export interface FlowLike { id: string; name?: string | null; }
export interface FlowPageLink { flow_id: string; page_id: string; }

export interface PageRollup {
  page_id: string;
  label: string;
  componentsTotal: number; // non-skipped components on the page
  componentsDesigned: number; // design-final
  componentsInProgress: number;
  status: TargetStatus;
  source: 'components' | 'own-target' | 'none';
}

/**
 * Gap 1 — a page's design status rolled up from its components. A page is FINAL when every non-skipped
 * component has a design-final target; IN-PROGRESS if any component is; falls back to the page's OWN
 * page-scope design-target status when it has no structured components (graceful, never a fake match).
 */
export function rollUpPage(
  page: PageLike,
  components: ComponentLike[],
  byLeaf: Map<string, TargetStatus>,
): PageRollup {
  const label = page.name || page.route || page.id;
  const own = byLeaf.get(slugify(page.id)) ?? byLeaf.get(targetLeafSlug(page.route || '')) ?? null;
  const active = components.filter((c) => c.page_id === page.id && !c.skip_reason);

  if (active.length === 0) {
    return {
      page_id: page.id, label, componentsTotal: 0, componentsDesigned: 0, componentsInProgress: 0,
      status: own ?? 'not-started', source: own ? 'own-target' : 'none',
    };
  }
  let designed = 0, inProgress = 0;
  for (const c of active) {
    const s = byLeaf.get(slugify(c.name)) ?? 'not-started';
    if (s === 'final') designed += 1;
    else if (s === 'in-progress') inProgress += 1;
  }
  const status: TargetStatus = designed === active.length ? 'final'
    : (inProgress > 0 || designed > 0) ? 'in-progress' : 'not-started';
  return {
    page_id: page.id, label, componentsTotal: active.length, componentsDesigned: designed,
    componentsInProgress: inProgress, status, source: 'components',
  };
}

export interface FlowGroup { flow_id: string; label: string; pages: PageRollup[]; status: TargetStatus; }

/** Gap 2 — classify pages by user flow. A flow rolls up like a page; pages in no flow are Unassigned. */
export function groupByFlow(
  flows: FlowLike[],
  flowPages: FlowPageLink[],
  pageRollups: PageRollup[],
): { flows: FlowGroup[]; unassigned: PageRollup[] } {
  const byId = new Map(pageRollups.map((p) => [p.page_id, p]));
  const assigned = new Set<string>();
  const groups: FlowGroup[] = [];
  for (const f of flows) {
    const pages = flowPages
      .filter((fp) => fp.flow_id === f.id)
      .map((fp) => byId.get(fp.page_id))
      .filter((p): p is PageRollup => Boolean(p));
    for (const p of pages) assigned.add(p.page_id);
    const status: TargetStatus = pages.length === 0 ? 'not-started'
      : pages.every((p) => p.status === 'final') ? 'final'
        : pages.some((p) => p.status !== 'not-started') ? 'in-progress' : 'not-started';
    groups.push({ flow_id: f.id, label: f.name || f.id, pages, status });
  }
  const unassigned = pageRollups.filter((p) => !assigned.has(p.page_id));
  return { flows: groups, unassigned };
}
