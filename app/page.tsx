// Home — projects register (iter-12 rebuild per owner feedback 2026-07-04).
// Cyber-Den backdrop (same shader as project pages), hero-integrated stats,
// stage-based filters (personal/cv retired — all projects equal stature),
// value-dense columns (overview / public-private / health / open items /
// stack), and a below-fold activity feed + stage distribution strip.

import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { projectAccent } from '@/lib/project-accent';
import { ProjectRegister, type RegisterRow, type ActivityLine, type StageSlice } from '@/components/home/ProjectRegister';
import { ShaderBackground } from '@/components/project/ShaderBackground';

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
  const todos = db.select().from(schema.project_todos)
    .where(eq(schema.project_todos.done, false))
    .orderBy(schema.project_todos.sort_order).all();
  const events = db.select().from(schema.skill_events)
    .orderBy(desc(schema.skill_events.event_at)).limit(80).all();
  const policies = db.select({ slug: schema.policies.project_slug, exposure: schema.policies.exposure })
    .from(schema.policies).all();
  const stacks = db.select().from(schema.tech_stacks).all();
  const pendingReports = db.select({ slug: schema.reports.project_slug, status: schema.reports.status })
    .from(schema.reports).where(eq(schema.reports.status, 'pending')).all();

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
  const todoMap = new Map<string, { items: string[]; count: number }>();
  for (const t of todos) {
    const s = todoMap.get(t.project_slug) ?? { items: [], count: 0 };
    s.count += 1;
    if (s.items.length < 3) s.items.push(t.title);
    todoMap.set(t.project_slug, s);
  }
  const reportOpen = new Map<string, number>();
  for (const r of pendingReports) {
    reportOpen.set(r.slug, (reportOpen.get(r.slug) ?? 0) + 1);
  }
  const exposure = new Map<string, string>();
  for (const p of policies) exposure.set(p.slug, p.exposure ?? '');
  const stackMap = new Map<string, string[]>();
  for (const t of stacks) {
    const chips = [t.framework, t.database, t.styling].filter(Boolean) as string[];
    stackMap.set(t.project_slug, chips.slice(0, 3));
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
    // Public/Private (owner decision 2026-07-04): policy exposure wins,
    // presence of a public URL is the honest fallback.
    const isPublic = exposure.get(p.slug)
      ? exposure.get(p.slug) === 'public'
      : !!p.public_url;
    return {
      slug: p.slug,
      name: p.display_name,
      sub: p.tagline ?? p.slug,
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
      openItems: (todoMap.get(p.slug)?.count ?? 0) + (reportOpen.get(p.slug) ?? 0),
      stack: stackMap.get(p.slug) ?? [],
      liveUrl: p.public_url ?? null,
      repoUrl: p.repository_url ?? null,
      port: p.port ?? null,
      age: timeAgo(changeAt),
      blurb: p.short_description ?? p.core_idea ?? p.tagline ?? '',
      tags: tags.filter((t) => t !== 'personal' && t !== 'cv').slice(0, 4),
      todos: (todoMap.get(p.slug)?.items) ?? [],
      todoCount: todoMap.get(p.slug)?.count ?? 0,
      lastChange: changed?.text ?? null,
    };
  });

  const featuresShipped = rows.reduce((n, r) => n + r.done, 0);
  const liveCount = rows.filter((r) => r.liveUrl).length;
  const flowsPassing = rows.reduce((n, r) => n + r.flowsPassing, 0);

  // ── Below-fold data (iter-12 item: use the empty space) ──
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

  const STAGE_ORDER = ['ideating', 'building', 'shipped', 'maintained', 'deprecated'];
  const stageDist: StageSlice[] = STAGE_ORDER
    .map((phase) => ({
      phase,
      label: STAGE_LABEL[phase],
      count: rows.filter((r) => r.phase === phase).length,
    }))
    .filter((s) => s.count > 0);

  return (
    <div className="sc">
      {/* Same Cyber-Den backdrop as the project pages (iter-12: the homepage
          felt disconnected without it) */}
      <ShaderBackground />
      <div className="sc-veil" aria-hidden />
      <div className="sc-scan" aria-hidden />
      <div className="sc-grain" aria-hidden />
      <div className="sc-wrap px-6 md:px-10 py-10">
        <ProjectRegister
          rows={rows}
          stats={{ projects: rows.length, featuresShipped, live: liveCount, flowsPassing }}
          activity={activity}
          stageDist={stageDist}
        />
      </div>
    </div>
  );
}
