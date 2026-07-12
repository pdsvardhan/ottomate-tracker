'use client';

// VAULT7A "machine behind it all" card — iter-65 #504 rebuild (3rd redesign of
// this slot; owner approved exactly ONE row of the researched proposal: "HOW A
// REQUEST GETS IN"). The card is now purely the ingress flow — You → Cloudflare
// → Tunnel → Reverse proxy → the public/private fork — with the security facts
// woven into the node captions instead of a spec footer (owner: "below that
// hate everything" — neighborhoods grid + spec strip dropped).
//
// Motion: a glow cascade walks the request path hop by hop (pure CSS delays);
// prefers-reduced-motion gets a static card.
// iter-65 rework (owner comments 2026-07-13): hops no longer stretch to the
// fork's height ("way too tall" — align-items:center, content-sized boxes);
// fork tags get a fixed width so both branch boxes align; hop names wrap
// instead of truncating ("straight to the proj…"); and the honest spec strip
// is BACK as a one-line footer ("show server stats na?") with ticking uptime.

import { useEffect, useState } from 'react';

export interface ServerStats {
  host: string;
  os: string;
  cpuModel: string;
  cores: number;
  load1: number;
  memTotalGB: number;
  memUsedGB: number;
  storageTotalTB: number;
  storageUsedTB: number;
  uptimeSeconds: number;
  containers: number;
  networks: number;
  snapshotMs: number;
}

const HOPS = [
  { name: 'You', caption: 'anywhere on the internet', hue: 'var(--ink)', icon: '◉', edge: null },
  { name: 'Cloudflare edge', caption: 'DNS · CDN · home IP hidden', hue: 'var(--amber)', icon: '◈', edge: 'https' },
  { name: 'Tunnel', caption: 'dials OUT from the box · 0 open ports', hue: 'var(--vio)', icon: '⇄', edge: 'tunnel' },
  { name: 'Reverse proxy', caption: '*.vault7a.xyz → the right container', hue: 'var(--cyan)', icon: '⌥', edge: 'host' },
] as const;

