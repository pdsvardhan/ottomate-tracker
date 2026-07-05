'use client';

// Projects register (iter-14 refinements per owner feedback 2026-07-04).
// Columns trimmed to the agreed set — Name / Summary / Stage / Progress /
// Category / Health / Links / Age (OPEN + STACK removed). Hover/tap opens a
// COMPACT floating panel (reel + overview) instead of a full-width drawer.
// Fluid --t-* type throughout. Below the fold: activity + VAULT7A server card.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { accentStyle } from '@/lib/project-accent';
import { NumberTicker } from '@/components/ui/NumberTicker';
import { ServerStatsCard, type ServerStats } from '@/components/project/ServerStatsCard';

export interface RegisterRow {
  slug: string;
  name: string;
  summary: string;
  accent: string;
  stageLabel: string;
  phase: string;
  done: number;
  total: number;
  pct: number;
  isPublic: boolean;
  flowsPassing: number;
  flowsTotal: number;
  risksOpen: number;
  liveUrl: string | null;
  repoUrl: string | null;
  port: number | null;
  age: string;
  blurb: string;
  stack: string[];
  tags: string[];
  lastChange: string | null;
}

export interface ActivityLine {
  slug: string;
  name: string;
  accent: string;
  note: string;
  when: string;
}

// md: 8 cols · lg: 9 (+Summary) · xl: 10 (+Stack). Hidden cells drop out of grid
// flow (display:none) so the visible-child count matches each breakpoint's tracks.
// iter-16 (owner feedback 2026-07-05): PROJECT −40%, SUMMARY −30% (now wraps to
// 2 lines instead of truncating), STACK −50%, PROGRESS + LINKS widened (LINKS
// was crowding AGE).
// iter-16b-fix: PROJECT + SUMMARY are both CAPPED (SUMMARY no longer hogs all
// slack — that left a dead void before STAGE); the flexible tracks are now
// PROGRESS and STACK, which absorb the leftover width in the middle-right so the
// row fills evenly. STACK widened so "SQLite + Drizzle" / "FastAPI (Python)" no
// longer truncate.
const COLS =
  'md:grid md:grid-cols-[minmax(150px,210px)_minmax(80px,96px)_220px_minmax(88px,104px)_minmax(100px,116px)_minmax(150px,176px)_minmax(44px,56px)_28px] ' +
  'lg:grid-cols-[minmax(150px,210px)_minmax(220px,440px)_minmax(80px,96px)_220px_minmax(88px,104px)_minmax(100px,116px)_minmax(150px,176px)_minmax(44px,56px)_28px] ' +
  'xl:grid-cols-[minmax(160px,220px)_minmax(240px,460px)_minmax(80px,96px)_220px_minmax(88px,104px)_minmax(100px,116px)_minmax(150px,172px)_minmax(150px,176px)_minmax(44px,56px)_28px] ' +
  'md:items-center';

const STAGE_HUES: Record<string, string> = {
  SPEC: 'var(--amber)',
  BUILD: 'var(--vio)',
  SHIPPED: 'var(--cyan)',
  MAINT: 'var(--coral)',
  ARCHIVED: 'var(--dim)',
};

