'use client';

// Project showcase shell (prototype adoption, ui-overhaul). Persistent hero +
// in-page act-tabs (Overview / Engineering / Development / Resources). Per-project
// accent for identity; semantic palette for status. All data is DB-backed (shaped
// server-side in page.tsx); empty sections hide gracefully.

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface ShowcaseData {
  slug: string; name: string; accent: string; tagline: string; hook: string; tags: string[];
  stageLabel: string; status: string;
  liveUrl: string | null; repoUrl: string | null; port: number | null;
  numbers: { n: string | number; l: string }[];
  featureCounts: { done: number; wip: number; todo: number };
  problem: string;
  contextChips: { k: string; v: string }[];
  success: string[];
  nonGoals: string[];
  features: { title: string; status: string; priority: string; why: string }[];
  flows: { title: string; priority: string; testStatus: string }[];
  primaryFlow: { name: string; steps: string[] } | null;
  roadmap: string[];
  stack: string[];
  services: { name: string; purpose: string }[];
  security: string[];
  dataModel: { engine: string | null; storage: string | null; migration: string | null; sources: string[] } | null;
  hasArch: boolean;
  timeline: { date: string; label: string }[];
  tests: { flowsPassing: number; flowsTotal: number; coveragePct: number; note: string };
  journal: { date: string; title: string; tags: string[]; status: string; superseded: boolean }[];
  challenges: { problem: string; solved: string }[];
  risks: { name: string; category: string; severity: string; status: string }[];
  docs: { name: string }[];
  downloads: string[];
}

const DONE = 'var(--color-done)';
const WIP = 'var(--color-wip)';
const TODO = 'var(--color-todo)';
const RISK = 'var(--color-risk)';

function featTone(s: string) {
  if (s === 'done') return { c: DONE, l: 'DONE' };
  if (s === 'building') return { c: WIP, l: 'WIP' };
  if (s === 'blocked') return { c: RISK, l: 'BLOCKED' };
  return { c: TODO, l: 'TODO' };
}
function flowTone(s: string) {
  if (s === 'passing') return { c: DONE, m: '✓' };
  if (s === 'failing') return { c: RISK, m: '✕' };
  if (s === 'partial') return { c: WIP, m: '~' };
  return { c: TODO, m: '·' };
}
function sevTone(s: string) {
  if (s === 'critical' || s === 'high') return RISK;
  if (s === 'medium') return WIP;
  return TODO;
}

