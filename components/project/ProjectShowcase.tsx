'use client';

// Project showcase — "Cinematic Cyber-Den" (Version C, chosen by owner).
// Multi-hue (no per-project accent): a shared neon-night spectrum. WebGL plasma
// background + veil/scan/grain overlays, sweep-gradient title, hued count-up
// numbers, gradient act-tabs, animated reel. All data DB-backed (shaped in
// page.tsx); empty sections hide; real mermaid architecture kept via archSlot.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ShaderBackground } from './ShaderBackground';
import { ReelCanvas } from './ReelCanvas';

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
  downloads: { label: string; href: string }[];
}

const MAG = 'var(--mag)', VIO = 'var(--vio)', CYAN = 'var(--cyan)', CORAL = 'var(--coral)', AMBER = 'var(--amber)', DIM = 'var(--dim)';
const NUM_HUES = [MAG, CYAN, VIO, CORAL, AMBER, CYAN];

function featTone(s: string) {
  if (s === 'done') return { c: CYAN, l: 'DONE' };
  if (s === 'building') return { c: AMBER, l: 'WIP' };
  if (s === 'blocked') return { c: MAG, l: 'BLOCKED' };
  return { c: DIM, l: 'TODO' };
}
function flowTone(s: string) {
  if (s === 'passing') return { c: CYAN, m: '✓' };
  if (s === 'failing') return { c: MAG, m: '✕' };
  if (s === 'partial') return { c: AMBER, m: '~' };
  return { c: DIM, m: '·' };
}
function sevTone(s: string) {
  if (s === 'critical' || s === 'high') return MAG;
  if (s === 'medium') return AMBER;
  return DIM;
}
function ext(u: string) { return u.startsWith('http') ? u : `https://${u}`; }

