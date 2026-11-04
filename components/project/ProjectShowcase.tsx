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

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ShaderBackground } from './ShaderBackground';
import { ReelMedia, type ReelInfo } from './ReelMedia';
import { NumberTicker } from '@/components/ui/NumberTicker';
import type { LinkState, OpenRiskCard, ResolvedRiskCard, ShipStory } from '@/lib/showcase';

export interface ShowcaseData {
  slug: string; name: string; accent: string; tagline: string; hook: string; tags: string[];
  stageLabel: string; status: string;
  // iter-208 #1510/#1511: resolved on the server — a link only where an outsider can open it.
  live: LinkState; repo: LinkState; port: number | null;
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
  // iter-208 #1516: the featured change (a sent-back one when any qualifies), how many more of
  // this project's changes went through the loop, and the verifier's live send-back rate.
  ship: ShipStory | null;
  shipMore: number;
  sendBack: { sent: number; of: number; label: string; pct: string } | null;
  tests: { flowsPassing: number; flowsTotal: number; coveragePct: number; note: string };
  journal: { date: string; title: string; tags: string[]; status: string; superseded: boolean; curated: boolean }[];
  // iter-208 AC937: `solved` (the free-text resolution) is null in the visitor view.
  challenges: ResolvedRiskCard[];
  risks: OpenRiskCard[];
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

// iter-65 #509 (owner: 'delete this tab'): Resources dropped from the IA —
// mirrored docs live in each repo; the showcase carries Overview / Engineering /
// Decisions only.
const TABS = [
  { k: 'overview', label: 'Overview' },
  { k: 'engineering', label: 'Engineering' },
  { k: 'decisions', label: 'Decisions' },
] as const;
type TabKey = (typeof TABS)[number]['k'];

export function ProjectShowcase({ data, archSlot }: { data: ShowcaseData; archSlot: ReactNode }) {
  const [tab, setTab] = useState<TabKey>('overview');
  const d = data;
  const contentRef = useRef<HTMLDivElement>(null);

  const tabs = TABS;

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

              {/* iter-15 Fix B: hero hook paragraph removed — the name, stage
                  pill, live/repo link cards, stat tiles and identity strip carry
                  the hero now. (Reverses iter-13's "wider hook"; owner-confirmed.)
                  The hook text still lives on ShowcaseData for the Overview. */}

              {/* iter-208 #1510/#1511: link cards only where an outsider can open them; a
                  login-walled app / private repo gets a muted label card with no link. */}
              <div className="flex flex-wrap gap-3.5 mb-8 mt-6">
                {d.live?.kind === 'link' && (
                  <a href={d.live.href} target="_blank" rel="noopener" className="lc flex-1 min-w-[220px]">
                    <div className="k">live at ↗</div>
                    <div className="v">{d.live.text}</div>
                  </a>
                )}
                {d.live?.kind === 'private' && (
                  <div className="lc static flex-1 min-w-[220px]" title="The app is behind a sign-in">
                    <div className="k">live</div>
                    <div className="v">private app</div>
                  </div>
                )}
                {d.repo?.kind === 'link' && (
                  <a href={d.repo.href} target="_blank" rel="noopener" className="lc repo flex-1 min-w-[220px]">
                    <div className="k">repo ↗</div>
                    <div className="v">{d.repo.text}</div>
                  </a>
                )}
                {d.repo?.kind === 'private' && (
                  <div className="lc repo static flex-1 min-w-[220px]" title="The source repository is private">
                    <div className="k">repo</div>
                    <div className="v">private repo</div>
                  </div>
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

              {/* Design-system-at-a-glance (adr-021 identity, iter-16 redesign:
                  owner wanted it to actually read as something). A titled mini
                  panel with labelled facets — palette / type / layout / motion —
                  so a visitor understands it's the project's own design system. */}
              {d.identity && (
                <div className="card flat mt-3.5" style={{ padding: '15px 18px' }}>
                  <div className="mono text-[length:var(--t-cap)] tracking-[.16em] uppercase mb-3" style={{ color: 'var(--dim)' }}>Design system</div>
                  <div className="flex flex-wrap gap-x-9 gap-y-3.5">
                    {d.identity.swatches.length > 0 && (
                      <div>
                        <div className="mono text-[length:var(--t-cap)] mb-1.5" style={{ color: 'var(--dim)' }}>palette</div>
                        <div className="flex items-center gap-1.5">
                          {d.identity.swatches.map((hex) => (
                            <span key={hex} title={hex} className="w-5 h-5 rounded-md shrink-0" style={{ background: hex, border: '1px solid rgba(255,255,255,.18)' }} />
                          ))}
                        </div>
                      </div>
                    )}
                    {d.identity.fonts.length > 0 && (
                      <div>
                        {/* iter-65 #519 (owner: "whats type?"): relabelled */}
                        <div className="mono text-[length:var(--t-cap)] mb-1.5" style={{ color: 'var(--dim)' }}>typography</div>
                        <div className="text-[length:var(--t-label)]" style={{ color: 'var(--ink)' }}>{d.identity.fonts.join(' · ')}</div>
                      </div>
                    )}
                    {d.identity.layout && (
                      <div>
                        <div className="mono text-[length:var(--t-cap)] mb-1.5" style={{ color: 'var(--dim)' }}>layout</div>
                        <div className="text-[length:var(--t-label)]" style={{ color: 'var(--ink)' }}>{d.identity.layout}</div>
                      </div>
                    )}
                    {d.identity.motion && (
                      <div>
                        <div className="mono text-[length:var(--t-cap)] mb-1.5" style={{ color: 'var(--dim)' }}>motion</div>
                        <div className="text-[length:var(--t-label)]" style={{ color: CYAN }}>{d.identity.motion}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* reel — real media when uploaded (#165), animated placeholder otherwise.
                iter-16 (owner): dropped the traffic-light dots + 'reel' badge chrome;
                only a subtle name label remains (and only over the placeholder, so a
                real screenshot isn't covered). */}
            <div className="reel">
              <ReelMedia slug={d.slug} reel={d.reel} />
              {!d.reel && (
                <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-end">
                  <div className="font-display font-extrabold text-2xl text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,.8)' }}>{d.name}</div>
                  <div className="mono text-[length:var(--t-cap)] mt-1 tracking-wide" style={{ color: 'var(--mute)' }}>media coming soon</div>
                </div>
              )}
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

// ── OVERVIEW ── (iter-15 "split spine", winner 7c)
// Sticky section rail (scrollspy nav + context key-values + done/wip/todo
// counts) beside typographic sections with ghost numerals and hairline
// dividers. Context moved out of the body INTO the rail; the hero hook (removed
// from the hero, Fix B) now leads the "Why this exists" section so no content
// is lost. Same ShowcaseData — no data change, presentation only.
function OverviewPanel({ d }: { d: ShowcaseData }) {
  const secs: { id: string; title: string; tone: string; body: ReactNode }[] = [];

  if (d.hook || d.problem) {
    secs.push({
      id: 'why', title: 'Why this exists', tone: CORAL,
      body: (
        <>
          {d.hook && <p className="text-[length:var(--t-lead)] leading-relaxed mb-3" style={{ color: 'var(--ink)' }}>{d.hook}</p>}
          {d.problem && <p className="text-[length:var(--t-body)] leading-relaxed" style={{ color: 'var(--mute)' }}>{d.problem}</p>}
        </>
      ),
    });
  }

  if (d.success.length > 0 || d.nonGoals.length > 0) {
    secs.push({
      id: 'success', title: 'What success means', tone: CYAN,
      body: (
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          {d.success.length > 0 && (
            <div>
              <Eye tone={CYAN}>Success criteria</Eye>
              <ul className="flex flex-col gap-2.5">
                {d.success.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[length:var(--t-body)] leading-snug" style={{ color: 'var(--ink)' }}>
                    <span className="mono text-[length:var(--t-label)] mt-0.5" style={{ color: CYAN }}>✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {d.nonGoals.length > 0 && (
            <div>
              <Eye tone={VIO}>Never building</Eye>
              <div className="flex flex-col gap-2">
                {d.nonGoals.map((n, i) => (
                  <span key={i} className="text-[length:var(--t-body)] leading-snug line-through" style={{ color: 'var(--mute)', textDecorationColor: 'var(--dim)' }}>{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    });
  }

  if (d.features.length > 0) {
    secs.push({
      id: 'does', title: 'What it does', tone: MAG,
      body: (
        <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
          {d.features.map((f, i) => {
            const t = featTone(f.status);
            return (
              <div key={i} className="flex items-start gap-3 py-2" style={{ borderTop: i > 1 ? '1px solid var(--line)' : undefined }}>
                <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: t.c, boxShadow: `0 0 8px ${t.c}` }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-[length:var(--t-body)]" style={{ color: 'var(--ink)' }}>{f.title}</span>
                    <span className="mono text-[length:var(--t-cap)]" style={{ color: t.c }}>{t.l}</span>
                  </div>
                  {f.why && <p className="text-[length:var(--t-label)] leading-snug mt-0.5" style={{ color: 'var(--mute)' }}>{f.why}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ),
    });
  }

  // iter-65 #516 (owner: "did you mix two things together?" — yes: the usage
  // narrative and the flow-test inventory shared one section). Overview now
  // tells only the usage story; the per-flow test states moved to Engineering's
  // Tests & verification section where they belong.
  if (d.primaryFlow && d.primaryFlow.steps.length > 0) {
    secs.push({
      id: 'used', title: "How it's used", tone: CYAN,
      body: (
        <>
          <p className="text-[length:var(--t-label)] mb-4" style={{ color: 'var(--mute)' }}>
            The core loop — <span style={{ color: 'var(--ink)' }}>{d.primaryFlow.name}</span> — step by step:
          </p>
          <ol className="ov-steps">
            {d.primaryFlow.steps.map((s, i) => (
              <li key={i} className="ov-step">
                <span className="ov-step-n">{i + 1}</span>
                <span className="ov-step-t">{s}</span>
              </li>
            ))}
          </ol>
        </>
      ),
    });
  }

  if (d.roadmap.length > 0) {
    secs.push({
      id: 'next', title: "What's next", tone: AMBER,
      body: (
        <div className="ov-next">
          {d.roadmap.map((r, i) => (
            <div key={i} className="ov-next-card">
              <span className="ov-next-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="ov-next-t">{r}</span>
            </div>
          ))}
        </div>
      ),
    });
  }

  const [active, setActive] = useState(secs[0]?.id ?? '');
  useEffect(() => {
    const els = secs.map((s) => document.getElementById(`ov-${s.id}`)).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id.slice(3));
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secs.length]);

  if (secs.length === 0) return null;

  return (
    <div className="ov-grid pt-6">
      <aside className="ov-rail">
        <div className="ov-rail-h">On this tab</div>
        <nav className="ov-nav">
          {secs.map((s, i) => (
            <a
              key={s.id}
              href={`#ov-${s.id}`}
              data-active={active === s.id ? 'true' : 'false'}
              style={{ '--nc': s.tone } as React.CSSProperties}
              onClick={() => setActive(s.id)}
            >
              <span className="oi">{String(i + 1).padStart(2, '0')}</span>{s.title}
            </a>
          ))}
        </nav>

        {/* iter-16 (owner marked both 'delete'): the Context key-values and the
            done/wip/todo counts were removed from the rail; it now carries only
            the section nav. */}
      </aside>

      <div className="ov-body">
        {secs.map((s, i) => (
          <section key={s.id} id={`ov-${s.id}`} className="ov-sec">
            <span className="ov-ghost" style={{ color: s.tone }}>{String(i + 1).padStart(2, '0')}</span>
            <h2 className="ov-h" style={{ color: s.tone }}>{s.title}</h2>
            {s.body}
          </section>
        ))}
      </div>
    </div>
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
      {/* iter-65 #518 (owner: "is this necessary at all?" → trim): the full
          Security & data section collapsed to a two-line fact row — auth model
          and where the data lives, nothing more. */}
      <section>
        <SectionHead index={++idx} title="Security & data" tone={CYAN} />
        <div className="card flat mono text-[length:var(--t-label)] flex flex-col gap-2" style={{ color: 'var(--ink)' }}>
          <div><span style={{ color: CYAN }}>◈ </span>{d.security.slice(0, 2).join(' · ')}</div>
          {d.dataModel && (
            <div style={{ color: 'var(--mute)' }}>
              <span style={{ color: VIO }}>◈ </span>
              {[d.dataModel.engine, d.dataModel.storage].filter(Boolean).join(' · ') || 'data model unrecorded'}
            </div>
          )}
        </div>
      </section>
      {d.services.length > 0 && (
        <section>
          <SectionHead index={++idx} title="Third-party services" tone={AMBER} />
          {/* iter-16 (owner: 'show these better'): each service is its own card
              with the full purpose (no more truncated one-liners). */}
          <div className="svc-grid">
            {d.services.map((s, i) => (
              <div key={i} className="svc-card">
                <div className="svc-name">{s.name}</div>
                {s.purpose && <div className="svc-purpose">{s.purpose}</div>}
              </div>
            ))}
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
          {/* iter-65 #516: per-flow test states moved here from the Overview's
              "How it's used" section — they're engineering evidence, not usage. */}
          {d.flows.length > 0 && (
            <div className="mt-5 grid md:grid-cols-2 gap-x-8">
              {d.flows.slice(0, 10).map((f, i) => {
                const t = flowTone(f.testStatus);
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderTop: '1px solid var(--line)' }}>
                    <span className="mono text-[length:var(--t-body)] w-4 shrink-0" style={{ color: t.c }}>{t.m}</span>
                    <span className="flex-1 text-[length:var(--t-label)]" style={{ color: 'var(--ink)' }}>{f.title}</span>
                    <span className="mono text-[length:var(--t-cap)] tracking-wide" style={{ color: t.c }}>{f.testStatus}</span>
                  </div>
                );
              })}
            </div>
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

      {/* iter-65 #520 (owner ×2: "whats the point of this section?"): the
          abstract trace list is gone. One REAL example now tells the whole
          story — what was asked, what got locked at the gate, what the
          independent verifier ruled — because that loop is this system's
          entire reason to exist. */}
      {/* iter-208 #1516 (adr-025, owner override of the 2026-06-10 "verifier output is a build
          rail" rule): the featured change is one the verifier SENT BACK, then approved once it
          was fixed — never from a financial project — plus the verifier's live send-back rate
          in the stat-tile look. Falls back to today's APPROVE example when none qualifies. */}
      {(d.ship || d.sendBack) && (
        <section>
          <SectionHead index={++idx} title="How a change actually ships" tone={CYAN} sub={shipSub(d.ship)} />
          <div className="card flat">
            {d.ship && <ShipStoryView story={d.ship} />}
            {d.ship && d.shipMore > 0 && (
              <p className="mt-4 text-[length:var(--t-cap)]" style={{ color: 'var(--dim)' }}>
                + {d.shipMore} more change{d.shipMore > 1 ? 's' : ''} from this project shipped through the same gate-and-verify loop.
              </p>
            )}
            {d.sendBack && (
              <>
                <div className={`${d.ship ? 'mt-5 ' : ''}grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3`}>
                  <div className="numc" style={{ '--nc': AMBER } as React.CSSProperties}>
                    <div className="n"><NumberTicker value={d.sendBack.pct} /></div>
                    <div className="l">{d.sendBack.label}</div>
                  </div>
                </div>
                <p className="mt-3 text-[length:var(--t-label)] leading-snug" style={{ color: 'var(--mute)' }}>
                  Live from the independent verifier&apos;s reports across every project: a change it sends back is fixed and re-checked before it ships.
                </p>
              </>
            )}
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
                  {d.challenges.map((c, i) => c.solved ? (
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
                  ) : (
                    // iter-208 AC937: visitor view — title, category and status only; the free-text
                    // resolution is never read for visitors (page.tsx), so there is nothing to show.
                    <div key={i} className="flex items-center gap-3.5" style={{ borderTop: i ? '1px solid var(--line)' : 'none', paddingTop: i ? 12 : 0 }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CYAN, boxShadow: `0 0 10px ${CYAN}` }} />
                      <span className="flex-1 text-[length:var(--t-label)]" style={{ color: 'var(--ink)' }}>{c.problem}</span>
                      {c.category && <span className="mono text-[length:var(--t-cap)]" style={{ color: 'var(--mute)' }}>{c.category}</span>}
                      <span className="mono text-[length:var(--t-cap)] rounded px-2 py-0.5" style={{ color: CYAN, border: '1px solid var(--line)' }}>{c.status}</span>
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

// ── iter-208 #1516: the featured change, told as ask → gate → (sent back) → approved ──
function shipSub(story: ShipStory | null): string {
  const lead = "No claim survives here without a verifier's verdict.";
  if (!story) return lead;
  if (story.kind === 'sent-back') {
    return story.crossProject
      ? `${lead} One real change it sent back — from ${story.projectName}, built through the same pipeline — traced from the ask to the approval:`
      : `${lead} One real change from this project that it sent back, traced from the ask to the approval:`;
  }
  return `${lead} One real change from this project, traced end-to-end:`;
}

function ShipStoryView({ story }: { story: ShipStory }) {
  const finalKey = story.sentBack
    ? `4 · fixed, then approved${story.rounds > 2 ? ` (round ${story.rounds})` : ''}`
    : '3 · verifier ruled';
  const verdict = story.verdict;
  return (
    <>
      <div className="mono text-[length:var(--t-cap)] mb-4" style={{ color: 'var(--dim)' }}>
        {story.crossProject ? `${story.projectName} · ` : ''}iteration {story.iter} · {story.title}
      </div>
      <div className="trace-story">
        <div className="trace-step" style={{ ['--tc' as string]: CORAL }}>
          <div className="trace-k mono">1 · the ask</div>
          <p className="trace-t">{story.request ?? story.title}</p>
        </div>
        <span className="trace-arrow" aria-hidden>→</span>
        <div className="trace-step" style={{ ['--tc' as string]: VIO }}>
          <div className="trace-k mono">2 · locked at the gate</div>
          <p className="trace-t">{story.change ?? 'Change locked before any code was written.'}</p>
        </div>
        <span className="trace-arrow" aria-hidden>→</span>
        {story.sentBack && (
          <>
            <div className="trace-step" style={{ ['--tc' as string]: AMBER }}>
              <div className="trace-k mono">3 · verifier sent it back</div>
              <p className="trace-t">
                <span className="mono font-bold" style={{ color: story.sentBack.verdict === 'BLOCK' ? MAG : AMBER }}>
                  ✕ {story.sentBack.verdict}
                </span>
                {story.sentBack.reason && <> — {story.sentBack.reason}</>}
              </p>
            </div>
            <span className="trace-arrow" aria-hidden>→</span>
          </>
        )}
        <div className="trace-step" style={{ ['--tc' as string]: CYAN }}>
          <div className="trace-k mono">{finalKey}</div>
          <p className="trace-t">
            <span className="mono font-bold" style={{ color: verdict === 'APPROVE' ? CYAN : AMBER }}>
              {verdict === 'APPROVE' ? '✓ APPROVE' : verdict}
            </span>
            {story.reason && <> — {story.reason}</>}
          </p>
        </div>
      </div>
    </>
  );
}

// ResourcesPanel removed iter-65 #509 (owner: 'delete this tab') — mirrored
// public_docs remain in each project repo; the YAML-mirror download endpoint
// (/api/projects/<slug>/yaml-mirror) is still served for direct links.
