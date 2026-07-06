'use client';

// Project showcase — "Cinematic Cyber-Den" (Version C, chosen by owner).
// iter-13 rework per owner feedback 2026-07-04: smaller hero title, wider hook
// (no dead right gutter), labeled tech chips (personal/cv retired), curated
// hero stats, numbered section structure (no more "randomly thrown" blocks),
// fluid --t-* type tokens site-wide (nothing below the readability floor).
// adr-021 IA (2026-07-06): tabs are Overview / Engineering / Decisions /
// Resources — Development dissolved (tests → Engineering; journal + risks +
// the new Decision→change→verified trace → Decisions; thin timeline dropped).
// Hero gains a visual-identity strip (ui_master_plans); Engineering gains the
// independent-verifier aggregate; Resources hides without real docs.

import { useRef, useState, type ReactNode } from 'react';
import { marked } from 'marked';
import { ShaderBackground } from './ShaderBackground';
import { ReelMedia, type ReelInfo } from './ReelMedia';
import { NumberTicker } from '@/components/ui/NumberTicker';

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
  identity: { swatches: string[]; fonts: string[]; layout: string | null; motion: string | null } | null;
  reel: ReelInfo | null;
  verification: { total: number; approves: number } | null;
  trace: { iter: number; title: string; request: string | null; change: string | null; verdict: string | null; reason: string | null }[];
  tests: { flowsPassing: number; flowsTotal: number; coveragePct: number; note: string };
  journal: { date: string; title: string; tags: string[]; status: string; superseded: boolean; curated: boolean }[];
  challenges: { problem: string; solved: string }[];
  risks: { name: string; category: string; severity: string; status: string }[];
  docs: { name: string; body: string }[];
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

// section label
function Eye({ children, tone }: { children: ReactNode; tone?: string }) {
  return <div className="eyebrow" style={tone ? { color: tone } : undefined}>{children}</div>;
}

// numbered section head — the structure spine (iter-13: "organise them better")
function SectionHead({ index, title, tone, sub }: { index: number; title: string; tone?: string; sub?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-4 flex-wrap">
        <span className="mono text-[length:var(--t-label)] font-bold" style={{ color: tone ?? CYAN }}>
          {String(index).padStart(2, '0')}
        </span>
        <h2 className="h2">{title}</h2>
      </div>
      {sub && <p className="mt-1.5 text-[length:var(--t-label)]" style={{ color: 'var(--mute)' }}>{sub}</p>}
    </div>
  );
}

const TABS = [
  { k: 'overview', label: 'Overview' },
  { k: 'engineering', label: 'Engineering' },
  { k: 'decisions', label: 'Decisions' },
  { k: 'resources', label: 'Resources' },
] as const;
type TabKey = (typeof TABS)[number]['k'];