function NumberTicker({ value }: { value: string | number }) {
  const raw = String(value);
  const m = raw.match(/^(\d+)(\D*)$/);
  const target = m ? parseInt(m[1], 10) : null;
  const suffix = m ? m[2] : '';
  const prefix = raw.startsWith('$') ? '$' : '';
  const [n, setN] = useState(target === null ? raw : `${prefix}0${suffix}`);
  useEffect(() => {
    if (target === null) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(`${prefix}${target}${suffix}`); return; }
    let raf = 0; const start = performance.now(); const dur = 1300;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setN(`${prefix}${Math.round(e * target)}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, suffix, prefix]);
  return <span className="tabular-nums">{n}</span>;
}

// section label
function Eye({ children, tone }: { children: ReactNode; tone?: string }) {
  return <div className="eyebrow" style={tone ? { color: tone } : undefined}>{children}</div>;
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
    <div className="sc">
      <ShaderBackground />
      <div className="sc-veil" aria-hidden />
      <div className="sc-scan" aria-hidden />
      <div className="sc-grain" aria-hidden />

      <div className="sc-wrap">
        {/* ── HERO ── */}
        <header className="pt-6 pb-8">
          <div className="grid items-center gap-8 lg:gap-12 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="flex flex-wrap gap-2 mb-5">
                {d.tags.slice(0, 6).map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
              <div className="flex items-end gap-4 flex-wrap">
                <h1 className="display">{d.name}</h1>
                <span className="stagepill mb-2">{d.stageLabel}</span>
              </div>
              <p className="mt-5 mb-7 text-[color:var(--mute)] leading-relaxed max-w-[56ch] text-[15px] md:text-[16px]">{d.hook}</p>

              <div className="flex flex-wrap gap-3.5 mb-8">
                {d.liveUrl && (
                  <a href={ext(d.liveUrl)} target="_blank" rel="noopener" className="lc flex-1 min-w-[220px]">
                    <div className="k">live at ↗</div>
                    <div className="v">{d.liveUrl.replace(/^https?:\/\//, '')}</div>
                  </a>
                )}
                {d.repoUrl && (
                  <a href={ext(d.repoUrl)} target="_blank" rel="noopener" className="lc repo flex-1 min-w-[220px]">
                    <div className="k">repo ↗</div>
                    <div className="v">{d.repoUrl.replace(/^https?:\/\//, '')}</div>
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {d.numbers.map((num, i) => (
                  <div key={num.l} className="numc" style={{ '--nc': NUM_HUES[i % NUM_HUES.length] } as React.CSSProperties}>
                    <div className="n"><NumberTicker value={num.n} /></div>
                    <div className="l">{num.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* reel */}
            <div className="reel">
              <ReelCanvas />
              <div className="absolute inset-0 pointer-events-none p-4 flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: MAG }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: AMBER }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CYAN }} />
                  <span className="ml-auto mono text-[10px] tracking-[.14em] uppercase px-2 py-1 rounded-md" style={{ color: CYAN, border: '1px solid var(--line2)', background: 'rgba(5,6,15,.6)' }}>reel</span>
                </div>
                <div className="mt-auto">
                  <div className="font-display font-extrabold text-xl text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,.8)' }}>{d.name}</div>
                  <div className="mono text-[10.5px] mt-1 tracking-wide" style={{ color: 'var(--mute)' }}>media coming soon</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── ACT TABS ── */}
        <div className="tabbar" role="tablist" aria-label="Project sections">
          {TABS.map((t, i) => (
            <button key={t.k} role="tab" aria-selected={tab === t.k} className="tab" onClick={() => setTab(t.k)}>
              <span className="idx">0{i + 1}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ── PANELS ── */}
        <div key={tab} className="panel pb-4">
          {tab === 'overview' && <OverviewPanel d={d} />}
          {tab === 'engineering' && <EngineeringPanel d={d} archSlot={archSlot} />}
          {tab === 'development' && <DevelopmentPanel d={d} />}
          {tab === 'resources' && <ResourcesPanel d={d} />}
        </div>

        <div className="mt-10 pb-14 text-center mono text-[11px]" style={{ color: 'var(--dim)' }}>
          tracked by ottomate · lock-in gates + independent verifier · docs generated, not handwritten
        </div>
      </div>
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-8 pt-4">{children}</div>;
}

// ── OVERVIEW ──
function OverviewPanel({ d }: { d: ShowcaseData }) {
  return (
    <Section>
      <div className="grid gap-3.5 md:grid-cols-[1.3fr_1fr]">
        {d.problem && (
          <div className="card flat">
            <Eye tone={CORAL}>The problem</Eye>
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--ink)' }}>{d.problem}</p>
          </div>
        )}
        {d.contextChips.length > 0 && (
          <div className="card flat">
            <Eye tone={CYAN}>Context</Eye>
            <div className="flex flex-col gap-2.5">
              {d.contextChips.map((c) => (
                <div key={c.k} className="flex items-center justify-between gap-3">
                  <span className="mono text-[11px] tracking-wider" style={{ color: 'var(--dim)' }}>{c.k}</span>
                  <span className="text-[13.5px]" style={{ color: 'var(--ink)' }}>{c.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(d.success.length > 0 || d.nonGoals.length > 0) && (
        <div className="grid gap-3.5 md:grid-cols-2">
          {d.success.length > 0 && (
            <div className="card">
              <Eye tone={CYAN}>Success criteria</Eye>
              <ul className="flex flex-col gap-2.5">
                {d.success.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-snug" style={{ color: 'var(--ink)' }}>
                    <span className="mono text-[12px] mt-0.5" style={{ color: CYAN }}>✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {d.nonGoals.length > 0 && (
            <div className="card">
              <Eye tone={VIO}>Non-goals <span style={{ color: 'var(--dim)', textTransform: 'none', letterSpacing: 0 }}>· deliberately not built</span></Eye>
              <div className="flex flex-wrap gap-2">
                {d.nonGoals.map((n, i) => (
                  <span key={i} className="text-[12.5px] rounded-lg px-2.5 py-1 line-through" style={{ color: 'var(--mute)', background: 'rgba(12,11,28,.5)', border: '1px solid var(--line)', textDecorationColor: 'var(--dim)' }}>{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {d.features.length > 0 && (
        <div className="card flat">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <Eye tone={MAG}>Core features</Eye>
            <div className="flex gap-3.5 mono text-[11px]">
              <span style={{ color: CYAN }}>{d.featureCounts.done} done</span>
              <span style={{ color: AMBER }}>{d.featureCounts.wip} wip</span>
              <span style={{ color: DIM }}>{d.featureCounts.todo} todo</span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {d.features.map((f, i) => {
              const t = featTone(f.status);
              return (
                <div key={i} className="card" style={{ padding: '15px 16px' }}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.c, boxShadow: `0 0 10px ${t.c}` }} />
                    <span className="font-semibold text-[14.5px]" style={{ color: 'var(--ink)' }}>{f.title}</span>
                    <span className="mono text-[10px] ml-auto shrink-0" style={{ color: t.c }}>{t.l}</span>
                  </div>
                  {f.why && <p className="text-[12.5px] leading-snug" style={{ color: 'var(--mute)' }}>{f.why}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(d.primaryFlow || d.flows.length > 0) && (
        <div className="card flat">
          <Eye tone={CYAN}>User flows</Eye>
          {d.primaryFlow && d.primaryFlow.steps.length > 0 && (
            <>
              <div className="mono text-[11px] mb-3" style={{ color: 'var(--dim)' }}>critical path · {d.primaryFlow.name}</div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {d.primaryFlow.steps.map((s, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="text-[12.5px] rounded-lg px-3 py-2" style={{ color: 'var(--ink)', background: 'rgba(12,11,28,.6)', border: '1px solid var(--line)' }}>{s}</span>
                    {i < d.primaryFlow!.steps.length - 1 && <span style={{ color: VIO }}>→</span>}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="flex flex-col" style={{ borderTop: '1px solid var(--line)' }}>
            {d.flows.slice(0, 8).map((f, i) => {
              const t = flowTone(f.testStatus);
              return (
                <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
                  <span className="mono text-[13px] w-4 shrink-0" style={{ color: t.c }}>{t.m}</span>
                  <span className="flex-1 text-[13px]" style={{ color: 'var(--ink)' }}>{f.title}</span>
                  <span className="mono text-[9.5px] tracking-wide" style={{ color: t.c }}>{f.testStatus}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {d.roadmap.length > 0 && (
        <div className="card flat">
          <Eye tone={AMBER}>Roadmap · what's next</Eye>
          <ul className="flex flex-col gap-2.5">
            {d.roadmap.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px]" style={{ color: 'var(--mute)' }}><span style={{ color: 'var(--dim)' }}>→</span>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

// ── ENGINEERING ──
function EngineeringPanel({ d, archSlot }: { d: ShowcaseData; archSlot: ReactNode }) {
  return (
    <Section>
      {archSlot && <div className="card flat">{archSlot}</div>}
      {d.stack.length > 0 && (
        <div className="card flat">
          <Eye tone={CYAN}>Tech stack</Eye>
          <div className="flex flex-wrap gap-2">
            {d.stack.map((t, i) => (
              <span key={i} className="mono text-[12px] rounded-lg px-3 py-2" style={{ color: 'var(--ink)', background: 'rgba(12,11,28,.6)', border: '1px solid var(--line)' }}>{t}</span>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-3.5 md:grid-cols-2 items-start">
        <div className="card">
          <Eye tone={CYAN}>Security</Eye>
          <ul className="flex flex-col gap-2.5">
            {d.security.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-snug" style={{ color: 'var(--ink)' }}><span style={{ color: CYAN }}>◈</span>{s}</li>
            ))}
          </ul>
        </div>
        {d.dataModel && (
          <div className="card">
            <Eye tone={VIO}>Data model</Eye>
            <div className="flex flex-col gap-2 mono text-[12px]" style={{ color: 'var(--ink)' }}>
              {d.dataModel.engine && <div>engine · {d.dataModel.engine}</div>}
              {d.dataModel.storage && <div>storage · {d.dataModel.storage}</div>}
              {d.dataModel.migration && <div>migrations · {d.dataModel.migration}</div>}
              {d.dataModel.sources.length > 0 && <div style={{ color: 'var(--mute)' }}>sources · {d.dataModel.sources.join(', ')}</div>}
            </div>
          </div>
        )}
      </div>
      {d.services.length > 0 && (
        <div className="card flat">
          <Eye tone={AMBER}>Third-party services</Eye>
          <div className="grid gap-2 md:grid-cols-2">
            {d.services.map((s, i) => (
              <div key={i} className="flex items-baseline gap-2 text-[13px]">
                <span className="font-medium" style={{ color: 'var(--ink)' }}>{s.name}</span>
                {s.purpose && <span className="truncate" style={{ color: 'var(--mute)' }}>— {s.purpose}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

// ── DEVELOPMENT ──
function DevelopmentPanel({ d }: { d: ShowcaseData }) {
  return (
    <Section>
      <div className="grid gap-3.5 md:grid-cols-[1fr_1.15fr] items-start">
        {d.timeline.length > 0 && (
          <div className="card flat">
            <Eye tone={VIO}>Timeline</Eye>
            <div className="flex flex-col">
              {d.timeline.map((t, i) => (
                <div key={i} className="grid grid-cols-[16px_1fr] gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 w-2 h-2 rounded-full" style={{ background: NUM_HUES[i % NUM_HUES.length], boxShadow: `0 0 10px ${NUM_HUES[i % NUM_HUES.length]}` }} />
                    {i < d.timeline.length - 1 && <span className="flex-1 w-px min-h-[18px]" style={{ background: 'var(--line)' }} />}
                  </div>
                  <div className="pb-4">
                    <span className="mono text-[10px]" style={{ color: 'var(--cyan)' }}>{t.date}</span>
                    <div className="text-[13px] leading-snug mt-0.5" style={{ color: 'var(--ink)' }}>{t.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="card flat">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <Eye tone={CYAN}>Tests &amp; verification</Eye>
            <span className="mono text-[10px] rounded px-2 py-1" style={{ color: CYAN, background: 'rgba(34,211,238,.1)', border: '1px solid var(--line2)' }}>honest ratio</span>
          </div>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink)' }}>{d.tests.note}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="numc" style={{ '--nc': CYAN } as React.CSSProperties}>
              <div className="n"><NumberTicker value={`${d.tests.coveragePct}%`} /></div>
              <div className="l">flow coverage</div>
            </div>
            <div className="numc" style={{ '--nc': VIO } as React.CSSProperties}>
              <div className="n">{d.tests.flowsPassing}/{d.tests.flowsTotal}</div>
              <div className="l">flows passing</div>
            </div>
          </div>
        </div>
      </div>

      {d.journal.length > 0 && (
        <div className="card flat">
          <Eye tone={MAG}>Decision journal <span style={{ color: 'var(--dim)', textTransform: 'none', letterSpacing: 0 }}>· how the thinking evolved</span></Eye>
          <div className="flex flex-col">
            {d.journal.map((j, i) => (
              <div key={i} className="grid grid-cols-[96px_1fr] gap-3 py-2.5 items-baseline" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                <span className="mono text-[10.5px]" style={{ color: NUM_HUES[i % NUM_HUES.length] }}>{j.date}</span>
                <div>
                  <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{j.title}</span>
                  {j.superseded && <span className="ml-2 mono text-[9px] uppercase" style={{ color: 'var(--dim)' }}>superseded</span>}
                  {j.tags.length > 0 && (
                    <span className="ml-2 inline-flex gap-1.5">
                      {j.tags.slice(0, 3).map((t) => (
                        <span key={t} className="mono text-[9px] rounded px-1.5 py-0.5" style={{ color: 'var(--mute)', border: '1px solid var(--line)' }}>{t}</span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.challenges.length > 0 && (
        <div className="card flat">
          <Eye tone={CORAL}>Challenges resolved</Eye>
          <div className="flex flex-col gap-3.5">
            {d.challenges.map((c, i) => (
              <div key={i} className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mono text-[9px] tracking-wide mb-1" style={{ color: CORAL }}>RISK</div>
                  <div className="text-[13px] leading-snug" style={{ color: 'var(--ink)' }}>{c.problem}</div>
                </div>
                <div>
                  <div className="mono text-[9px] tracking-wide mb-1" style={{ color: CYAN }}>RESOLVED</div>
                  <div className="text-[13px] leading-snug" style={{ color: 'var(--mute)' }}>{c.solved}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.risks.length > 0 && (
        <div className="card flat">
          <Eye tone={AMBER}>Open risks <span style={{ color: 'var(--dim)', textTransform: 'none', letterSpacing: 0 }}>· acknowledged, not hidden</span></Eye>
          <div className="flex flex-col">
            {d.risks.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sevTone(r.severity), boxShadow: `0 0 10px ${sevTone(r.severity)}` }} />
                <span className="flex-1 text-[13px]" style={{ color: 'var(--ink)' }}>{r.name}</span>
                {r.category && <span className="mono text-[10px]" style={{ color: 'var(--dim)' }}>{r.category}</span>}
                <span className="mono text-[9px] rounded px-2 py-0.5" style={{ color: sevTone(r.severity), border: '1px solid var(--line)' }}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

// ── RESOURCES ──
function ResourcesPanel({ d }: { d: ShowcaseData }) {
  return (
    <Section>
      <div className="grid gap-3.5 md:grid-cols-2">
        <div className="card flat">
          <Eye tone={CYAN}>Documentation</Eye>
          {d.docs.length > 0 ? (
            <div className="flex flex-col">
              {d.docs.map((doc, i) => (
                <span key={i} className="flex items-center justify-between py-2.5 text-[13px]" style={{ color: 'var(--ink)', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  {doc.name}<span style={{ color: CYAN }}>↗</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px]" style={{ color: 'var(--dim)' }}>No public docs mirrored yet.</p>
          )}
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="card flat">
            <Eye tone={AMBER}>Downloads</Eye>
            <div className="flex flex-wrap gap-2">
              {d.downloads.map((dl, i) => (
                <a key={i} href={dl.href} target="_blank" rel="noopener" className="mono text-[11px] rounded-lg px-3 py-2 transition-colors" style={{ color: 'var(--ink)', background: 'rgba(12,11,28,.6)', border: '1px solid var(--line)' }}>↓ {dl.label}</a>
              ))}
            </div>
          </div>
          {d.repoUrl && (
            <a href={ext(d.repoUrl)} target="_blank" rel="noopener" className="lc repo flex items-center justify-between">
              <div>
                <div className="k">source ↗</div>
                <div className="v">{d.repoUrl.replace(/^https?:\/\//, '')}</div>
              </div>
            </a>
          )}
        </div>
      </div>
    </Section>
  );
}
