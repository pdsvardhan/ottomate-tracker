'use client';

// VAULT7A server telemetry card (iter-14, replaces the pipeline strip on home).
// Values are split honestly: LIVE readings are snapshotted server-side at request
// time (page is force-dynamic) and passed in — load / memory / uptime are real
// host numbers read from /proc via node:os inside the container. Uptime ticks
// client-side from the snapshot so it feels alive without a polling endpoint.
// The COUNTS (containers / networks) the container can't see, so they're passed
// as plainly-labelled facts, not dressed up as live.

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

function Gauge({ label, pct, value, hue }: { label: string; pct: number; value: string; hue: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="mono text-[length:var(--t-cap)] tracking-wide" style={{ color: 'var(--dim)' }}>{label}</span>
        <span className="mono text-[length:var(--t-label)] font-semibold tabular-nums" style={{ color: hue }}>{value}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.07)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${clamped}%`, background: `linear-gradient(90deg, ${hue}, color-mix(in srgb, ${hue} 55%, transparent))`, boxShadow: `0 0 12px ${hue}` }}
        />
      </div>
    </div>
  );
}

export function ServerStatsCard({ stats }: { stats: ServerStats }) {
  const CYAN = 'var(--cyan)', MAG = 'var(--mag)', VIO = 'var(--vio)', AMBER = 'var(--amber)', CORAL = 'var(--coral)';

  // Live-ticking uptime: seconds since snapshot added to the server value.
  const [now, setNow] = useState(stats.snapshotMs);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const liveUptime = stats.uptimeSeconds + Math.max(0, Math.floor((now - stats.snapshotMs) / 1000));
  const up = fmtUptime(liveUptime);

  const loadPct = (stats.load1 / stats.cores) * 100;
  const memPct = (stats.memUsedGB / stats.memTotalGB) * 100;
  const storagePct = (stats.storageUsedTB / stats.storageTotalTB) * 100;

  return (
    <div className="card flat" style={{ overflow: 'hidden' }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="eyebrow" style={{ color: CYAN, margin: 0 }}>The machine behind it all</div>
        <span className="inline-flex items-center gap-2 mono text-[length:var(--t-cap)]" style={{ color: 'var(--mute)' }}>
          <span className="ss-led" /> online
        </span>
      </div>

      {/* Identity row */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-5">
        <span className="font-display font-extrabold text-[length:var(--t-title)] tracking-tight" style={{ color: 'var(--ink)' }}>
          VAULT7A
        </span>
        <span className="mono text-[length:var(--t-cap)]" style={{ color: 'var(--dim)' }}>{stats.os}</span>
      </div>

      {/* What this box is + how the projects are hosted (iter-16 owner ask) */}
      <p className="mb-3.5 text-[length:var(--t-label)] leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.8 }}>
        One self-hosted box runs every project on this site. Public traffic enters through a Cloudflare
        Tunnel to <span className="mono" style={{ color: CYAN }}>&lt;project&gt;.vault7a.xyz</span>, gated by
        Authentik single sign-on — no open ports, no cloud bill.
      </p>

      {/* Simple hosting diagram */}
      <div className="mb-5 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {['You', 'Cloudflare', 'Tunnel', 'Authentik SSO', 'Docker app'].map((node, i, arr) => (
          <span key={node} className="flex items-center gap-1.5">
            <span
              className="mono text-[length:var(--t-cap)] rounded-lg px-2.5 py-1"
              style={{
                color: i === arr.length - 1 ? '#070811' : 'var(--ink)',
                background: i === arr.length - 1 ? CYAN : 'rgba(12,11,28,.6)',
                border: i === arr.length - 1 ? 'none' : '1px solid var(--line)',
                fontWeight: i === arr.length - 1 ? 700 : 400,
              }}
            >
              {node}
            </span>
            {i < arr.length - 1 && <span aria-hidden style={{ color: 'var(--dim)' }}>→</span>}
          </span>
        ))}
      </div>

      {/* Big uptime */}
      <div className="mb-5 flex items-end gap-4 flex-wrap">
        {[{ v: up.d, l: 'days' }, { v: up.h, l: 'hrs' }, { v: up.m, l: 'min' }].map((u, i) => (
          <div key={u.l} className="flex items-end gap-1.5">
            <span
              className="font-display font-extrabold tabular-nums leading-none"
              style={{ fontSize: 'clamp(30px,3.4vw,46px)', color: [CYAN, VIO, MAG][i], textShadow: `0 0 24px color-mix(in srgb, ${[CYAN, VIO, MAG][i]} 55%, transparent)` }}
            >
              {String(u.v).padStart(2, '0')}
            </span>
            <span className="mono text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--dim)' }}>{u.l}</span>
          </div>
        ))}
        <span className="mono text-[length:var(--t-cap)] mb-1.5 ml-1" style={{ color: 'var(--mute)' }}>uptime · live</span>
      </div>

      {/* Live gauges */}
      <div className="grid gap-3.5 sm:grid-cols-3 mb-5">
        <Gauge label={`CPU · ${stats.cores} cores`} pct={loadPct} value={`${stats.load1.toFixed(2)} load`} hue={CORAL} />
        <Gauge label="Memory" pct={memPct} value={`${stats.memUsedGB.toFixed(0)}/${stats.memTotalGB.toFixed(0)} GB`} hue={VIO} />
        <Gauge label="Storage pool" pct={storagePct} value={`${stats.storageUsedTB.toFixed(1)}/${stats.storageTotalTB.toFixed(0)} TB`} hue={CYAN} />
      </div>

      {/* Spec chips (static facts) */}
      <div className="flex flex-wrap gap-2">
        {[
          stats.cpuModel,
          `${stats.memTotalGB.toFixed(0)} GB RAM`,
          `${stats.containers} containers`,
          `${stats.networks} networks`,
        ].map((s) => (
          <span key={s} className="mono text-[length:var(--t-cap)] rounded-lg px-2.5 py-1" style={{ color: 'var(--ink)', background: 'rgba(12,11,28,.6)', border: '1px solid var(--line)' }}>
            {s}
          </span>
        ))}
      </div>

      <style jsx>{`
        .ss-led {
          width: 8px; height: 8px; border-radius: 999px;
          background: #34d399; box-shadow: 0 0 8px #34d399;
          animation: ssPulse 2s ease-in-out infinite;
        }
        @keyframes ssPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        @media (prefers-reduced-motion: reduce) { .ss-led { animation: none; } }
      `}</style>
    </div>
  );
}