export function ProjectShowcase({ data, archSlot }: { data: ShowcaseData; archSlot: ReactNode }) {
  const [tab, setTab] = useState<TabKey>('overview');
  const d = data;
  const contentRef = useRef<HTMLDivElement>(null);

  // adr-021: Resources is kept-but-conditional — it hides entirely when a
  // project has no real mirrored docs (never a hollow tab).
  const tabs = TABS.filter((t) => t.k !== 'resources' || d.docs.length > 0);

  // Stat cards (iter-16b): FEATURES / DECISIONS / ITERATIONS jump to their tab.
  function goTo(target: TabKey) {
    setTab(target);
    requestAnimationFrame(() =>
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }
  const NUM_TARGET: Record<string, TabKey> = { FEATURES: 'overview', DECISIONS: 'decisions', ITERATIONS: 'decisions' };

  return (
    <div className="sc">
      <ShaderBackground />
      <div className="sc-veil" aria-hidden />
      <div className="sc-scan" aria-hidden />
      <div className="sc-grain" aria-hidden />

      <div className="sc-wrap">
        {/* ── HERO ── */}
        <header className="pt-8 pb-10">
          <div className="grid items-center gap-8 lg:gap-12 lg:grid-cols-[1.08fr_.92fr]">
            <div>
              <div className="flex items-end gap-4 flex-wrap">
                <h1 className="display">{d.name}</h1>
                <span className="stagepill mb-2">{d.stageLabel}</span>
              </div>

              {/* "built with" tech chips removed for all projects (iter-16b owner) */}

              {/* intro no longer width-restricted (iter-16b: was max-w-[70ch]) */}
              <p className="mt-5 mb-7 leading-relaxed text-[length:var(--t-lead)]" style={{ color: 'var(--ink)', opacity: 0.85 }}>
                {d.hook}
              </p>

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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {d.numbers.map((num, i) => {
                  const target = NUM_TARGET[num.l];
                  const style = { '--nc': NUM_HUES[i % NUM_HUES.length] } as React.CSSProperties;
                  const body = (
                    <>
                      <div className="n"><NumberTicker value={num.n} /></div>
                      <div className="l">{num.l}{target && <span aria-hidden style={{ marginLeft: 6, opacity: 0.6 }}>↗</span>}</div>
                    </>
                  );
                  return target ? (
                    <button key={num.l} type="button" onClick={() => goTo(target)} className="numc cursor-pointer text-left" style={style} title={`Go to ${num.l.toLowerCase()}`}>
                      {body}
                    </button>
                  ) : (
                    <div key={num.l} className="numc" style={style}>{body}</div>
                  );
                })}
              </div>

              {/* Visual identity strip (adr-021): the project's own design
                  system as data — palette, type, layout, motion. First-
                  impression signal, so it lives in the hero, not Engineering. */}
              {d.identity && (
                <div className="card flat mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ padding: '14px 18px' }}>
                  <span className="mono text-[length:var(--t-cap)] tracking-[.14em] uppercase" style={{ color: 'var(--dim)' }}>identity</span>
                  {d.identity.swatches.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      {d.identity.swatches.map((hex) => (
                        <span key={hex} title={hex} className="w-5 h-5 rounded-md shrink-0" style={{ background: hex, border: '1px solid rgba(255,255,255,.18)' }} />
                      ))}
                    </span>
                  )}
                  {d.identity.fonts.length > 0 && (
                    <span className="mono text-[length:var(--t-cap)]" style={{ color: 'var(--mute)' }}>{d.identity.fonts.join(' · ')}</span>
                  )}
                  {d.identity.layout && (
                    <span className="text-[length:var(--t-cap)]" style={{ color: 'var(--ink)' }}>{d.identity.layout}</span>
                  )}
                  {d.identity.motion && (
                    <span className="mono text-[length:var(--t-cap)] rounded px-2 py-0.5" style={{ color: CYAN, border: '1px solid var(--line2)' }}>motion · {d.identity.motion}</span>
                  )}
                </div>
              )}
            </div>

            {/* reel — real media when uploaded (#165), animated placeholder otherwise */}
            <div className="reel">
              <ReelMedia slug={d.slug} reel={d.reel} />
              <div className="absolute inset-0 pointer-events-none p-4 flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: MAG }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: AMBER }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CYAN }} />
                  <span className="ml-auto mono text-[length:var(--t-cap)] tracking-[.14em] uppercase px-2 py-1 rounded-md" style={{ color: CYAN, border: '1px solid var(--line2)', background: 'rgba(5,6,15,.6)' }}>reel</span>
                </div>
                <div className="mt-auto">
                  <div className="font-display font-extrabold text-2xl text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,.8)' }}>{d.name}</div>
                  {!d.reel && <div className="mono text-[length:var(--t-cap)] mt-1 tracking-wide" style={{ color: 'var(--mute)' }}>media coming soon</div>}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── ACT TABS ── */}
        <div className="tabbar" role="tablist" aria-label="Project sections">
          {tabs.map((t, i) => (
            <button key={t.k} role="tab" aria-selected={tab === t.k} className="tab" onClick={() => setTab(t.k)}>
              <span className="idx">0{i + 1}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ── PANELS ── */}
        <div key={tab} ref={contentRef} className="panel pb-4 scroll-mt-24">
          {tab === 'overview' && <OverviewPanel d={d} />}
          {tab === 'engineering' && <EngineeringPanel d={d} archSlot={archSlot} />}
          {tab === 'decisions' && <DecisionsPanel d={d} />}
          {tab === 'resources' && <ResourcesPanel d={d} />}
        </div>

        <div className="mt-10 pb-14 text-center mono text-[length:var(--t-cap)]" style={{ color: 'var(--dim)' }}>
          tracked by ottomate · lock-in gates + independent verifier · docs generated, not handwritten
        </div>
      </div>
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-12 pt-6">{children}</div>;
}

// ── OVERVIEW ──
function OverviewPanel({ d }: { d: ShowcaseData }) {
  let idx = 0;
  return (
    <Section>
      {(d.problem || d.contextChips.length > 0) && (
        <section>
          <SectionHead index={++idx} title="Why this exists" tone={CORAL} />
          <div className="grid gap-3.5 md:grid-cols-[1.3fr_1fr]">
            {d.problem && (
              <div className="card flat">
                <Eye tone={CORAL}>The problem</Eye>
                <p className="text-[length:var(--t-body)] leading-relaxed" style={{ color: 'var(--ink)' }}>{d.problem}</p>
              </div>
            )}
            {d.contextChips.length > 0 && (
              <div className="card flat">
                <Eye tone={CYAN}>Context</Eye>
                <div className="flex flex-col gap-3">
                  {d.contextChips.map((c) => (
                    <div key={c.k} className="flex items-center justify-between gap-3">
                      <span className="mono text-[length:var(--t-cap)] tracking-wider" style={{ color: 'var(--dim)' }}>{c.k}</span>
                      <span className="text-[length:var(--t-body)]" style={{ color: 'var(--ink)' }}>{c.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {(d.success.length > 0 || d.nonGoals.length > 0) && (
        <section>
          <SectionHead index={++idx} title="What success means" tone={CYAN} />
          <div className="grid gap-3.5 md:grid-cols-2">
            {d.success.length > 0 && (
              <div className="card">
                <Eye tone={CYAN}>Success criteria</Eye>
                <ul className="flex flex-col gap-3">
                  {d.success.map((s, i) => (
                    <li key={i} className="flex gap-3 text-[length:var(--t-body)] leading-snug" style={{ color: 'var(--ink)' }}>
                      <span className="mono text-[length:var(--t-label)] mt-0.5" style={{ color: CYAN }}>✓</span>{s}
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
                    <span key={i} className="text-[length:var(--t-label)] rounded-lg px-3 py-1.5 line-through" style={{ color: 'var(--mute)', background: 'rgba(12,11,28,.5)', border: '1px solid var(--line)', textDecorationColor: 'var(--dim)' }}>{n}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {d.features.length > 0 && (
        <section>
          <div className="flex items-end justify-between flex-wrap gap-3">
            <SectionHead index={++idx} title="What it does" tone={MAG} />
            <div className="flex gap-4 mono text-[length:var(--t-label)] mb-5">
              <span style={{ color: CYAN }}>{d.featureCounts.done} done</span>
              <span style={{ color: AMBER }}>{d.featureCounts.wip} wip</span>
              <span style={{ color: DIM }}>{d.featureCounts.todo} todo</span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {d.features.map((f, i) => {
              const t = featTone(f.status);
              return (
                <div key={i} className="card" style={{ padding: '17px 18px' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.c, boxShadow: `0 0 10px ${t.c}` }} />
                    <span className="font-semibold text-[length:var(--t-body)]" style={{ color: 'var(--ink)' }}>{f.title}</span>
                    <span className="mono text-[length:var(--t-cap)] ml-auto shrink-0" style={{ color: t.c }}>{t.l}</span>
                  </div>
                  {f.why && <p className="text-[length:var(--t-label)] leading-snug" style={{ color: 'var(--mute)' }}>{f.why}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(d.primaryFlow || d.flows.length > 0) && (
        <section>
          <SectionHead index={++idx} title="How it's used" tone={CYAN} />
          <div className="card flat">
            {d.primaryFlow && d.primaryFlow.steps.length > 0 && (
              <>
                <div className="mono text-[length:var(--t-cap)] mb-3" style={{ color: 'var(--dim)' }}>critical path · {d.primaryFlow.name}</div>
                <div className="flex flex-wrap items-center gap-2.5 mb-5">
                  {d.primaryFlow.steps.map((s, i) => (
                    <span key={i} className="flex items-center gap-2.5">
                      <span className="text-[length:var(--t-label)] rounded-lg px-3.5 py-2" style={{ color: 'var(--ink)', background: 'rgba(12,11,28,.6)', border: '1px solid var(--line)' }}>{s}</span>
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
                  <div key={i} className="flex items-center gap-3.5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
                    <span className="mono text-[length:var(--t-body)] w-4 shrink-0" style={{ color: t.c }}>{t.m}</span>
                    <span className="flex-1 text-[length:var(--t-label)]" style={{ color: 'var(--ink)' }}>{f.title}</span>
                    <span className="mono text-[length:var(--t-cap)] tracking-wide" style={{ color: t.c }}>{f.testStatus}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {d.roadmap.length > 0 && (
        <section>
          <SectionHead index={++idx} title="What's next" tone={AMBER} />
          <div className="card flat">
            <ul className="flex flex-col gap-3">
              {d.roadmap.map((r, i) => (
                <li key={i} className="flex gap-3 text-[length:var(--t-body)]" style={{ color: 'var(--mute)' }}><span style={{ color: 'var(--dim)' }}>→</span>{r}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </Section>
  );
}

// ── ENGINEERING ──
function EngineeringPanel({ d, archSlot }: { d: ShowcaseData; archSlot: ReactNode }) {
  let idx = 0;
  return (
    <Section>
      {archSlot && (
        <section>
          <SectionHead index={++idx} title="Architecture" tone={VIO} />
          <div className="card flat">{archSlot}</div>
        </section>
      )}
      {d.stack.length > 0 && (
        <section>
          <SectionHead index={++idx} title="Tech stack" tone={CYAN} />
          <div className="card flat">
            <div className="flex flex-wrap gap-2.5">
              {d.stack.map((t, i) => (
                <span key={i} className="mono text-[length:var(--t-label)] rounded-lg px-3.5 py-2" style={{ color: 'var(--ink)', background: 'rgba(12,11,28,.6)', border: '1px solid var(--line)' }}>{t}</span>
              ))}
            </div>
          </div>
        </section>
      )}
      <section>
        <SectionHead index={++idx} title="Security & data" tone={CYAN} />
        <div className="grid gap-3.5 md:grid-cols-2 items-start">
          <div className="card">
            <Eye tone={CYAN}>Security</Eye>
            <ul className="flex flex-col gap-3">
              {d.security.map((s, i) => (
                <li key={i} className="flex gap-3 text-[length:var(--t-label)] leading-snug" style={{ color: 'var(--ink)' }}><span style={{ color: CYAN }}>◈</span>{s}</li>
              ))}
            </ul>
          </div>
          {d.dataModel && (
            <div className="card">
              <Eye tone={VIO}>Data model</Eye>
              <div className="flex flex-col gap-2.5 mono text-[length:var(--t-label)]" style={{ color: 'var(--ink)' }}>
                {d.dataModel.engine && <div>engine · {d.dataModel.engine}</div>}
                {d.dataModel.storage && <div>storage · {d.dataModel.storage}</div>}
                {d.dataModel.migration && <div>migrations · {d.dataModel.migration}</div>}
                {d.dataModel.sources.length > 0 && <div style={{ color: 'var(--mute)' }}>sources · {d.dataModel.sources.join(', ')}</div>}
              </div>
            </div>
          )}
        </div>
      </section>
      {d.services.length > 0 && (
        <section>
          <SectionHead index={++idx} title="Third-party services" tone={AMBER} />
          <div className="card flat">
            <div className="grid gap-2.5 md:grid-cols-2">
              {d.services.map((s, i) => (
                <div key={i} className="flex items-baseline gap-2 text-[length:var(--t-label)]">
                  <span className="font-medium" style={{ color: 'var(--ink)' }}>{s.name}</span>
                  {s.purpose && <span className="truncate" style={{ color: 'var(--mute)' }}>— {s.purpose}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* adr-021: tests + the independent-verifier aggregate live in
          Engineering now (moved out of the dissolved Development tab). */}
      <section>
        <SectionHead index={++idx} title="Tests & verification" tone={CYAN} sub="Honest ratios — every count is real; per-item verifier verdicts live under Decisions." />
        <div className="card flat">
          <p className="text-[length:var(--t-body)] leading-relaxed" style={{ color: 'var(--ink)' }}>{d.tests.note}</p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="numc" style={{ '--nc': CYAN } as React.CSSProperties}>
              <div className="n"><NumberTicker value={`${d.tests.coveragePct}%`} /></div>
              <div className="l">flow coverage</div>
            </div>
            <div className="numc" style={{ '--nc': VIO } as React.CSSProperties}>
              <div className="n">{d.tests.flowsPassing}/{d.tests.flowsTotal}</div>
              <div className="l">flows passing</div>
            </div>
            {d.verification && (
              <div className="numc" style={{ '--nc': CYAN } as React.CSSProperties}>
                <div className="n">{d.verification.approves}/{d.verification.total}</div>
                <div className="l">verifier · approve</div>
              </div>
            )}
          </div>
          {d.verification && (
            <p className="mt-3.5 text-[length:var(--t-label)] leading-snug" style={{ color: 'var(--mute)' }}>
              Every built change is checked by an independent verifier (separate from the coder) across code-reality, stub-detection, data-correctness and acceptance-criteria passes.
            </p>
          )}
        </div>
      </section>
    </Section>
  );
}

// ── DECISIONS (adr-021: journal + trace + risks, one home) ──
function DecisionsPanel({ d }: { d: ShowcaseData }) {
  let idx = 0;
  const curated = d.journal.filter((j) => j.curated);
  const rest = d.journal.filter((j) => !j.curated);
  // Curated-first, expandable to the full journal (falls back to showing all
  // when nothing is tagged curated — never an empty log).
  const [showAll, setShowAll] = useState(curated.length === 0);
  const visible = showAll ? d.journal : curated;
  return (
    <Section>
      {d.journal.length > 0 && (
        <section>
          <SectionHead index={++idx} title="Decision log" tone={MAG} sub="The calls that shaped the project — curated first, full journal on demand." />
          <div className="card flat">
            <div className="flex flex-col">
              {visible.map((j, i) => (
                <div key={i} className="grid grid-cols-[104px_1fr] gap-3.5 py-3 items-baseline" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <span className="mono text-[length:var(--t-cap)]" style={{ color: NUM_HUES[i % NUM_HUES.length] }}>{j.date}</span>
                  <div>
                    <span className="text-[length:var(--t-label)] font-medium" style={{ color: 'var(--ink)' }}>{j.title}</span>
                    {j.superseded && <span className="ml-2 mono text-[length:var(--t-cap)] uppercase" style={{ color: 'var(--dim)' }}>superseded</span>}
                    {j.tags.length > 0 && (
                      <span className="ml-2 inline-flex gap-1.5">
                        {j.tags.slice(0, 3).map((t) => (
                          <span key={t} className="mono text-[length:var(--t-cap)] rounded px-2 py-0.5" style={{ color: 'var(--mute)', border: '1px solid var(--line)' }}>{t}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {rest.length > 0 && curated.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mono text-[length:var(--t-cap)] mt-3 rounded-lg px-3 py-1.5 transition-colors hover:text-cyan-200"
                style={{ color: CYAN, border: '1px solid var(--line)' }}
              >
                {showAll ? '− curated only' : `+ full journal (${d.journal.length})`}
              </button>
            )}
          </div>
        </section>
      )}

      {d.trace.length > 0 && (
        <section>
          <SectionHead
            index={++idx}
            title="Decision → change → verified"
            tone={CYAN}
            sub="Recent built changes traced end-to-end: what was asked, what got locked in, what the independent verifier actually said. The only outcome claimed is the verified change."
          />
          <div className="flex flex-col gap-3">
            {d.trace.map((t, i) => (
              <details key={i} className="card flat group" style={{ padding: 0 }}>
                <summary className="flex items-center gap-3.5 cursor-pointer select-none list-none px-[18px] py-4">
                  <span className="mono text-[length:var(--t-cap)] shrink-0" style={{ color: 'var(--dim)' }}>iter {t.iter}</span>
                  <span className="flex-1 min-w-0 text-[length:var(--t-label)] font-medium" style={{ color: 'var(--ink)' }}>{t.title}</span>
                  <span className="mono text-[length:var(--t-cap)] rounded-full px-2.5 py-0.5 shrink-0" style={t.verdict === 'APPROVE'
                    ? { color: CYAN, border: '1px solid rgba(34,211,238,.4)', background: 'rgba(34,211,238,.08)' }
                    : { color: AMBER, border: '1px solid var(--line2)' }}>
                    {t.verdict === 'APPROVE' ? '✓ approve' : t.verdict?.toLowerCase()}
                  </span>
                  <span className="shrink-0 transition-transform group-open:rotate-90" style={{ color: 'var(--dim)' }}>▸</span>
                </summary>
                <div className="px-[18px] pb-4 flex flex-col gap-2.5" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                  {t.request && (
                    <div className="grid grid-cols-[86px_1fr] gap-3 text-[length:var(--t-label)]">
                      <span className="mono text-[length:var(--t-cap)] uppercase tracking-wide" style={{ color: 'var(--dim)' }}>request</span>
                      <span style={{ color: 'var(--mute)' }}>{t.request}</span>
                    </div>
                  )}
                  {t.change && (
                    <div className="grid grid-cols-[86px_1fr] gap-3 text-[length:var(--t-label)]">
                      <span className="mono text-[length:var(--t-cap)] uppercase tracking-wide" style={{ color: VIO }}>locked</span>
                      <span style={{ color: 'var(--ink)' }}>{t.change}</span>
                    </div>
                  )}
                  {t.reason && (
                    <div className="grid grid-cols-[86px_1fr] gap-3 text-[length:var(--t-label)]">
                      <span className="mono text-[length:var(--t-cap)] uppercase tracking-wide" style={{ color: CYAN }}>verified</span>
                      <span style={{ color: 'var(--mute)' }}>{t.reason}</span>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {(d.risks.length > 0 || d.challenges.length > 0) && (
        <section>
          <SectionHead index={++idx} title="Tradeoffs & risks" tone={AMBER} sub="Acknowledged, not hidden — open risks alongside what already got resolved." />
          <div className="flex flex-col gap-3.5">
            {d.risks.length > 0 && (
              <div className="card flat">
                <Eye tone={AMBER}>Open risks</Eye>
                <div className="flex flex-col">
                  {d.risks.map((r, i) => (
                    <div key={i} className="flex items-center gap-3.5 py-3" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sevTone(r.severity), boxShadow: `0 0 10px ${sevTone(r.severity)}` }} />
                      <span className="flex-1 text-[length:var(--t-label)]" style={{ color: 'var(--ink)' }}>{r.name}</span>
                      {r.category && <span className="mono text-[length:var(--t-cap)]" style={{ color: 'var(--dim)' }}>{r.category}</span>}
                      <span className="mono text-[length:var(--t-cap)] rounded px-2 py-0.5" style={{ color: sevTone(r.severity), border: '1px solid var(--line)' }}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {d.challenges.length > 0 && (
              <div className="card flat">
                <Eye tone={CORAL}>Challenges resolved</Eye>
                <div className="flex flex-col gap-4">
                  {d.challenges.map((c, i) => (
                    <div key={i} className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="mono text-[length:var(--t-cap)] tracking-wide mb-1" style={{ color: CORAL }}>RISK</div>
                        <div className="text-[length:var(--t-label)] leading-snug" style={{ color: 'var(--ink)' }}>{c.problem}</div>
                      </div>
                      <div>
                        <div className="mono text-[length:var(--t-cap)] tracking-wide mb-1" style={{ color: CYAN }}>RESOLVED</div>
                        <div className="text-[length:var(--t-label)] leading-snug" style={{ color: 'var(--mute)' }}>{c.solved}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </Section>
  );
}

// ── RESOURCES ──
function ResourcesPanel({ d }: { d: ShowcaseData }) {
  // iter-16b (owner: "are these placeholders?"): the docs are real mirrored
  // public_docs — clicking one now opens a slide-over markdown reader instead of
  // showing a dead ↗.
  const [openDoc, setOpenDoc] = useState<{ name: string; body: string } | null>(null);
  return (
    <Section>
      <div className="grid gap-3.5 md:grid-cols-2">
        <div className="card flat">
          <Eye tone={CYAN}>Documentation</Eye>
          {d.docs.length > 0 ? (
            <div className="flex flex-col">
              {d.docs.map((doc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setOpenDoc(doc)}
                  className="flex items-center justify-between py-3 text-left text-[length:var(--t-label)] transition-colors hover:text-cyan-200"
                  style={{ color: 'var(--ink)', borderTop: i ? '1px solid var(--line)' : 'none' }}
                >
                  {doc.name}<span style={{ color: CYAN }}>→</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[length:var(--t-label)]" style={{ color: 'var(--dim)' }}>No public docs mirrored yet.</p>
          )}
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="card flat">
            <Eye tone={AMBER}>Downloads</Eye>
            <div className="flex flex-wrap gap-2.5">
              {d.downloads.map((dl, i) => (
                <a key={i} href={dl.href} target="_blank" rel="noopener" className="mono text-[length:var(--t-label)] rounded-lg px-3.5 py-2 transition-colors" style={{ color: 'var(--ink)', background: 'rgba(12,11,28,.6)', border: '1px solid var(--line)' }}>↓ {dl.label}</a>
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

      {/* Doc reader slide-over */}
      {openDoc && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setOpenDoc(null)}
        >
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l p-8 md:p-10"
            style={{ background: '#0b0b12', borderColor: 'var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <h3 className="h2" style={{ fontSize: 'var(--t-title)' }}>{openDoc.name}</h3>
              <button
                type="button"
                onClick={() => setOpenDoc(null)}
                aria-label="Close"
                className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>
            <div
              className="doc-prose text-[length:var(--t-body)] leading-relaxed"
              style={{ color: 'var(--ink)' }}
              dangerouslySetInnerHTML={{ __html: marked.parse(openDoc.body.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n/, ''), { async: false }) as string }}
            />
          </div>
        </div>
      )}
    </Section>
  );
}
