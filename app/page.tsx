// Home — projects register (iter-14 refinements per owner feedback 2026-07-04).
// Register trimmed to the agreed 8 columns (Name / Summary / Stage / Progress /
// Category / Health / Links / Age — OPEN + STACK dropped). Public/Private + Stage
// are placeholder values (owner corrects later). Below the fold: cross-project
// activity + a live VAULT7A server-telemetry card (real /proc readings).

import os from 'node:os';
import { statfs } from 'node:fs/promises';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { projectAccent } from '@/lib/project-accent';
import { ProjectRegister, type RegisterRow, type ActivityLine } from '@/components/home/ProjectRegister';
import { ShaderBackground } from '@/components/project/ShaderBackground';
import type { ServerStats } from '@/components/project/ServerStatsCard';

export const dynamic = 'force-dynamic';

function unix(value: unknown): number {
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Math.floor(Date.parse(value) / 1000);
  return 0;
}

function timeAgo(unixSeconds: number): string {
  if (!unixSeconds) return '—';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

const STAGE_LABEL: Record<string, string> = {
  ideating: 'SPEC',
  building: 'BUILD',
  shipped: 'SHIPPED',
  maintained: 'MAINT',
  deprecated: 'ARCHIVED',
};

// VAULT7A host facts the container can't introspect (no docker socket / host df).
// Refreshed manually; rendered as plain labelled facts, never as fake-live values.
const HOST_FACTS = {
  cpuModel: 'Intel Core i5-14600K',
  containers: 53,
  networks: 18,
  storageTotalTB: 21,
};

async function readServerStats(): Promise<ServerStats> {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const GB = 1024 ** 3;
  const TB = 1024 ** 4;
  let storageTotalTB = HOST_FACTS.storageTotalTB;
  let storageUsedTB = 7.1;
  try {
    // /repos is the /mnt/storage pool bind-mounted read-only into the container.
    const fs = await statfs('/repos');
    const total = fs.blocks * fs.bsize;
    const avail = fs.bavail * fs.bsize;
    if (total > 0) {
      storageTotalTB = total / TB;
      storageUsedTB = (total - avail) / TB;
    }
  } catch {
    /* keep the baked fallback */
  }
  return {
    host: os.hostname(),
    os: 'Ubuntu 24.04 LTS',
    cpuModel: HOST_FACTS.cpuModel,
    cores: os.cpus().length,
    load1: os.loadavg()[0],
    memTotalGB: totalBytes / GB,
    memUsedGB: (totalBytes - freeBytes) / GB,
    storageTotalTB,
    storageUsedTB,
    uptimeSeconds: Math.floor(os.uptime()),
    containers: HOST_FACTS.containers,
    networks: HOST_FACTS.networks,
    snapshotMs: Date.now(),
  };
}

export default async function HomePage() {
  const db = await getDb();

  const projects = db.select().from(schema.projects)
    .where(eq(schema.projects.archived, false))
    .orderBy(desc(schema.projects.updated_at)).all();

  const features = db.select({ slug: schema.features.project_slug, status: schema.features.status })
    .from(schema.features).all();
  const flows = db.select({ slug: schema.flows.project_slug, ts: schema.flows.test_status })
    .from(schema.flows).all();
  const risks = db.select({ slug: schema.risk_instances.project_slug, status: schema.risk_instances.status })
    .from(schema.risk_instances).all();
  const events = db.select().from(schema.skill_events)
    .orderBy(desc(schema.skill_events.event_at)).limit(80).all();

  // ── Roll-ups keyed by slug ──
  const fStat = new Map<string, { done: number; total: number }>();
  for (const f of features) {
    if (f.status === 'dropped') continue;
    const s = fStat.get(f.slug) ?? { done: 0, total: 0 };
    s.total += 1;
    if (f.status === 'done') s.done += 1;
    fStat.set(f.slug, s);
  }
  const flStat = new Map<string, { passing: number; total: number }>();
  for (const f of flows) {
    const s = flStat.get(f.slug) ?? { passing: 0, total: 0 };
    s.total += 1;
    if (f.ts === 'passing') s.passing += 1;
    flStat.set(f.slug, s);
  }
  const riskOpen = new Map<string, number>();
  for (const r of risks) {
    if (r.status !== 'open') continue;
    riskOpen.set(r.slug, (riskOpen.get(r.slug) ?? 0) + 1);
  }
  const lastChange = new Map<string, { text: string; at: number }>();
  for (const e of events) {
    if (!e.project_slug || lastChange.has(e.project_slug)) continue;
    lastChange.set(e.project_slug, { text: e.notes ?? e.event_type, at: unix(e.event_at) });
  }

  const nameBySlug = new Map(projects.map((p) => [p.slug, p.display_name]));

  const rows: RegisterRow[] = projects.map((p) => {
    const tags = (p.tags ?? []) as string[];
    const fs = fStat.get(p.slug) ?? { done: 0, total: 0 };
    const fls = flStat.get(p.slug) ?? { passing: 0, total: 0 };
    const changed = lastChange.get(p.slug);
    const updatedAt = unix(p.updated_at);
    const changeAt = Math.max(changed?.at ?? 0, updatedAt);
    // Public/Private — PLACEHOLDER: derived from an explicit 'public-facing' tag
    // (owner sets the real call per project later).
    const isPublic = tags.includes('public-facing');
    return {
      slug: p.slug,
      name: p.display_name,
      summary: p.tagline ?? p.short_description ?? p.slug,
      accent: projectAccent(p.slug),
      stageLabel: STAGE_LABEL[p.lifecycle_phase ?? 'building'] ?? 'BUILD',
      phase: p.lifecycle_phase ?? 'building',
      done: fs.done,
      total: fs.total,
      pct: fs.total > 0 ? Math.round((fs.done / fs.total) * 100) : 0,
      isPublic,
      flowsPassing: fls.passing,
      flowsTotal: fls.total,
      risksOpen: riskOpen.get(p.slug) ?? 0,
      liveUrl: p.public_url ?? null,
      repoUrl: p.repository_url ?? null,
      port: p.port ?? null,
      age: timeAgo(changeAt),
      blurb: p.short_description ?? p.core_idea ?? p.tagline ?? '',
      tags: tags.filter((t) => t !== 'personal' && t !== 'cv' && t !== 'public-facing').slice(0, 4),
      lastChange: changed?.text ?? null,
    };
  });

  const featuresShipped = rows.reduce((n, r) => n + r.done, 0);
  const liveCount = rows.filter((r) => r.liveUrl).length;
  const flowsPassing = rows.reduce((n, r) => n + r.flowsPassing, 0);

  const activity: ActivityLine[] = events
    .filter((e) => e.project_slug && nameBySlug.has(e.project_slug))
    .slice(0, 9)
    .map((e) => ({
      slug: e.project_slug!,
      name: nameBySlug.get(e.project_slug!) ?? e.project_slug!,
      accent: projectAccent(e.project_slug!),
      note: e.notes ?? e.event_type,
      when: timeAgo(unix(e.event_at)),
    }));

  const serverStats = await readServerStats();

  return (
    <div className="sc">
      {/* Same Cyber-Den backdrop as the project pages */}
      <ShaderBackground />
      <div className="sc-veil" aria-hidden />
      <div className="sc-scan" aria-hidden />
      <div className="sc-grain" aria-hidden />
      <div className="sc-wrap px-6 md:px-10 py-10">
        <ProjectRegister
          rows={rows}
          stats={{ projects: rows.length, featuresShipped, live: liveCount, flowsPassing }}
          activity={activity}
          serverStats={serverStats}
        />
      </div>
    </div>
  );
}