// ── little primitives ──
function Tile({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={`a-fade-up rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 mb-3">
      {children}{hint && <span className="text-zinc-700"> · {hint}</span>}
    </div>
  );
}
function NumberTicker({ value }: { value: string | number }) {
  const raw = String(value);
  const m = raw.match(/^(\d+)(\D*)$/);
  const target = m ? parseInt(m[1], 10) : null;
  const suffix = m ? m[2] : '';
  const [n, setN] = useState(target === null ? raw : '0');
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (target === null) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setN(String(target)); return;
    }
    let raf = 0; const start = performance.now(); const dur = 700;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(String(Math.round(eased * target)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span ref={ref} className="tabular-nums">{n}{suffix}</span>;
}

const TABS = [
  { k: 'overview', label: 'Overview' },
  { k: 'engineering', label: 'Engineering' },
  { k: 'development', label: 'Development' },
  { k: 'resources', label: 'Resources' },
] as const;
type TabKey = (typeof TABS)[number]['k'];

export function ProjectShowcase({ data, archSlot }: { data: ShowcaseData; archSlot: ReactNode }) {
  const [tab, setTab] = useState<TabKey>('overview');
  const d = data;

  return (
    <div style={{ '--accent': d.accent } as React.CSSProperties}>
      {/* ── HERO ── */}
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.15fr] items-stretch">
        <div className="a-fade-up flex flex-col rounded-2xl border border-[var(--color-border-2)] bg-gradient-to-b from-[#151b29] to-[#0d1017] p-6"
             style={{ boxShadow: '0 16px 40px rgba(0,0,0,.4)' }}>
          {d.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {d.tags.slice(0, 5).map((t) => (
                <span key={t} className="mono text-[9px] text-zinc-400 rounded border border-[var(--color-border)] bg-black/20 px-2 py-1">{t}</span>
              ))}
            </div>
          )}
          <div className="mt-3.5 flex items-baseline gap-3 flex-wrap">
            <h1 className="font-display text-[32px] font-extrabold tracking-tight text-zinc-50 leading-none">{d.name}</h1>
            <span className="mono text-[10px] font-semibold rounded px-2 py-1 text-accent"
                  style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-bd)' }}>{d.stageLabel}</span>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-zinc-400">{d.hook}</p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {d.liveUrl && (
              <a href={d.liveUrl.startsWith('http') ? d.liveUrl : `https://${d.liveUrl}`} target="_blank" rel="noopener"
                 className="group flex flex-col gap-1.5 rounded-xl border p-3 transition-colors" style={{ borderColor: 'var(--accent-bd)' }}>
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full a-pulse-dot" style={{ background: 'var(--accent)' }} />
                  <span className="mono text-[8px] tracking-widest text-zinc-500">LIVE AT</span>
                  <span className="ml-auto text-accent">↗</span>
                </span>
                <span className="mono text-[11.5px] font-semibold text-zinc-100 truncate">{d.liveUrl.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            {d.repoUrl && (
              <a href={d.repoUrl.startsWith('http') ? d.repoUrl : `https://${d.repoUrl}`} target="_blank" rel="noopener"
                 className="flex flex-col gap-1.5 rounded-xl border border-[var(--color-border-2)] p-3 transition-colors hover:border-zinc-500">
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-zinc-500" />
                  <span className="mono text-[8px] tracking-widest text-zinc-500">REPO</span>
                  <span className="ml-auto text-zinc-500">↗</span>
                </span>
                <span className="mono text-[11.5px] font-semibold text-zinc-300 truncate">{d.repoUrl.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>

          {/* honest numbers */}
          <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
            {d.numbers.map((num) => (
              <div key={num.l} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 py-2.5">
                <div className="mono text-[17px] font-bold text-zinc-100"><NumberTicker value={num.n} /></div>
                <div className="mono text-[7.5px] tracking-widest text-zinc-500 mt-1">{num.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* media reel placeholder (real capture pipeline is a separate task) */}
        <div className="a-fade-up relative min-h-[320px] overflow-hidden rounded-2xl border border-[var(--color-border-2)]"
             style={{ background: 'radial-gradient(120% 120% at 30% 0%, var(--accent-bg), #0e1015 60%)' }}>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="mono text-[10px] tracking-widest text-zinc-500">DEMO REEL</div>
              <div className="mt-2 text-[13px] text-zinc-600">{d.name} — media coming soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACT TABS ── */}
      <div className="mt-5 inline-flex gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-2)] p-1.5">
        {TABS.map((t) => {
          const active = tab === t.k;
          return (
            <button key={t.k} type="button" onClick={() => setTab(t.k)}
              className={'font-display text-[13px] font-semibold rounded-lg px-4 py-2 transition-colors ' +
                (active ? 'text-[#0b0c10]' : 'text-zinc-400 hover:text-zinc-100')}
              style={active ? { background: 'var(--accent)' } : undefined}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── PANELS ── */}
      <div className="mt-4 a-fade-in" key={tab}>
        {tab === 'overview' && <OverviewPanel d={d} />}
        {tab === 'engineering' && <EngineeringPanel d={d} archSlot={archSlot} />}
        {tab === 'development' && <DevelopmentPanel d={d} />}
        {tab === 'resources' && <ResourcesPanel d={d} />}
      </div>

      <div className="mt-8 text-center mono text-[10px] text-zinc-700">
        tracked by ottomate · lock-in gates + independent verifier · docs generated, not handwritten
      </div>
    </div>
  );
}

// ── OVERVIEW ──
function OverviewPanel({ d }: { d: ShowcaseData }) {
  return (
    <div className="space-y-3.5">
      <div className="grid gap-3.5 md:grid-cols-[1.3fr_1fr]">
        {d.problem && (
          <Tile>
            <Label>PROBLEM</Label>
            <p className="text-[14px] leading-relaxed text-zinc-300">{d.problem}</p>
          </Tile>
        )}
        {d.contextChips.length > 0 && (
          <Tile delay={40}>
            <Label>CONTEXT</Label>
            <div className="flex flex-col gap-2.5">
              {d.contextChips.map((c) => (
                <div key={c.k} className="flex items-center justify-between gap-3">
                  <span className="mono text-[9px] tracking-widest text-zinc-600">{c.k}</span>
                  <span className="text-[12.5px] text-zinc-300">{c.v}</span>
                </div>
              ))}
            </div>
          </Tile>
        )}
      </div>

      {(d.success.length > 0 || d.nonGoals.length > 0) && (
        <div className="grid gap-3.5 md:grid-cols-2">
          {d.success.length > 0 && (
            <Tile>
              <Label>SUCCESS CRITERIA</Label>
              <ul className="flex flex-col gap-2.5">
                {d.success.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug text-zinc-300">
                    <span className="mono text-[11px] mt-0.5" style={{ color: 'var(--accent)' }}>✓</span>{s}
                  </li>
                ))}
              </ul>
            </Tile>
          )}
          {d.nonGoals.length > 0 && (
            <Tile delay={40}>
              <Label hint="deliberately not built">NON-GOALS</Label>
              <div className="flex flex-wrap gap-2">
                {d.nonGoals.map((n, i) => (
                  <span key={i} className="text-[11.5px] text-zinc-500 rounded-md border border-[var(--color-border)] bg-[var(--color-card-2)] px-2.5 py-1 line-through decoration-zinc-700">{n}</span>
                ))}
              </div>
            </Tile>
          )}
        </div>
      )}

      {d.features.length > 0 && (
        <Tile>
          <div className="flex items-center justify-between mb-3.5">
            <span className="mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500">CORE FEATURES</span>
            <div className="flex gap-3 mono text-[9px]">
              <span style={{ color: DONE }}>{d.featureCounts.done} done</span>
              <span style={{ color: WIP }}>{d.featureCounts.wip} wip</span>
              <span style={{ color: TODO }}>{d.featureCounts.todo} todo</span>
            </div>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {d.features.map((f, i) => {
              const t = featTone(f.status);
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-2)] p-3 transition-colors hover:border-[var(--color-border-2)]">
                  <span className="mt-1 size-2.5 shrink-0 rounded-[3px]" style={{ background: t.c }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-zinc-200">{f.title}</span>
                      <span className="mono text-[8px] text-zinc-600">{f.priority}</span>
                      <span className="mono text-[8px] font-semibold ml-auto shrink-0" style={{ color: t.c }}>{t.l}</span>
                    </div>
                    {f.why && <p className="mt-1 text-[11.5px] leading-snug text-zinc-500">{f.why}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Tile>
      )}

      {(d.primaryFlow || d.flows.length > 0) && (
        <Tile>
          <Label>USER FLOWS</Label>
          {d.primaryFlow && d.primaryFlow.steps.length > 0 && (
            <>
              <div className="mono text-[9px] text-zinc-600 mb-3">critical path · {d.primaryFlow.name}</div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {d.primaryFlow.steps.map((s, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="text-[12px] rounded-lg px-3 py-2 text-zinc-200 bg-[var(--color-card-2)] border border-[var(--color-border-2)]">{s}</span>
                    {i < d.primaryFlow!.steps.length - 1 && <span className="text-zinc-600">→</span>}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {d.flows.slice(0, 8).map((f, i) => {
              const t = flowTone(f.testStatus);
              return (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <span className="mono text-[12px] w-4 shrink-0" style={{ color: t.c }}>{t.m}</span>
                  <span className="flex-1 text-[12.5px] text-zinc-300">{f.title}</span>
                  <span className="mono text-[8.5px] tracking-wide" style={{ color: t.c }}>{f.testStatus}</span>
                </div>
              );
            })}
          </div>
        </Tile>
      )}

      {d.roadmap.length > 0 && (
        <Tile>
          <Label>ROADMAP · WHAT'S NEXT</Label>
          <ul className="flex flex-col gap-2.5">
            {d.roadmap.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-[12.5px] text-zinc-400"><span className="text-zinc-600">→</span>{r}</li>
            ))}
          </ul>
        </Tile>
      )}
    </div>
  );
}

// ── ENGINEERING ──
function EngineeringPanel({ d, archSlot }: { d: ShowcaseData; archSlot: ReactNode }) {
  return (
    <div className="space-y-3.5">
      {archSlot && <Tile>{archSlot}</Tile>}
      {d.stack.length > 0 && (
        <Tile>
          <Label>TECH STACK</Label>
          <div className="flex flex-wrap gap-2">
            {d.stack.map((t, i) => (
              <span key={i} className="mono text-[11px] text-zinc-200 rounded-lg border border-[var(--color-border-2)] bg-[var(--color-card-2)] px-3 py-2">{t}</span>
            ))}
          </div>
        </Tile>
      )}
      <div className="grid gap-3.5 md:grid-cols-2 items-start">
        <Tile>
          <Label>SECURITY</Label>
          <ul className="flex flex-col gap-2.5">
            {d.security.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug text-zinc-300"><span style={{ color: DONE }} className="text-[11px]">◈</span>{s}</li>
            ))}
          </ul>
        </Tile>
        {d.dataModel && (
          <Tile delay={40}>
            <Label>DATA MODEL</Label>
            <div className="flex flex-col gap-2 mono text-[11px] text-zinc-300">
              {d.dataModel.engine && <div>engine · {d.dataModel.engine}</div>}
              {d.dataModel.storage && <div>storage · {d.dataModel.storage}</div>}
              {d.dataModel.migration && <div>migrations · {d.dataModel.migration}</div>}
              {d.dataModel.sources.length > 0 && <div className="text-zinc-500">sources · {d.dataModel.sources.join(', ')}</div>}
            </div>
          </Tile>
        )}
      </div>
      {d.services.length > 0 && (
        <Tile>
          <Label>THIRD-PARTY SERVICES</Label>
          <div className="grid gap-2 md:grid-cols-2">
            {d.services.map((s, i) => (
              <div key={i} className="flex items-baseline gap-2 text-[12.5px]">
                <span className="text-zinc-200 font-medium">{s.name}</span>
                {s.purpose && <span className="text-zinc-500 truncate">— {s.purpose}</span>}
              </div>
            ))}
          </div>
        </Tile>
      )}
    </div>
  );
}

// ── DEVELOPMENT ──
function DevelopmentPanel({ d }: { d: ShowcaseData }) {
  return (
    <div className="space-y-3.5">
      <div className="grid gap-3.5 md:grid-cols-[1fr_1.15fr] items-start">
        {d.timeline.length > 0 && (
          <Tile>
            <Label>TIMELINE</Label>
            <div className="flex flex-col">
              {d.timeline.map((t, i) => (
                <div key={i} className="grid grid-cols-[16px_1fr] gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 size-2 rounded-full" style={{ background: 'var(--accent)' }} />
                    {i < d.timeline.length - 1 && <span className="flex-1 w-px bg-[var(--color-border)] min-h-[18px]" />}
                  </div>
                  <div className="pb-3.5">
                    <span className="mono text-[9px]" style={{ color: 'var(--accent)' }}>{t.date}</span>
                    <div className="text-[12.5px] text-zinc-300 leading-snug mt-0.5">{t.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </Tile>
        )}
        <Tile delay={40}>
          <div className="flex items-center justify-between mb-3">
            <span className="mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500">TESTS &amp; VERIFICATION</span>
            <span className="mono text-[9px] rounded px-2 py-1" style={{ color: DONE, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)' }}>honest ratio</span>
          </div>
          <p className="text-[13.5px] leading-relaxed text-zinc-300">{d.tests.note}</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-2)] p-3">
              <div className="mono text-[18px] font-bold" style={{ color: 'var(--accent)' }}><NumberTicker value={`${d.tests.coveragePct}%`} /></div>
              <div className="mono text-[8px] tracking-widest text-zinc-500 mt-1">FLOW COVERAGE</div>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-2)] p-3">
              <div className="mono text-[18px] font-bold text-zinc-100">{d.tests.flowsPassing}/{d.tests.flowsTotal}</div>
              <div className="mono text-[8px] tracking-widest text-zinc-500 mt-1">FLOWS PASSING</div>
            </div>
          </div>
        </Tile>
      </div>

      {d.journal.length > 0 && (
        <Tile>
          <Label hint="how the thinking evolved">DECISION JOURNAL</Label>
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {d.journal.map((j, i) => (
              <div key={i} className="grid grid-cols-[92px_1fr] gap-3 py-2.5 items-baseline">
                <span className="mono text-[10px]" style={{ color: 'var(--accent)' }}>{j.date}</span>
                <div>
                  <span className="text-[12.5px] font-medium text-zinc-200">{j.title}</span>
                  {j.superseded && <span className="ml-2 mono text-[8px] text-zinc-600 uppercase">superseded</span>}
                  {j.tags.length > 0 && (
                    <span className="ml-2 inline-flex gap-1.5">
                      {j.tags.slice(0, 3).map((t) => (
                        <span key={t} className="mono text-[8px] text-zinc-600 rounded border border-[var(--color-border)] px-1.5 py-0.5">{t}</span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Tile>
      )}

      {d.challenges.length > 0 && (
        <Tile>
          <Label>CHALLENGES RESOLVED</Label>
          <div className="flex flex-col gap-3.5">
            {d.challenges.map((c, i) => (
              <div key={i} className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mono text-[8.5px] tracking-wide mb-1" style={{ color: RISK }}>RISK</div>
                  <div className="text-[12.5px] text-zinc-300 leading-snug">{c.problem}</div>
                </div>
                <div>
                  <div className="mono text-[8.5px] tracking-wide mb-1" style={{ color: DONE }}>RESOLVED</div>
                  <div className="text-[12.5px] text-zinc-400 leading-snug">{c.solved}</div>
                </div>
              </div>
            ))}
          </div>
        </Tile>
      )}

      {d.risks.length > 0 && (
        <Tile>
          <Label hint="acknowledged, not hidden">OPEN RISKS</Label>
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {d.risks.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <span className="size-2 rounded-full shrink-0" style={{ background: sevTone(r.severity) }} />
                <span className="flex-1 text-[12.5px] text-zinc-300">{r.name}</span>
                {r.category && <span className="mono text-[9px] text-zinc-600">{r.category}</span>}
                <span className="mono text-[8.5px] rounded border px-2 py-0.5" style={{ color: sevTone(r.severity), borderColor: 'var(--color-border)' }}>{r.status}</span>
              </div>
            ))}
          </div>
        </Tile>
      )}
    </div>
  );
}

// ── RESOURCES ──
function ResourcesPanel({ d }: { d: ShowcaseData }) {
  return (
    <div className="space-y-3.5">
      <div className="grid gap-3.5 md:grid-cols-2">
        <Tile>
          <Label>DOCUMENTATION</Label>
          {d.docs.length > 0 ? (
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {d.docs.map((doc, i) => (
                <span key={i} className="flex items-center justify-between py-2.5 text-[12.5px] text-zinc-300">
                  {doc.name}<span style={{ color: 'var(--accent)' }}>↗</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-zinc-600">No public docs mirrored yet.</p>
          )}
        </Tile>
        <div className="flex flex-col gap-3.5">
          <Tile>
            <Label>DOWNLOADS</Label>
            <div className="flex flex-wrap gap-2">
              {d.downloads.map((dl, i) => (
                <span key={i} className="mono text-[10.5px] text-zinc-300 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-2)] px-3 py-2">↓ {dl}</span>
              ))}
            </div>
          </Tile>
          {d.repoUrl && (
            <Tile className="flex items-center justify-between">
              <div>
                <Label>SOURCE</Label>
                <div className="mono text-[12px] text-zinc-300 -mt-1">{d.repoUrl.replace(/^https?:\/\//, '')}</div>
              </div>
              <a href={d.repoUrl.startsWith('http') ? d.repoUrl : `https://${d.repoUrl}`} target="_blank" rel="noopener"
                 className="mono text-[11px] font-semibold rounded-lg border border-[var(--color-border-2)] px-4 py-2.5 text-zinc-200 hover:border-zinc-500 transition-colors">Repo ↗</a>
            </Tile>
          )}
        </div>
      </div>
    </div>
  );
}
