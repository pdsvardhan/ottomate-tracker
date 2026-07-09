'use client';

// VAULT7A server telemetry card. iter-15 "rack blades" redesign (winner 2a from
// the external design round): every subsystem reads as a 1U rack blade with a
// status LED. Data is unchanged and still split honestly — LIVE readings
// (load / memory / storage / uptime) are snapshotted server-side at request time
// from /proc via node:os and passed in; uptime ticks client-side from that
// snapshot so it feels alive without a polling endpoint. The COUNTS
// (containers / networks) the container can't see, so they're labelled facts,
// not dressed up as live. Presentation-only change — the ServerStats contract
// and the home page's readServerStats() are untouched.

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

function fmtUptime(totalSec: number): { d: number; h: number; m: number } {
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return { d, h, m };
}

// One rack blade: LED · label · body · optional right-aligned value.
function Blade({
  hue, label, children, value, valueHue,
}: {
  hue: string; label: string; children: React.ReactNode; value?: React.ReactNode; valueHue?: string;
}) {
  return (
    <div className="ss-blade" data-hasvalue={value !== undefined ? 'true' : 'false'}>
      <span className="ss-dot" style={{ background: hue, boxShadow: `0 0 9px ${hue}` }} />
      <span className="ss-key">{label}</span>
      <span className="ss-body">{children}</span>
      {value !== undefined && (
        <span className="ss-val mono" style={{ color: valueHue ?? 'var(--ink)' }}>{value}</span>
      )}
    </div>
  );
}

// Thin glow meter (memory / storage).
function Meter({ pct, hue }: { pct: number; hue: string }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <span className="ss-meter">
      <span style={{ width: `${w}%`, background: `linear-gradient(90deg, ${hue}, color-mix(in srgb, ${hue} 55%, #fff 12%))`, boxShadow: `0 0 10px ${hue}` }} />
    </span>
  );
}