function href(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

// HEALTH pill (iter-16): the old "◇ n/n  ⚑ n" symbols were unreadable (owner
// feedback). One plain-word status pill driven by OPEN RISKS, with a tooltip that
// spells out the raw numbers. Flows are NOT scored — most are simply untested
// (not failing), so counting them would wrongly flag healthy projects red.
function healthOf(row: RegisterRow): { label: string; hue: string; tip: string } {
  const tip = `Flows passing ${row.flowsPassing}/${row.flowsTotal} · Open risks ${row.risksOpen}`;
  if (row.risksOpen >= 5) return { label: 'At risk', hue: 'var(--coral)', tip };
  if (row.risksOpen >= 2) return { label: 'Watch', hue: 'var(--amber)', tip };
  return { label: 'Healthy', hue: '#34d399', tip };
}

function Row({ row, index }: { row: RegisterRow; index: number }) {
  const [open, setOpen] = useState(false);
  const health = healthOf(row);
  return (
    <li
      className="a-fade-up reg-row group border-t border-white/[0.07] last:border-b transition-colors hover:bg-white/[0.025]"
      data-open={open ? 'true' : 'false'}
      style={{ ...accentStyle(row.accent), animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      {/* full-row overlay link — the block click target (no nested anchors) */}
      <Link
        href={`/projects/${row.slug}`}
        aria-label={`Open ${row.name}`}
        className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      />

      <div className={`flex flex-wrap ${COLS} items-center gap-x-4 gap-y-2 px-3 md:px-4 py-4 pointer-events-none`}>
        {/* PROJECT — name only (iter-14) */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1 md:flex-none">
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ background: 'var(--accent)', boxShadow: '0 0 11px var(--accent-glow)' }}
          />
          <div className="font-display text-[length:var(--t-title)] font-bold text-zinc-50 truncate leading-tight">{row.name}</div>
        </div>

        {/* SUMMARY — wraps to 2 lines instead of truncating (iter-16) */}
        <div className="hidden lg:block min-w-0 pr-3">
          <p className="text-[length:var(--t-label)] leading-snug text-zinc-300/90 line-clamp-2">{row.summary}</p>
        </div>

        {/* STAGE */}
        <div
          className="mono text-[length:var(--t-cap)] font-bold tracking-wide hidden md:block"
          style={{ color: STAGE_HUES[row.stageLabel] ?? 'var(--cyan)' }}
        >
          {row.stageLabel}
        </div>

        {/* PROGRESS — 'features' spelled out (iter-16), wider column */}
        <div className="flex items-center gap-2.5 mono text-[length:var(--t-label)] font-semibold text-zinc-200 basis-full md:basis-auto order-last md:order-none" title="features complete">
          <span className="tabular-nums shrink-0">{row.total > 0 ? `${row.done}/${row.total}` : '—'}</span>
          <span className="text-[length:var(--t-cap)] text-zinc-500 shrink-0">features</span>
          <span className="h-2 flex-1 min-w-[48px] rounded-full bg-white/10 overflow-hidden">
            <span className="block h-full rounded-full" style={{ width: `${row.pct}%`, background: 'var(--accent)' }} />
          </span>
        </div>

        {/* CATEGORY — Public / Private (placeholder, owner-set later) */}
        <div className="hidden md:block">
          <span
            className="mono text-[length:var(--t-cap)] uppercase tracking-wide rounded-md border px-2 py-1"
            style={row.isPublic
              ? { color: 'var(--cyan)', borderColor: 'rgba(34,211,238,.35)' }
              : { color: 'var(--mute)', borderColor: 'var(--line)' }}
          >
            {row.isPublic ? 'public' : 'private'}
          </span>
        </div>

        {/* HEALTH — single plain-word status pill (iter-16) */}
        <div className="hidden md:flex items-center">
          <span
            className="inline-flex items-center gap-1.5 mono text-[length:var(--t-cap)] rounded-full border px-2.5 py-1 whitespace-nowrap"
            style={{ color: health.hue, borderColor: `color-mix(in srgb, ${health.hue} 40%, transparent)`, background: `color-mix(in srgb, ${health.hue} 12%, transparent)` }}
            title={health.tip}
          >
            <span className="size-1.5 rounded-full" style={{ background: health.hue, boxShadow: `0 0 7px ${health.hue}` }} />
            {health.label}
          </span>
        </div>

        {/* STACK (xl+) — real values backfilled iter-14 (framework + database) */}
        <div className="hidden xl:flex flex-col items-start gap-1 min-w-0">
          {row.stack.length > 0 ? row.stack.map((s) => (
            <span key={s} className="mono text-[length:var(--t-cap)] text-zinc-300 rounded border border-white/10 bg-black/25 px-2 py-0.5 whitespace-nowrap">{s}</span>
          )) : <span className="text-zinc-700">—</span>}
        </div>

        {/* LINKS — desktop only (on mobile the row taps through to the project) */}
        <div className="hidden md:flex items-center gap-2 pointer-events-auto relative z-10">
          {row.liveUrl && (
            <a
              href={href(row.liveUrl)}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              className="mono text-[length:var(--t-cap)] font-bold text-black rounded-md px-3 py-1.5 whitespace-nowrap transition-opacity hover:opacity-85"
              style={{ background: 'var(--accent)' }}
            >
              live ↗
            </a>
          )}
          {row.repoUrl && (
            <a
              href={href(row.repoUrl)}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              className="mono text-[length:var(--t-cap)] font-semibold rounded-md px-3 py-1.5 whitespace-nowrap transition-colors"
              style={{ color: 'var(--accent)', border: '1px solid var(--accent-bd)', background: 'var(--accent-bg)' }}
            >
              repo ↗
            </a>
          )}
        </div>

        {/* AGE */}
        <div className="mono text-[length:var(--t-cap)] text-zinc-400 justify-self-end hidden md:block tabular-nums">{row.age}</div>

        {/* EXPAND — opens the floating panel */}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Collapse preview' : 'Expand preview'}
          onClick={() => setOpen((v) => !v)}
          className="pointer-events-auto relative z-10 justify-self-end grid place-items-center size-7 rounded-md text-zinc-500 transition-colors hover:text-zinc-200 hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span className={`reg-chev inline-block transition-transform duration-300 ${open ? 'rotate-90' : ''}`} style={{ color: 'var(--accent)' }}>▸</span>
        </button>
      </div>

      {/* FLOATING PANEL (iter-14) — compact popover, reel + overview only; does
          NOT push siblings. Opens on hover (desktop) / focus / tap (data-open). */}
      <div className="reg-pop">
        <div
          className="reg-pop-reel"
          style={{ background: 'radial-gradient(120% 120% at 30% 0%, var(--accent-bg), #0c0f16 65%)' }}
        >
          <span className="mono text-[length:var(--t-cap)] tracking-widest text-zinc-500">{row.name} · REEL</span>
        </div>
        <div className="p-4">
          <div className="mono text-[length:var(--t-cap)] font-semibold tracking-widest text-zinc-500 mb-2">OVERVIEW</div>
          {/* clamp long blurbs (iter-16) — concise per-project copy is a ph1 task */}
          <p className="text-[length:var(--t-label)] leading-relaxed text-zinc-300 line-clamp-4">{row.blurb || row.summary || 'No summary yet.'}</p>
          {row.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {row.tags.map((t) => (
                <span key={t} className="mono text-[length:var(--t-cap)] text-zinc-300 rounded border border-white/10 bg-black/25 px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* accent bar sweeps in along the bottom on hover/open */}
      <span className="reg-bar absolute left-0 bottom-0 h-[2px] w-full" style={{ background: 'var(--accent)' }} aria-hidden />
    </li>
  );
}

export function ProjectRegister({
  rows,
  stats,
  activity,
  serverStats,
}: {
  rows: RegisterRow[];
  stats: { projects: number; featuresShipped: number; live: number; flowsPassing: number };
  activity: ActivityLine[];
  serverStats: ServerStats;
}) {
  const [stage, setStage] = useState<string>('ALL');

  const stageChips = useMemo(() => {
    const present = Array.from(new Set(rows.map((r) => r.stageLabel)));
    const order = ['SPEC', 'BUILD', 'SHIPPED', 'MAINT', 'ARCHIVED'];
    return [
      { key: 'ALL', count: rows.length },
      ...order.filter((s) => present.includes(s)).map((s) => ({
        key: s,
        count: rows.filter((r) => r.stageLabel === s).length,
      })),
    ];
  }, [rows]);

  const filtered = useMemo(
    () => (stage === 'ALL' ? rows : rows.filter((r) => r.stageLabel === stage)),
    [rows, stage],
  );

  const statCards = [
    { n: stats.projects, l: 'PROJECTS', c: 'var(--mag)' },
    { n: stats.featuresShipped, l: 'FEATURES SHIPPED', c: 'var(--cyan)' },
    { n: stats.live, l: 'LIVE', c: 'var(--vio)' },
    { n: stats.flowsPassing, l: 'FLOWS PASSING', c: 'var(--coral)' },
  ];

  return (
    <div>
      {/* ── HERO: title + tagline left, count-up stats right ── */}
      <div className="mb-8 grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h1 className="display pg">Projects</h1>
          <p className="mt-3 text-[length:var(--t-lead)] leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.82 }}>
            Every VAULT7A build — spec through shipped, tracked end to end.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.l} className="numc min-w-[128px]" style={{ '--nc': s.c } as React.CSSProperties}>
              <div className="n"><NumberTicker value={s.n} /></div>
              <div className="l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stage filter ── */}
      <div className="mb-5 flex flex-wrap gap-2.5">
        {stageChips.map((c) => {
          const active = stage === c.key;
          const hue = STAGE_HUES[c.key];
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setStage(c.key)}
              className={
                'mono text-[length:var(--t-label)] font-semibold tracking-wide rounded-lg px-4 py-2 border transition-colors ' +
                (active
                  ? 'text-zinc-50 border-white/20 bg-white/[0.08]'
                  : 'text-zinc-400 border-white/[0.08] hover:text-zinc-100 hover:border-white/20')
              }
            >
              {hue && <span className="mr-2 inline-block size-2 rounded-full align-middle" style={{ background: hue }} />}
              {c.key}<span className="ml-2 opacity-55 tabular-nums">{c.count}</span>
            </button>
          );
        })}
      </div>

      {/* Column header (desktop only) */}
      <div className={`hidden ${COLS} gap-x-4 px-4 pb-3 mono text-[length:var(--t-cap)] font-bold tracking-widest text-zinc-400`}>
        <span>PROJECT</span>
        <span className="hidden lg:block">SUMMARY</span>
        <span>STAGE</span>
        <span>PROGRESS</span>
        <span>CATEGORY</span>
        <span>HEALTH</span>
        <span className="hidden xl:block">STACK</span>
        <span>LINKS</span>
        <span className="text-right">AGE</span>
        <span />
      </div>

      <ul>
        {filtered.map((row, i) => (
          <Row key={row.slug} row={row} index={i} />
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-6 text-center text-[length:var(--t-body)] text-zinc-500">No projects in this stage.</p>
      )}

      {/* ── BELOW THE FOLD: the machine (LEFT) + recent activity (RIGHT) ──
          Swapped per owner feedback iter-16 (server card moved to the left). */}
      <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_1fr] items-start">
        <ServerStatsCard stats={serverStats} />

        <div className="card flat">
          <div className="eyebrow" style={{ color: 'var(--mag)' }}>Recent activity</div>
          {activity.length > 0 ? (
            <ul className="flex flex-col">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center gap-3.5 py-2.5" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ ...accentStyle(a.accent), background: 'var(--accent)', boxShadow: '0 0 9px var(--accent-glow)' }} />
                  <Link href={`/projects/${a.slug}`} className="mono text-[length:var(--t-cap)] font-semibold text-zinc-200 shrink-0 hover:underline">
                    {a.name}
                  </Link>
                  <span className="flex-1 truncate text-[length:var(--t-label)] text-zinc-400">{a.note}</span>
                  <span className="mono text-[length:var(--t-cap)] text-zinc-500 tabular-nums shrink-0">{a.when}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[length:var(--t-label)] text-zinc-500">No recorded activity yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
