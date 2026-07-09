'use client';

// VAULT7A "machine behind it all" card. iter-16 redesign (owner rejected the
// iter-15 rack-blades card; wanted this area to actually explain how the
// services are set up and how access takes place). Owner picked "access flow":
// the card now walks a request from a visitor to the running project, each hop
// labelled in plain words, with the honest host spec demoted to a footer.
//
// Data is unchanged and still honest: the footer's load/mem/storage/uptime are
// real /proc readings snapshotted server-side (page is force-dynamic); uptime
// ticks client-side from the snapshot. Container/network COUNTS the container
// can't see, so they stay plainly labelled. The ServerStats contract and the
// home page's readServerStats() are untouched.

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
  uptimeSeconds: number;   // snapshot at request time
  containers: number;      // static fact
  networks: number;        // static fact
  snapshotMs: number;      // Date.now() at render, for client uptime tick
}

const HOPS = [
  { name: 'Visitor', caption: 'opens a project link', hue: 'var(--ink)' },
  { name: 'Cloudflare', caption: 'DNS · CDN · hides home IP', hue: 'var(--amber)' },
  { name: 'Tunnel', caption: 'outbound-only · 0 open ports', hue: 'var(--vio)' },
  { name: 'Authentik', caption: 'login for private apps', hue: 'var(--mag)' },
  { name: 'The project', caption: 'Docker container on VAULT7A', hue: 'var(--cyan)', last: true },
] as const;

export function ServerStatsCard({ stats }: { stats: ServerStats }) {
  // Live-ticking uptime from the server snapshot.
  const [now, setNow] = useState(stats.snapshotMs);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const upSec = stats.uptimeSeconds + Math.max(0, Math.floor((now - stats.snapshotMs) / 1000));
  const upD = Math.floor(upSec / 86400);
  const upH = Math.floor((upSec % 86400) / 3600);

  const spec = [
    `${stats.cpuModel} · ${stats.cores}C`,
    `${stats.memUsedGB.toFixed(0)}/${stats.memTotalGB.toFixed(0)} GB`,
    `${stats.storageUsedTB.toFixed(1)}/${stats.storageTotalTB.toFixed(0)} TB`,
    `up ${upD}d ${String(upH).padStart(2, '0')}h`,
    `${stats.containers} containers · ${stats.networks} networks`,
  ];

  return (
    <div className="card flat" style={{ overflow: 'hidden' }}>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="eyebrow" style={{ color: 'var(--cyan)', margin: 0 }}>The machine behind it all</div>
        <span className="inline-flex items-center gap-2 mono text-[length:var(--t-cap)]" style={{ color: 'var(--mute)' }}>
          <span className="ss-led" /> online
        </span>
      </div>
      <p className="text-[length:var(--t-label)] leading-relaxed mb-5" style={{ color: 'var(--ink)', opacity: 0.82 }}>
        Every project on this site runs on one self-hosted box. Here&apos;s how a request actually reaches one:
      </p>

      {/* ── access flow ── */}
      <div className="ss-flow">
        {HOPS.map((h, i) => (
          <div key={h.name} className="ss-flow-item">
            <div className="ss-hop" data-last={'last' in h && h.last ? 'true' : 'false'} style={{ ['--hop' as string]: h.hue }}>
              <div className="ss-hop-top">
                <span className="ss-hop-n mono">{i + 1}</span>
                <span className="ss-hop-name">{h.name}</span>
              </div>
              <div className="ss-hop-cap mono">{h.caption}</div>
            </div>
            {i < HOPS.length - 1 && <span className="ss-arrow" aria-hidden>→</span>}
          </div>
        ))}
      </div>

      <p className="text-[length:var(--t-cap)] leading-relaxed mt-3.5" style={{ color: 'var(--mute)' }}>
        Public projects load straight through; private ones sit behind the Authentik login. No ports are ever
        opened on the box, and there&apos;s <span style={{ color: 'var(--cyan)' }}>$0/mo</span> of cloud bill.
      </p>

      {/* ── honest host spec footer ── */}
      <div className="ss-spec">
        <span className="ss-spec-host font-display">VAULT7A</span>
        <span className="mono text-[length:var(--t-cap)]" style={{ color: 'var(--dim)' }}>{stats.os}</span>
        {spec.map((s) => (
          <span key={s} className="ss-spec-chip mono">{s}</span>
        ))}
        <span className="ss-spec-chip mono" style={{ color: 'var(--done)', borderColor: 'color-mix(in srgb, var(--done) 35%, transparent)' }}>0 open ports</span>
      </div>

      <style jsx>{`
        .ss-led {
          width: 8px; height: 8px; border-radius: 999px;
          background: #34d399; box-shadow: 0 0 8px #34d399;
          animation: ssPulse 2s ease-in-out infinite;
        }
        @keyframes ssPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .ss-flow { display: flex; align-items: stretch; gap: 6px; }
        .ss-flow-item { display: contents; }
        .ss-hop {
          flex: 1 1 0; min-width: 0;
          border: 1px solid color-mix(in srgb, var(--hop) 32%, transparent);
          border-radius: 11px;
          background: linear-gradient(180deg, rgba(18,16,38,.75), rgba(10,9,22,.75));
          padding: 11px 12px;
        }
        .ss-hop[data-last='true'] {
          background: linear-gradient(180deg, color-mix(in srgb, var(--cyan) 16%, transparent), rgba(10,9,22,.75));
          border-color: color-mix(in srgb, var(--cyan) 55%, transparent);
        }
        .ss-hop-top { display: flex; align-items: center; gap: 8px; }
        .ss-hop-n {
          width: 18px; height: 18px; flex: none; border-radius: 999px;
          display: grid; place-items: center; font-size: 11px; font-weight: 700;
          color: #070811; background: var(--hop);
        }
        .ss-hop-name { font-size: var(--t-label); font-weight: 600; color: var(--ink); line-height: 1.15; }
        .ss-hop-cap { font-size: var(--t-cap); color: var(--mute); margin-top: 6px; line-height: 1.3; }
        .ss-arrow { align-self: center; color: var(--dim); flex: none; font-size: 14px; }
        .ss-spec {
          display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
          margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--line);
        }
        .ss-spec-host { font-weight: 800; font-size: var(--t-label); color: var(--ink); letter-spacing: -.01em; }
        .ss-spec-chip {
          font-size: var(--t-cap); color: var(--ink);
          border: 1px solid var(--line); border-radius: 7px; padding: 3px 9px;
          background: rgba(12,11,28,.55);
        }
        @media (prefers-reduced-motion: reduce) { .ss-led { animation: none; } }
        @media (max-width: 720px) {
          .ss-flow { flex-direction: column; }
          .ss-arrow { transform: rotate(90deg); align-self: flex-start; margin-left: 8px; }
        }
      `}</style>
    </div>
  );
}