export function ServerStatsCard({ stats }: { stats: ServerStats }) {
  // Live-ticking uptime from the server snapshot (restored with the spec strip).
  const [now, setNow] = useState(stats.snapshotMs);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const upSec = stats.uptimeSeconds + Math.max(0, Math.floor((now - stats.snapshotMs) / 1000));
  const upD = Math.floor(upSec / 86400);
  const upH = Math.floor((upSec % 86400) / 3600);
  const upM = Math.floor((upSec % 3600) / 60);

  const spec = [
    `${stats.cpuModel} · ${stats.cores}C`,
    `${stats.memUsedGB.toFixed(0)}/${stats.memTotalGB.toFixed(0)} GB RAM`,
    `${stats.storageUsedTB.toFixed(1)}/${stats.storageTotalTB.toFixed(0)} TB`,
    `up ${upD}d ${String(upH).padStart(2, '0')}h ${String(upM).padStart(2, '0')}m`,
  ];

  return (
    <div className="card flat" style={{ overflow: 'hidden' }}>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="eyebrow" style={{ color: 'var(--cyan)', margin: 0 }}>The machine behind it all</div>
        <span className="inline-flex items-center gap-2 mono text-[length:var(--t-cap)]" style={{ color: 'var(--mute)' }}>
          <span className="ss-led" /> {stats.containers} services online
        </span>
      </div>
      <p className="mono text-[length:var(--t-cap)] tracking-[.14em] uppercase mb-4" style={{ color: 'var(--dim)' }}>
        How a request gets in
      </p>

      <div className="ss-flow">
        {HOPS.map((h, i) => (
          <div key={h.name} className="ss-flow-item">
            {h.edge && (
              <span className="ss-arrow mono" aria-hidden>
                <b>→</b>
                <i>{h.edge}</i>
              </span>
            )}
            <div className="ss-hop" style={{ ['--hop' as string]: h.hue, ['--d' as string]: `${i * 0.75}s` }}>
              <div className="ss-hop-top">
                <span className="ss-hop-ic" aria-hidden>{h.icon}</span>
                <span className="ss-hop-name">{h.name}</span>
              </div>
              <div className="ss-hop-cap mono">{h.caption}</div>
            </div>
          </div>
        ))}

        <span className="ss-arrow mono" aria-hidden><b>→</b></span>

        {/* the fork: public sails through, private stops at the SSO gate */}
        <div className="ss-fork">
          <div className="ss-branch">
            <span className="ss-tag" style={{ ['--hop' as string]: 'var(--done, #34d399)' }}>public</span>
            <div className="ss-hop" style={{ ['--hop' as string]: 'var(--done, #34d399)', ['--d' as string]: '3s' }}>
              <div className="ss-hop-top"><span className="ss-hop-name">Straight to the project</span></div>
              <div className="ss-hop-cap mono">stateofus · mapsofbharat · portfolio …</div>
            </div>
          </div>
          <div className="ss-branch">
            <span className="ss-tag" style={{ ['--hop' as string]: 'var(--mag)' }}>private</span>
            <div className="ss-hop" style={{ ['--hop' as string]: 'var(--mag)', ['--d' as string]: '3s' }}>
              <div className="ss-hop-top"><span className="ss-hop-name">Authentik login first</span></div>
              <div className="ss-hop-cap mono">SSO gate · then media · photos · tools</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── honest spec strip (restored per owner: "show server stats na?") ── */}
      <div className="ss-spec">
        <span className="ss-spec-host font-display">VAULT7A</span>
        <span className="mono text-[length:var(--t-cap)]" style={{ color: 'var(--dim)' }}>{stats.os}</span>
        {spec.map((s) => (
          <span key={s} className="ss-spec-chip mono">{s}</span>
        ))}
        <span className="ss-spec-chip mono" style={{ color: 'var(--cyan)', borderColor: 'color-mix(in srgb, var(--cyan) 35%, transparent)' }}>$0/mo cloud</span>
      </div>

      <style jsx>{`
        .ss-led {
          width: 8px; height: 8px; border-radius: 999px;
          background: #34d399; box-shadow: 0 0 8px #34d399;
          animation: ssPulse 2s ease-in-out infinite;
        }
        @keyframes ssPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

        /* align-items:center — hops size to their content instead of
           stretching to the fork column ("way too tall" on wide monitors) */
        .ss-flow { display: flex; align-items: center; gap: 8px; }
        .ss-flow-item { display: contents; }
        .ss-hop {
          flex: 1 1 0; min-width: 0;
          border: 1px solid color-mix(in srgb, var(--hop) 32%, transparent);
          border-radius: 11px;
          background: linear-gradient(180deg, rgba(18,16,38,.75), rgba(10,9,22,.75));
          padding: 10px 12px;
          animation: ssHop 4.5s ease-in-out infinite;
          animation-delay: var(--d, 0s);
        }
        @keyframes ssHop {
          0%, 24%, 100% { border-color: color-mix(in srgb, var(--hop) 32%, transparent); box-shadow: none; }
          10% { border-color: color-mix(in srgb, var(--hop) 85%, transparent); box-shadow: 0 0 18px -4px var(--hop); }
        }
        .ss-hop-top { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
        .ss-hop-ic { color: var(--hop); flex: 0 0 auto; }
        /* names wrap — ellipsis cut "straight to the proj…" (owner) */
        .ss-hop-name { font-weight: 650; font-size: var(--t-label); color: var(--ink); line-height: 1.3; }
        .ss-hop-cap { font-size: var(--t-cap); color: var(--dim); margin-top: 3px; }
        .ss-arrow { align-self: center; flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 0; color: var(--dim); }
        .ss-arrow b { font-weight: 400; font-size: 15px; line-height: 1; }
        .ss-arrow i { font-style: normal; font-size: 9.5px; letter-spacing: .06em; }

        .ss-fork { display: flex; flex-direction: column; gap: 8px; flex: 1.55 1 0; min-width: 0; }
        .ss-branch { display: flex; align-items: center; gap: 8px; }
        .ss-branch .ss-hop { flex: 1; }
        /* fixed tag width — 'public' vs 'private' widths were skewing the two
           branch boxes out of alignment (owner) */
        .ss-tag {
          flex: 0 0 62px; text-align: center; box-sizing: border-box;
          font-family: var(--scmono); font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase;
          color: var(--hop); border: 1px solid color-mix(in srgb, var(--hop) 40%, transparent);
          border-radius: 999px; padding: 2px 0; white-space: nowrap;
        }

        .ss-spec {
          display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
          margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line);
        }
        .ss-spec-host { font-size: 13px; font-weight: 800; letter-spacing: .07em; color: var(--ink); }
        .ss-spec-chip {
          font-size: var(--t-cap); color: var(--mute);
          border: 1px solid var(--line); border-radius: 8px; padding: 2.5px 9px;
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 1023px) {
          .ss-flow { flex-direction: column; align-items: stretch; }
          .ss-arrow { flex-direction: row; align-self: flex-start; margin-left: 16px; gap: 6px; }
          .ss-arrow b { transform: rotate(90deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ss-led, .ss-hop { animation: none; }
        }
      `}</style>
    </div>
  );
}
