'use client';

// Projects register table (prototype adoption). Per-project accent, honest
// progress, click/keyboard-expandable preview (no hover-only trap), category
// filter, staggered load. Hybrid columns: identity/stage/progress/category lead;
// coverage (flows passing) + open risks are present but visually de-emphasised.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { accentStyle } from '@/lib/project-accent';

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
  category: string | null;
  flowsPassing: number;
  flowsTotal: number;
  risksOpen: number;
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

// Columns kick in at md; below that the row is a wrapping flex (clean reflow).
const COLS = 'md:grid md:grid-cols-[minmax(190px,1.5fr)_86px_150px_92px_120px_130px_48px_26px] md:items-center';

function href(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

function Row({ row, index }: { row: RegisterRow; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <li
      className="a-fade-up reg-row group border-t border-[var(--color-border)] last:border-b transition-colors hover:bg-white/[0.02]"
      data-open={open ? 'true' : 'false'}
      style={{ ...accentStyle(row.accent), animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      {/* full-row overlay link — the block click target (no nested anchors) */}
      <Link
        href={`/projects/${row.slug}`}
        aria-label={`Open ${row.name}`}
        className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      />

      <div className={`flex flex-wrap ${COLS} items-center gap-x-4 gap-y-2 px-3 md:px-4 py-3 pointer-events-none`}>
        {/* PROJECT */}
        <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: 'var(--accent)', boxShadow: '0 0 9px var(--accent-glow)' }}
          />
          <div className="min-w-0">
            <div className="font-display text-[15px] font-bold text-zinc-100 truncate">{row.name}</div>
            <div className="mono text-[10px] text-zinc-500 truncate">{row.sub}</div>
          </div>
        </div>

        {/* STAGE */}
        <div className="mono text-[10px] font-semibold tracking-wide text-accent hidden md:block">{row.stageLabel}</div>

        {/* PROGRESS */}
        <div className="flex items-center gap-2 mono text-[11px] font-semibold text-zinc-300 basis-full md:basis-auto order-last md:order-none">
          <span className="tabular-nums shrink-0">{row.total > 0 ? `${row.done}/${row.total}` : '—'}</span>
          <span className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
            <span className="block h-full rounded-full" style={{ width: `${row.pct}%`, background: 'var(--accent)' }} />
          </span>
        </div>

        {/* CATEGORY */}
        <div className="hidden md:block">
          {row.category ? (
            <span className="mono text-[9px] uppercase tracking-wide text-zinc-400 rounded-md border border-[var(--color-border)] px-2 py-1">
              {row.category}
            </span>
          ) : (
            <span className="text-zinc-700">—</span>
          )}
        </div>

        {/* HEALTH — de-emphasised */}
        <div className="hidden md:flex items-center gap-2 mono text-[10px] text-zinc-600">
          <span title="flows passing / total">◇ {row.flowsPassing}/{row.flowsTotal}</span>
          <span className={row.risksOpen > 0 ? 'text-[var(--color-risk)]/80' : 'text-zinc-700'} title="open risks">
            ⚑ {row.risksOpen}
          </span>
        </div>

        {/* LINKS */}
        <div className="flex items-center gap-1.5 justify-self-end md:justify-self-auto pointer-events-auto relative z-10">
          {row.liveUrl && (
            <a
              href={href(row.liveUrl)}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              className="mono text-[9px] font-semibold text-black rounded-md px-2.5 py-1.5 transition-opacity hover:opacity-85"
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
              className="mono text-[9px] font-semibold text-zinc-300 rounded-md border border-[var(--color-border-2)] px-2.5 py-1.5 transition-colors hover:text-zinc-100 hover:border-zinc-500"
            >
              repo
            </a>
          )}
        </div>

        {/* AGE */}
        <div className="mono text-[10px] text-zinc-500 justify-self-end hidden md:block tabular-nums">{row.age}</div>

        {/* EXPAND */}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Collapse preview' : 'Expand preview'}
          onClick={() => setOpen((v) => !v)}
          className="pointer-events-auto relative z-10 justify-self-end grid place-items-center size-6 rounded-md text-zinc-500 transition-colors hover:text-zinc-200 hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span className={`reg-chev inline-block transition-transform duration-300 ${open ? 'rotate-90' : ''}`} style={{ color: 'var(--accent)' }}>▸</span>
        </button>
      </div>

      {/* PREVIEW — absolute overlay; opens on hover (desktop) / focus / click (touch).
          Matches the prototype's 4-column panel: reel · overview · to-do · last change. */}
      <div className="reg-more">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1.05fr_1fr_1fr] gap-5 px-4 py-4">
          <div
            className="hidden md:block rounded-lg border border-[var(--color-border)] min-h-[150px]"
            style={{ background: 'radial-gradient(120% 120% at 30% 0%, var(--accent-bg), #0c0f16 62%)' }}
          >
            <div className="h-full grid place-items-center">
              <span className="mono text-[9px] tracking-widest text-zinc-600">{row.name} REEL</span>
            </div>
          </div>
          <div>
            <div className="mono text-[9px] font-semibold tracking-widest text-zinc-600 mb-2">OVERVIEW</div>
            <p className="text-[12.5px] leading-relaxed text-zinc-400">{row.blurb || 'No summary yet.'}</p>
            {row.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {row.tags.map((t) => (
                  <span key={t} className="mono text-[9px] text-zinc-400 rounded border border-[var(--color-border)] bg-black/20 px-2 py-0.5">{t}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mono text-[9px] font-semibold tracking-widest text-zinc-600 mb-2">
              TO DO{row.todoCount > 0 ? ` · ${row.todoCount}` : ''}
            </div>
            {row.todos.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {row.todos.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-snug text-zinc-400">
                    <span className="mt-[3px] size-2.5 shrink-0 rounded-[3px] border" style={{ borderColor: 'var(--accent-bd)' }} />
                    {t}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-zinc-600">Nothing open.</p>
            )}
          </div>
          <div>
            <div className="mono text-[9px] font-semibold tracking-widest text-zinc-600 mb-2">LAST CHANGE · {row.age}</div>
            <p className="text-[12.5px] font-medium leading-snug text-zinc-300">{row.lastChange ?? 'No recorded activity.'}</p>
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
}: {
  rows: RegisterRow[];
  stats: { projects: number; featuresShipped: number; live: number };
}) {
  const [cat, setCat] = useState<'all' | 'personal' | 'cv'>('all');

  const filtered = useMemo(
    () => (cat === 'all' ? rows : rows.filter((r) => (r.category ?? '').includes(cat))),
    [rows, cat],
  );

  const chips: Array<{ key: 'all' | 'personal' | 'cv'; label: string; count: number }> = [
    { key: 'all', label: 'ALL', count: rows.length },
    { key: 'personal', label: 'PERSONAL', count: rows.filter((r) => (r.category ?? '').includes('personal')).length },
    { key: 'cv', label: 'CV', count: rows.filter((r) => (r.category ?? '').includes('cv')).length },
  ];

  const statCards = [
    { n: stats.projects, l: 'PROJECTS' },
    { n: stats.featuresShipped, l: 'FEATURES SHIPPED' },
    { n: stats.live, l: 'LIVE' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-zinc-50">Projects</h1>
          <p className="mt-1 text-[13px] text-zinc-500">Every VAULT7A build — spec through shipped, tracked end to end.</p>
        </div>
        <div className="flex gap-2.5">
          {statCards.map((s) => (
            <div key={s.l} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2">
              <div className="mono text-[19px] font-bold leading-none text-zinc-100 tabular-nums">{s.n}</div>
              <div className="mono text-[8px] tracking-widest text-zinc-500 mt-1.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-4 flex gap-2">
        {chips.map((c) => {
          const active = cat === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCat(c.key)}
              className={
                'mono text-[10px] font-semibold tracking-wide rounded-lg px-3 py-1.5 border transition-colors ' +
                (active
                  ? 'text-zinc-100 border-white/15 bg-white/[0.06]'
                  : 'text-zinc-500 border-[var(--color-border)] hover:text-zinc-300')
              }
            >
              {c.label}<span className="ml-1.5 opacity-50">{c.count}</span>
            </button>
          );
        })}
      </div>

      {/* Column header (desktop only) */}
      <div className={`hidden ${COLS} gap-x-4 px-4 pb-2.5 mono text-[9px] font-semibold tracking-widest text-zinc-600`}>
        <span>PROJECT</span>
        <span>STAGE</span>
        <span>PROGRESS</span>
        <span>CATEGORY</span>
        <span>HEALTH</span>
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
        <p className="mt-6 text-center text-sm text-zinc-600">No projects in this category.</p>
      )}
    </div>
  );
}
