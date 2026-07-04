'use client';

// Projects register (iter-12 rebuild per owner feedback 2026-07-04).
// Hero-integrated count-up stats, stage-based filters (personal/cv retired),
// value-dense columns: name / overview / stage / progress / public-private /
// health / open items / stack / links / age. Fluid type via --t-* tokens —
// nothing below the readability floor. Below the fold: activity + pipeline.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { accentStyle } from '@/lib/project-accent';
import { NumberTicker } from '@/components/ui/NumberTicker';

export interface RegisterRow {
  slug: string;
  name: string;
  sub: string;
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
  openItems: number;
  stack: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  port: number | null;
  age: string;
  blurb: string;
  tags: string[];
  todos: string[];
  todoCount: number;
  lastChange: string | null;
}

export interface ActivityLine {
  slug: string;
  name: string;
  accent: string;
  note: string;
  when: string;
}

export interface StageSlice {
  phase: string;
  label: string;
  count: number;
}

// md: 9 columns (no overview/stack) · xl: all 11. Header mirrors the row.
const COLS =
  'md:grid md:grid-cols-[minmax(200px,1.3fr)_84px_minmax(130px,1fr)_92px_104px_56px_132px_56px_30px] ' +
  'xl:grid-cols-[minmax(210px,1.15fr)_minmax(0,1.5fr)_84px_minmax(120px,.9fr)_92px_104px_56px_minmax(130px,.9fr)_132px_56px_30px] ' +
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

