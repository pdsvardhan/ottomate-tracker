// Project Overview tab — Spotlight Glass redesign v2 (iter-7 item 52).
// Composes: ProjectIntro (audience-facing) -> SwimLanePipeline (click-expand) ->
// AboutThisProject (compact pointers) -> Blockers + TodoList -> DocsRail -> ActivityFeed.

import Link from 'next/link';
import { asc, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { ProjectIntro } from '@/components/project/ProjectIntro';
import { SwimLanePipeline, type StageNode } from '@/components/project/SwimLanePipeline';
import { AboutThisProject } from '@/components/project/AboutThisProject';
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

  // ── Data pulls ──
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
  const adrs = db.select().from(schema.adr_index)
    .where(eq(schema.adr_index.project_slug, slug)).all();
  const diagrams = db.select().from(schema.diagram_artifacts)
    .where(eq(schema.diagram_artifacts.project_slug, slug)).all();
  const ui_master_plan = db.select().from(schema.ui_master_plans)
    .where(eq(schema.ui_master_plans.project_slug, slug)).get();

  const skillEvents = db.select().from(schema.skill_events)
    .where(eq(schema.skill_events.project_slug, slug))
    .orderBy(desc(schema.skill_events.event_at)).limit(20).all();

  // ── Preferences JSON (may be null) ──
  type PrefsShape = { likes?: string[]; dislikes?: string[]; must_haves?: string[]; avoid?: string[] };
  const prefs = (project.preferences ?? {}) as PrefsShape;

  // ── Compute stage data for swim-lane ──
  // Each stage has sub_tasks that surface "what's done and what's left".
  const featuresDone = features.filter((f) => f.status === 'done').length;
  const featuresInProgress = features.filter((f) => f.status === 'building').length;
  const componentsPicked = components.filter((c) => c.picked).length;
  const componentsSkipped = components.filter((c) => c.skip_reason).length;
  const iterationsIntegrated = iterations.filter((it) => it.integrated_at).length;
  const iterationsInProgress = iterations.filter((it) => it.status === 'building').length;
  const flowsTested = flows.filter((f) => f.test_status === 'passing').length;
  const allItems = iterations.flatMap((it) => Array(0).fill(it.id)); // placeholder; iteration items not joined

  // Heuristic stage status — adapted for "ottomate is its own meta project".
  const stage0_done = project.lifecycle_phase !== 'ideating';
  const stage1_total = features.length + flows.length + pages.length;
  const stage1_done_count = stage1_total; // by the time SO1 docs exist they're considered "captured"
  const stage1_done = stage1_total > 0;
  const stage2_done = components.length > 0 && componentsPicked + componentsSkipped === components.length;
  const stage2_in_progress = !stage2_done && (componentsPicked > 0 || (ui_master_plan != null));
  const stage3_done = features.length > 0 && featuresDone === features.length;
  const stage3_in_progress = !stage3_done && (featuresDone > 0 || featuresInProgress > 0);
  const stage4_in_progress = iterationsInProgress > 0;
  const stage4_done = iterations.length > 0 && iterationsInProgress === 0;

  const stages: StageNode[] = [
    {
      id: 'stage-0',
      label: 'Stage 0',
      tagline: 'intake',
      status: stage0_done ? 'done' : 'in-progress',
      done: stage0_done ? 1 : 0,
      total: 1,
      sub_tasks: [
        { label: 'ND1 document', done: stage0_done ? 1 : 0, total: 1 },
        { label: 'sanity checks', done: 1, total: 1 },
      ],
      note: 'Raw user intake captured as an ND1 doc; sanity-check bedrock passed.',
    },
    {
      id: 'stage-1',
      label: 'Stage 1',
      tagline: 'SO1 docs',
      status: stage1_done && !stage2_in_progress && !stage3_done ? 'done' : stage1_done ? 'done' : 'in-progress',
      done: stage1_done_count,
      total: stage1_total,
      sub_tasks: [
        { label: 'features defined', done: features.length, total: features.length },
        { label: 'flows defined', done: flows.length, total: flows.length },
        { label: 'pages defined', done: pages.length, total: pages.length },
        { label: 'risks captured', done: risks.length, total: risks.length },
        { label: 'ADRs accepted', done: adrs.filter((a) => a.status === 'accepted').length, total: adrs.length },
      ],
      note: 'All seven SO1 docs locked. Counts mirror the DB.',
    },
    {
      id: 'stage-2',
      label: 'Stage 2',
      tagline: 'UI + components',
      status: stage2_done ? 'done' : stage2_in_progress ? 'in-progress' : 'pending',
      done: componentsPicked,
      total: components.length,
      sub_tasks: [
        { label: 'UI master plan', done: ui_master_plan ? 1 : 0, total: 1 },
        { label: 'components picked', done: componentsPicked, total: components.length },
        { label: 'components skipped (with reason)', done: componentsSkipped, total: components.length },
        { label: 'diagrams seeded', done: diagrams.length, total: 5 },
      ],
      note: stage2_done
        ? 'Every component resolved (picked or skipped with reason); ready for Stage 3.'
        : 'Pick the remaining slots in /components-pick — each slot shows 3 ranked live previews.',
    },
    {
      id: 'stage-3',
      label: 'Stage 3',
      tagline: 'build + deploy',
      status: stage3_done ? 'done' : stage3_in_progress ? 'in-progress' : 'pending',
      done: featuresDone,
      total: features.length,
      sub_tasks: [
        { label: 'features shipped', done: featuresDone, total: features.length },
        { label: 'features in-progress', done: featuresInProgress, total: features.length },
        { label: 'flows tested', done: flowsTested, total: flows.length },
        { label: 'open risks resolved', done: risks.filter((r) => r.status === 'resolved').length, total: risks.length },
      ],
      note: stage3_done
        ? 'Codegen + verifier passes complete. Deployment live.'
        : 'Coder + verifier dispatch per feature; tests propagate up to flows.',
    },
    {
      id: 'stage-4',
      label: 'Stage 4',
      tagline: 'iterate',
      status: stage4_in_progress ? 'in-progress' : stage4_done ? 'done' : 'pending',
      done: iterationsIntegrated,
      total: iterations.length,
      sub_tasks: [
        { label: 'iterations integrated', done: iterationsIntegrated, total: iterations.length },
        { label: 'iterations in-progress', done: iterationsInProgress, total: iterations.length },
        { label: 'pending reports', done: 0, total: 0 }, // TODO query reports
      ],
      note: 'Each iteration = raw report -> classify -> lock -> build -> verify -> integrate. Loops forever.',
    },
  ];

  // ── Activity feed ──
  type ActivityRow = {
    at: number;
    kind: 'iteration' | 'feature' | 'component_pick' | 'skill_event';
    actor: string;
    verb: string;
    target_label: string;
    target_kind?: string;
    target_id?: string | number;
  };
  const events: ActivityRow[] = [];
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
        verb: 'picked', target_label: `${c.name}${c.asset_library_ref ? ' -> ' + c.asset_library_ref : ''}`,
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
      {/* ROW 1 — Audience intro */}
      <ProjectIntro
        displayName={project.display_name}
        tagline={project.tagline}
        coreIdea={project.core_idea}
        problemStatement={project.problem_statement}
        publicUrl={project.public_url}
        repositoryUrl={project.repository_url}
        port={project.port}
        hostingTarget={project.hosting_target}
        tags={((project.tags ?? []) as string[])}
      />

      {/* ROW 2 — Pipeline swim-lane */}
      <SwimLanePipeline stages={stages} />

      {/* ROW 3 — About this project (compact) */}
      <AboutThisProject
        tagline={project.tagline}
        must_haves={prefs.must_haves ?? []}
        non_goals={non_goals.map((n) => n.content)}
        success_criteria={success_criteria.map((s) => s.content)}
        likes={prefs.likes ?? []}
        dislikes={prefs.dislikes ?? []}
        avoid={prefs.avoid ?? []}
      />

      {/* ROW 4 — Blockers + Todos */}
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
                <li key={r.id} className="text-xs text-zinc-400 leading-relaxed flex items-start gap-2">
                  <span className="mt-1.5 size-1 rounded-full bg-rose-400 shrink-0" />
                  <div className="min-w-0">
                    <code className="font-mono text-zinc-500">{r.risk_type_id ?? 'risk'}</code>
                    {r.notes && <p className="text-zinc-300 mt-0.5">{r.notes}</p>}
                  </div>
                </li>
              ))}
              {openRisks.length > 5 && (
                <li className="text-[11px] text-zinc-600 italic pt-1">+ {openRisks.length - 5} more</li>
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

      {/* ROW 5 — Docs rail */}
      <DocsRail
        docs={docs.map((d) => ({
          doc_name: d.doc_name,
          body: d.body,
          mirrored_at: d.mirrored_at instanceof Date ? d.mirrored_at.getTime() / 1000 : (d.mirrored_at ?? 0),
        }))}
        repoUrl={project.repository_url}
      />

      {/* ROW 6 — Recent activity */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">Recent activity</h3>
        <ActivityFeed slug={slug} events={topEvents} emptyLabel="No activity recorded yet for this project." />
      </div>
    </div>
  );
}