export function ServerStatsCard({ stats }: { stats: ServerStats }) {
  const CYAN = 'var(--cyan)', MAG = 'var(--mag)', VIO = 'var(--vio)', CORAL = 'var(--coral)', AMBER = 'var(--amber)', GREEN = '#34d399';

  // Live-ticking uptime: seconds since snapshot added to the server value.
  const [now, setNow] = useState(stats.snapshotMs);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const liveUptime = stats.uptimeSeconds + Math.max(0, Math.floor((now - stats.snapshotMs) / 1000));
  const up = fmtUptime(liveUptime);

  const memPct = (stats.memUsedGB / stats.memTotalGB) * 100;
  const storagePct = (stats.storageUsedTB / stats.storageTotalTB) * 100;

  // CPU as per-core segments: floor(load) full, one partial for the fraction.
  const full = Math.floor(stats.load1);
  const frac = stats.load1 - full;
  const segs = Array.from({ length: stats.cores }, (_, i) => (i < full ? 1 : i === full ? Math.max(0.4, frac) : 0));

  return (
    <div className="card flat" style={{ overflow: 'hidden' }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="eyebrow" style={{ color: CYAN, margin: 0 }}>The machine behind it all</div>
        <span className="inline-flex items-center gap-2 mono text-[length:var(--t-cap)]" style={{ color: 'var(--mute)' }}>
          <span className="ss-led" /> online
        </span>
      </div>

      {/* Identity: host + OS + CPU model */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
        <span className="font-display font-extrabold text-[length:var(--t-title)] tracking-tight" style={{ color: 'var(--ink)' }}>
          {stats.host}
        </span>
        <span className="mono text-[length:var(--t-cap)]" style={{ color: 'var(--dim)' }}>{stats.os}</span>
        <span className="mono text-[length:var(--t-cap)]" style={{ color: 'var(--dim)' }}>· {stats.cpuModel} · {stats.cores}C</span>
      </div>

      {/* ── the rack ── */}
      <div className="ss-rack">
        <Blade hue={GREEN} label="UPTIME" value={<span style={{ color: 'var(--dim)' }}>no restarts</span>}>
          <span className="ss-uptime mono" style={{ color: GREEN }}>
            {String(up.d).padStart(2, '0')}<i>d</i> {String(up.h).padStart(2, '0')}<i>h</i> {String(up.m).padStart(2, '0')}<i>m</i>
          </span>
        </Blade>

        <Blade hue={CORAL} label="CPU" value={<>{stats.load1.toFixed(2)} <span style={{ color: 'var(--dim)' }}>/ {stats.cores} cores</span></>} valueHue={CORAL}>
          <span className="ss-cores">
            {segs.map((v, i) => (
              <span key={i} style={{ background: v ? `color-mix(in srgb, ${CORAL} ${Math.round(v * 100)}%, transparent)` : 'rgba(255,255,255,.07)', boxShadow: v ? `0 0 8px color-mix(in srgb, ${CORAL} ${Math.round(v * 60)}%, transparent)` : 'none' }} />
            ))}
          </span>
        </Blade>

        <Blade hue={VIO} label="MEMORY" value={`${stats.memUsedGB.toFixed(0)}/${stats.memTotalGB.toFixed(0)} GB`} valueHue={VIO}>
          <Meter pct={memPct} hue={VIO} />
        </Blade>

        <Blade hue={CYAN} label="STORAGE" value={`${stats.storageUsedTB.toFixed(1)}/${stats.storageTotalTB.toFixed(0)} TB`} valueHue={CYAN}>
          <Meter pct={storagePct} hue={CYAN} />
        </Blade>

        <Blade hue={MAG} label="INGRESS">
          <span className="ss-chain">
            {['You', 'Cloudflare', 'Tunnel', 'Authentik', 'Docker'].map((node, i, arr) => (
              <span key={node} className="flex items-center gap-1.5">
                <span className="ss-node" data-last={i === arr.length - 1 ? 'true' : 'false'}>{node}</span>
                {i < arr.length - 1 && <span aria-hidden style={{ color: 'var(--dim)' }}>→</span>}
              </span>
            ))}
          </span>
        </Blade>

        <Blade hue={AMBER} label="FLEET" value={<span style={{ color: GREEN }}>0 open ports</span>}>
          <span className="mono text-[length:var(--t-label)]" style={{ color: 'var(--ink)' }} title="Docker containers and isolated virtual networks segmenting them">
            {stats.containers} containers · {stats.networks} networks
          </span>
        </Blade>
      </div>

      <style jsx>{`
        .ss-led {
          width: 8px; height: 8px; border-radius: 999px;
          background: #34d399; box-shadow: 0 0 8px #34d399;
          animation: ssPulse 2s ease-in-out infinite;
        }
        @keyframes ssPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .ss-rack { display: flex; flex-direction: column; gap: 8px; }
        .ss-blade {
          display: grid;
          grid-template-columns: 10px 74px 1fr auto;
          gap: 8px 14px; align-items: center;
          border: 1px solid var(--line);
          border-radius: 9px;
          background: linear-gradient(180deg, rgba(18,16,38,.8), rgba(10,9,22,.8));
          padding: 11px 15px;
        }
        .ss-blade[data-hasvalue='false'] { grid-template-columns: 10px 74px 1fr; }
        .ss-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; }
        .ss-key {
          font-family: var(--scmono); font-size: var(--t-cap);
          letter-spacing: .14em; color: var(--dim);
        }
        .ss-body { min-width: 0; display: flex; align-items: center; }
        .ss-val { font-size: var(--t-label); font-weight: 600; white-space: nowrap; text-align: right; }
        .ss-uptime { font-size: clamp(17px, 2.1vw, 21px); font-weight: 700; letter-spacing: .01em; text-shadow: 0 0 14px color-mix(in srgb, #34d399 40%, transparent); font-variant-numeric: tabular-nums; }
        .ss-uptime i { font-style: normal; font-size: .62em; color: var(--dim); margin: 0 1px 0 .5px; }
        .ss-cores { display: flex; gap: 3px; width: 100%; }
        .ss-cores > span { flex: 1; height: 10px; border-radius: 2px; display: block; }
        .ss-meter { display: block; width: 100%; height: 10px; border-radius: 999px; background: rgba(255,255,255,.07); overflow: hidden; }
        .ss-meter > span { display: block; height: 100%; border-radius: 999px; }
        .ss-chain { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-family: var(--scmono); font-size: var(--t-cap); }
        .ss-node { border: 1px solid var(--line); border-radius: 5px; padding: 2px 8px; color: var(--ink); }
        .ss-node[data-last='true'] { background: var(--cyan); color: #070811; font-weight: 700; border-color: transparent; }
        @media (prefers-reduced-motion: reduce) { .ss-led { animation: none; } }
        @media (max-width: 520px) {
          .ss-blade, .ss-blade[data-hasvalue='false'] { grid-template-columns: 10px 1fr; }
          .ss-key { display: none; }
          .ss-val { grid-column: 2; text-align: left; }
        }
      `}</style>
    </div>
  );
}
