// Home — projects register (prototype adoption, ui-overhaul).
// A compact table of every active project with per-project accent, honest
// progress, and a hover/tap-expandable preview row. Hybrid columns: identity +
// stage + progress + category lead; coverage/risks are present but de-emphasised.

import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { projectAccent } from '@/lib/project-accent';
import { ProjectRegister, type RegisterRow } from '@/components/home/ProjectRegister';

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
  const lastChange = new Map<string, { text: string; at: number }>();
  for (const e of events) {
    if (!e.project_slug || lastChange.has(e.project_slug)) continue;
    lastChange.set(e.project_slug, { text: e.notes ?? e.event_type, at: unix(e.event_at) });
  }

  const rows: RegisterRow[] = projects.map((p) => {
    const tags = (p.tags ?? []) as string[];
    const cats = ['personal', 'cv'].filter((c) => tags.includes(c));
    const fs = fStat.get(p.slug) ?? { done: 0, total: 0 };
    const fls = flStat.get(p.slug) ?? { passing: 0, total: 0 };
    const changed = lastChange.get(p.slug);
    const updatedAt = unix(p.updated_at);
    const changeAt = Math.max(changed?.at ?? 0, updatedAt);
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
      category: cats.length ? cats.join(' · ') : null,
      flowsPassing: fls.passing,
      flowsTotal: fls.total,
      risksOpen: riskOpen.get(p.slug) ?? 0,
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

  return (
    <div className="px-6 md:px-10 py-8">
      <ProjectRegister
        rows={rows}
        stats={{ projects: rows.length, featuresShipped, live: liveCount }}
      />
    </div>
  );
}