function Row({ row, index }: { row: RegisterRow; index: number }) {
  const [open, setOpen] = useState(false);
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
        {/* PROJECT */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1 md:flex-none">
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ background: 'var(--accent)', boxShadow: '0 0 11px var(--accent-glow)' }}
          />
          <div className="min-w-0">
            <div className="font-display text-[length:var(--t-title)] font-bold text-zinc-50 truncate leading-tight">{row.name}</div>
            <div className="mono text-[length:var(--t-cap)] text-zinc-400 truncate mt-0.5">{row.sub}</div>
          </div>
        </div>

        {/* OVERVIEW (xl+) — 1-2 lines, the column that earns the width */}
        <div className="hidden xl:block min-w-0 pr-2">
          <p className="text-[length:var(--t-label)] leading-snug text-zinc-300/90 line-clamp-2">{row.blurb || '—'}</p>
        </div>

        {/* STAGE */}
        <div
          className="mono text-[length:var(--t-cap)] font-bold tracking-wide hidden md:block"
          style={{ color: STAGE_HUES[row.stageLabel] ?? 'var(--cyan)' }}
        >
          {row.stageLabel}
        </div>

        {/* PROGRESS */}
        <div className="flex items-center gap-2.5 mono text-[length:var(--t-label)] font-semibold text-zinc-200 basis-full md:basis-auto order-last md:order-none">
          <span className="tabular-nums shrink-0">{row.total > 0 ? `${row.done}/${row.total}` : '—'}</span>
          <span className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
            <span className="block h-full rounded-full" style={{ width: `${row.pct}%`, background: 'var(--accent)' }} />
          </span>
        </div>

        {/* CATEGORY — Public / Private, equal stature (owner decision 2026-07-04) */}
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

        {/* HEALTH */}
        <div className="hidden md:flex items-center gap-2.5 mono text-[length:var(--t-cap)] text-zinc-400">
          <span title="flows passing / total">◇ {row.flowsPassing}/{row.flowsTotal}</span>
          <span className={row.risksOpen > 0 ? 'text-[var(--color-risk)]' : 'text-zinc-600'} title="open risks">
            ⚑ {row.risksOpen}
          </span>
        </div>

        {/* OPEN ITEMS — to-dos + pending reports */}
        <div className="hidden md:block mono text-[length:var(--t-label)] tabular-nums font-semibold" title="open to-dos + pending reports">
          <span className={row.openItems > 0 ? 'text-zinc-200' : 'text-zinc-600'}>{row.openItems || '—'}</span>
        </div>

        {/* STACK (xl+) */}
        <div className="hidden xl:flex flex-wrap items-center gap-1.5 min-w-0">
          {row.stack.length > 0 ? row.stack.map((s) => (
            <span key={s} className="mono text-[length:var(--t-cap)] text-zinc-300 rounded border border-white/10 bg-black/25 px-2 py-0.5 truncate max-w-[110px]">{s}</span>
          )) : <span className="text-zinc-700">—</span>}
        </div>

        {/* LINKS */}
        <div className="flex items-center gap-2 justify-self-end md:justify-self-auto pointer-events-auto relative z-10">
          {row.liveUrl && (
            <a
              href={href(row.liveUrl)}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              className="mono text-[length:var(--t-cap)] font-bold text-black rounded-md px-3 py-1.5 transition-opacity hover:opacity-85"
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
              className="mono text-[length:var(--t-cap)] font-semibold text-zinc-300 rounded-md border border-white/15 px-3 py-1.5 transition-colors hover:text-zinc-100 hover:border-zinc-400"
            >
              repo
            </a>
          )}
        </div>

        {/* AGE */}
        <div className="mono text-[length:var(--t-cap)] text-zinc-400 justify-self-end hidden md:block tabular-nums">{row.age}</div>

        {/* EXPAND */}
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

      {/* PREVIEW — absolute overlay; opens on hover (desktop) / focus / click (touch). */}
      <div className="reg-more">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1.05fr_1fr_1fr] gap-6 px-5 py-5">
          <div
            className="hidden md:block rounded-lg border border-white/[0.08] min-h-[150px]"
            style={{ background: 'radial-gradient(120% 120% at 30% 0%, var(--accent-bg), #0c0f16 62%)' }}
          >
            <div className="h-full grid place-items-center">
              <span className="mono text-[length:var(--t-cap)] tracking-widest text-zinc-500">{row.name} REEL</span>
            </div>
          </div>
          <div>
            <div className="mono text-[length:var(--t-cap)] font-semibold tracking-widest text-zinc-500 mb-2.5">OVERVIEW</div>
            <p className="text-[length:var(--t-label)] leading-relaxed text-zinc-300">{row.blurb || 'No summary yet.'}</p>
            {row.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {row.tags.map((t) => (
                  <span key={t} className="mono text-[length:var(--t-cap)] text-zinc-300 rounded border border-white/10 bg-black/25 px-2.5 py-1">{t}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mono text-[length:var(--t-cap)] font-semibold tracking-widest text-zinc-500 mb-2.5">
              TO DO{row.todoCount > 0 ? ` · ${row.todoCount}` : ''}
            </div>
            {row.todos.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {row.todos.map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[length:var(--t-label)] leading-snug text-zinc-300">
                    <span className="mt-[5px] size-2.5 shrink-0 rounded-[3px] border" style={{ borderColor: 'var(--accent-bd)' }} />
                    {t}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[length:var(--t-label)] text-zinc-500">Nothing open.</p>
            )}
          </div>
          <div>
            <div className="mono text-[length:var(--t-cap)] font-semibold tracking-widest text-zinc-500 mb-2.5">LAST CHANGE · {row.age}</div>
            <p className="text-[length:var(--t-label)] font-medium leading-snug text-zinc-200">{row.lastChange ?? 'No recorded activity.'}</p>
          </div>
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
  stageDist,
}: {
  rows: RegisterRow[];
  stats: { projects: number; featuresShipped: number; live: number; flowsPassing: number };
  activity: ActivityLine[];
  stageDist: StageSlice[];
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

  const distTotal = stageDist.reduce((n, s) => n + s.count, 0) || 1;

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

      {/* ── Stage filter (iter-12: replaces personal/cv classification) ── */}
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
        <span className="hidden xl:block">OVERVIEW</span>
        <span>STAGE</span>
        <span>PROGRESS</span>
        <span>CATEGORY</span>
        <span>HEALTH</span>
        <span>OPEN</span>
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

      {/* ── BELOW THE FOLD (iter-12: put the empty space to work) ── */}
      <div className="mt-12 grid gap-4 lg:grid-cols-[1.15fr_.85fr] items-start">
        {/* Recent activity across every project */}
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

        {/* Pipeline distribution — where the portfolio sits */}
        <div className="card flat">
          <div className="eyebrow">Pipeline</div>
          <div className="dist mb-4">
            {stageDist.map((s) => (
              <span
                key={s.phase}
                title={`${s.label} · ${s.count}`}
                style={{ flex: s.count / distTotal, background: STAGE_HUES[s.label] ?? 'var(--vio)', opacity: 0.85 }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            {stageDist.map((s) => (
              <button
                key={s.phase}
                type="button"
                onClick={() => setStage(s.label)}
                className="flex items-center gap-3 text-left group"
              >
                <span className="size-2.5 rounded-full shrink-0" style={{ background: STAGE_HUES[s.label] ?? 'var(--vio)' }} />
                <span className="mono text-[length:var(--t-label)] text-zinc-300 group-hover:text-zinc-100 transition-colors">{s.label}</span>
                <span className="ml-auto mono text-[length:var(--t-label)] font-bold text-zinc-200 tabular-nums">{s.count}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[length:var(--t-cap)] text-zinc-500">Click a stage to filter the register.</p>
        </div>
      </div>
    </div>
  );
}
