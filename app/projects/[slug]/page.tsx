// Project Overview tab — Spotlight Glass redesign (E.2 closes iteration #5 item 17).
// Composes: PipelineProgress + KeyContextPanel + DocsRail + TodoList + ActivityFeed.
// Pulls data: projects + preferences + non_goals + success_criteria + features + flows
// + components + iterations + project_docs + project_todos + skill_events + risks.

import Link from 'next/link';
import { asc, count, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { PipelineProgress } from '@/components/project/PipelineProgress';
import { KeyContextPanel } from '@/components/project/KeyContextPanel';
import { DocsRail } from '@/components/project/DocsRail';
import { TodoList } from '@/components/project/TodoList';
import { ActivityFeed } from '@/components/project/ActivityFeed';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

function unix(value: unknown): number {
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Math.floor(Date.parse(value) / 1000);
  return 0;
}

export default async function ProjectOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  // Pull all the data the overview needs in parallel-ish single-thread queries.
  const non_goals = db.select().from(schema.project_non_goals)
    .where(eq(schema.project_non_goals.project_slug, slug))
    .orderBy(asc(schema.project_non_goals.sort_order)).all();
  const success_criteria = db.select().from(schema.project_success_criteria)
    .where(eq(schema.project_success_criteria.project_slug, slug))
    .orderBy(asc(schema.project_success_criteria.sort_order)).all();
  const features = db.select().from(schema.features)
    .where(eq(schema.features.project_slug, slug)).all();
  const flows = db.select().from(schema.flows)
    .where(eq(schema.flows.project_slug, slug)).all();
  const pages = db.select().from(schema.pages)
    .where(eq(schema.pages.project_slug, slug)).all();
  const components = db.select().from(schema.components)
    .where(eq(schema.components.project_slug, slug)).all();
  const iterations = db.select().from(schema.iterations)
    .where(eq(schema.iterations.project_slug, slug)).all();
  const todos = db.select().from(schema.project_todos)
    .where(eq(schema.project_todos.project_slug, slug))
    .orderBy(asc(schema.project_todos.sort_order), asc(schema.project_todos.id)).all();
  const docs = db.select().from(schema.project_docs)
    .where(eq(schema.project_docs.project_slug, slug)).all();
  const risks = db.select().from(schema.risk_instances)
    .where(eq(schema.risk_instances.project_slug, slug)).all();

  // Activity (top 7)
  const skillEvents = db.select().from(schema.skill_events)
    .where(eq(schema.skill_events.project_slug, slug))
    .orderBy(desc(schema.skill_events.event_at)).limit(20).all();

  // Preferences JSON (may be null)
  type PrefsShape = { likes?: string[]; dislikes?: string[]; must_haves?: string[]; avoid?: string[] };
  const prefs = (project.preferences ?? {}) as PrefsShape;

  // Stage progress heuristics
  const featuresDone = features.filter((f) => f.status === 'done').length;
  const flowsTested = flows.filter((f) => f.test_status && f.test_status !== 'not-tested').length;
  const componentsPicked = components.filter((c) => c.picked).length;
  const iterationsIntegrated = iterations.filter((it) => it.integrated_at).length;
  const iterationsBuilding = iterations.filter((it) => it.status === 'building').length;

  const stages = [
    {
      label: 'Stage 0',
      description: 'intake',
      status: 'done' as const,
      done: 1,
      total: 1,
    },
    {
      label: 'Stage 1',
      description: 'SO1 docs',
      status: (features.length > 0 && flows.length > 0 && pages.length > 0 ? 'done' : 'in-progress') as 'done' | 'in-progress',
      done: features.length + flows.length + pages.length,
      total: features.length + flows.length + pages.length,
    },
    {
      label: 'Stage 2',
      description: 'UI + components',
      status: (componentsPicked === components.length && components.length > 0 ? 'done' : 'in-progress') as 'done' | 'in-progress',
      done: componentsPicked,
      total: components.length,
    },
    {
      label: 'Stage 3',
      description: 'build + deploy',
      status: (featuresDone === features.length && features.length > 0 ? 'done' : 'in-progress') as 'done' | 'in-progress',
      done: featuresDone,
      total: features.length,
    },
    {
      label: 'Stage 4',
      description: 'iterate',
      status: (iterationsBuilding > 0 ? 'in-progress' : iterations.length > 0 ? 'done' : 'pending') as 'done' | 'in-progress' | 'pending',
      done: iterationsIntegrated,
      total: iterations.length,
    },
  ];

  // Activity events feed (server-side construction)
  const events: Array<{
    at: number; kind: 'iteration' | 'feature' | 'component_pick' | 'skill_event';
    actor: string; verb: string; target_label: string;
    target_kind?: string; target_id?: string | number;
  }> = [];

  for (const it of iterations) {
    if (it.integrated_at) {
      events.push({
        at: unix(it.integrated_at), kind: 'iteration', actor: 'skill',
        verb: 'integrated', target_label: `iteration #${it.iteration_number}`,
        target_kind: 'iteration', target_id: it.id,
      });
    }
    if (it.locked_at) {
      events.push({
        at: unix(it.locked_at), kind: 'iteration', actor: 'user',
        verb: 'locked', target_label: `iteration #${it.iteration_number}`,
        target_kind: 'iteration', target_id: it.id,
      });
    }
  }
  for (const f of features) {
    if (f.updated_at) {
      events.push({
        at: unix(f.updated_at), kind: 'feature', actor: 'skill',
        verb: f.status === 'done' ? 'shipped' : 'updated', target_label: f.title,
        target_kind: 'feature', target_id: f.id,
      });
    }
  }
  for (const c of components) {
    if (c.picked_at) {
      events.push({
        at: unix(c.picked_at), kind: 'component_pick', actor: 'user',
        verb: 'picked', target_label: `${c.name}${c.asset_library_ref ? ' → ' + c.asset_library_ref : ''}`,
        target_kind: 'component', target_id: c.id,
      });
    }
  }
  for (const e of skillEvents) {
    events.push({
      at: unix(e.event_at), kind: 'skill_event', actor: e.session_id ?? 'skill',
      verb: e.event_type ?? 'event', target_label: e.event_type ?? 'skill event',
    });
  }
  events.sort((a, b) => b.at - a.at);
  const topEvents = events.slice(0, 7);

  const openRisks = risks.filter((r) => r.status === 'open');

  return (
    <div className="space-y-6">
      {/* Tagline + URLs */}
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          {project.tagline && <p className="text-base text-zinc-300">{project.tagline}</p>}
          {project.core_idea && (
            <p className="mt-1 text-sm text-zinc-500 leading-relaxed max-w-3xl">{project.core_idea}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {project.public_url && (
            <a href={project.public_url} target="_blank" rel="noopener noreferrer"
               className="text-cyan-300 hover:text-cyan-100 transition-colors">
              live ↗
            </a>
          )}
          {project.repository_url && (
            <a href={project.repository_url} target="_blank" rel="noopener noreferrer"
               className="text-zinc-400 hover:text-zinc-200 transition-colors">
              repo ↗
            </a>
          )}
          <Link href={`/projects/${slug}/components-pick`}
                className="text-zinc-400 hover:text-zinc-200 transition-colors">
            pick →
          </Link>
        </div>
      </div>

      {/* ROW 1 — Pipeline */}
      <PipelineProgress stages={stages} />

      {/* ROW 2 — Key context */}
      <KeyContextPanel
        must_haves={prefs.must_haves ?? []}
        non_goals={non_goals.map((n) => n.content)}
        likes={prefs.likes ?? []}
        dislikes={prefs.dislikes ?? []}
        success_criteria={success_criteria.map((s) => s.content)}
      />

      {/* ROW 3 — Status (blockers + todos) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-200">Blockers</h3>
            <Badge variant="count">{openRisks.length} open</Badge>
          </div>
          {openRisks.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">No open risks — clean slate.</p>
          ) : (
            <ul className="space-y-2">
              {openRisks.slice(0, 5).map((r) => (
                <li key={r.id} className="text-xs text-zinc-400 leading-relaxed">
                  <code className="font-mono text-zinc-500">{r.risk_type_id ?? 'risk'}</code>
                  {r.notes && <span className="ml-2">{r.notes}</span>}
                </li>
              ))}
              {openRisks.length > 5 && (
                <li className="text-[11px] text-zinc-600 italic">+ {openRisks.length - 5} more</li>
              )}
            </ul>
          )}
        </div>

        <TodoList
          projectSlug={slug}
          initialTodos={todos.map((t) => ({
            id: t.id,
            title: t.title,
            done: Boolean(t.done),
            sort_order: t.sort_order,
          }))}
        />
      </div>

      {/* ROW 4 — Docs rail */}
      <DocsRail
        docs={docs.map((d) => ({
          doc_name: d.doc_name,
          body: d.body,
          mirrored_at: d.mirrored_at instanceof Date ? d.mirrored_at.getTime() / 1000 : (d.mirrored_at ?? 0),
        }))}
        repoUrl={project.repository_url}
      />

      {/* ROW 5 — Activity */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">Recent activity</h3>
        <ActivityFeed slug={slug} events={topEvents} emptyLabel="No activity recorded yet for this project." />
      </div>
    </div>
  );
}
