// Unified Capabilities tab (E.7 + E.9 close items 23 and 21).
// Replaces the legacy Features / Pages / Flows tabs with a single surface:
// - Top: feature spec cards by status
// - Middle: pages tree with their flows underneath (heuristic grouped by flow.id prefix)
// - Bottom: backend / automated flows section
//
// Per-flow FlowTestRow gives inline pass/fail/bug controls (E.9 item 21).

import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { FlowTestRow } from '@/components/project/FlowTestRow';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, 'shipped' | 'building' | 'open' | 'neutral'> = {
  done: 'shipped',
  'in-progress': 'building',
  planned: 'open',
};

// Heuristic: bucket flow ids by their first identifier "namespace" after the
// `flow-` prefix. e.g. flow-projects-grid -> 'projects'.
function bucketKey(id: string): string {
  const m = id.match(/^flow-([a-z0-9]+)/);
  return m ? m[1] : 'other';
}

const PAGE_GROUP_LABELS: Record<string, string> = {
  projects: '/projects landing',
  project: 'Project overview',
  architecture: 'Architecture tab',
  iterations: 'Iterations tab',
  pick: 'Stage 2.4 picker',
  iteration: 'Iteration detail (lock-in)',
  inbox: 'Bug inbox',
  coverage: 'Coverage page',
  components: '/components-browser',
  component: 'Component detail',
  inspirations: '/inspirations',
  inspiration: 'Inspiration detail',
};

export default async function CapabilitiesTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  const features = db.select().from(schema.features)
    .where(eq(schema.features.project_slug, slug))
    .orderBy(asc(schema.features.title)).all();

  const flows = db.select().from(schema.flows)
    .where(eq(schema.flows.project_slug, slug))
    .orderBy(asc(schema.flows.id)).all();

  const pages = db.select().from(schema.pages)
    .where(eq(schema.pages.project_slug, slug))
    .orderBy(asc(schema.pages.id)).all();

  // Group flows by bucketKey.
  const flowGroups = new Map<string, typeof flows>();
  for (const f of flows) {
    const key = f.type === 'backend' || f.type === 'automated' ? `_${f.type}` : bucketKey(f.id);
    const arr = flowGroups.get(key) ?? [];
    arr.push(f);
    flowGroups.set(key, arr);
  }

  const uiFlowGroups = Array.from(flowGroups.entries()).filter(([k]) => !k.startsWith('_'));
  const backendGroup = flowGroups.get('_backend') ?? [];
  const automatedGroup = flowGroups.get('_automated') ?? [];

  // Feature stats
  const featureCounts: Record<string, number> = { done: 0, 'in-progress': 0, planned: 0 };
  for (const f of features) {
    const s = f.status ?? 'planned';
    featureCounts[s] = (featureCounts[s] ?? 0) + 1;
  }
  const flowsTested = flows.filter((f) => f.test_status === 'passing').length;
  const flowsFailing = flows.filter((f) => f.test_status === 'failing').length;
  const flowsUntested = flows.filter((f) => !f.test_status || f.test_status === 'not-tested').length;

  return (
    <div className="space-y-10">
      {/* Top: feature spec cards */}
      <section>
        <header className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Features &amp; Flows
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              What this website actually does, written as user-facing feature specs.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="count">{features.length} features</Badge>
            <Badge variant="status" tone="shipped">{featureCounts.done} done</Badge>
            <Badge variant="status" tone="building">{featureCounts['in-progress']} in-progress</Badge>
            <Badge variant="status" tone="open">{featureCounts.planned} planned</Badge>
          </div>
        </header>

        {features.length === 0 ? (
          <EmptyState title="No features captured yet" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {features.map((f) => {
              const tone = STATUS_TONE[f.status ?? 'planned'] ?? 'neutral';
              return (
                <div key={f.id} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{f.title}</h3>
                    <Badge variant="status" tone={tone}>{f.status ?? 'planned'}</Badge>
                  </div>
                  <code className="text-[10px] font-mono text-zinc-500 truncate block">{f.id}</code>
                  {f.short_description && (
                    <p className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">{f.short_description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Middle: UI flows grouped by page */}
      <section>
        <header className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              UI flows
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              One concrete clickable journey per row — mark pass / fail / report a bug inline.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="count">{flows.length} flows</Badge>
            <Badge variant="status" tone="shipped">{flowsTested} passing</Badge>
            <Badge variant="status" tone="blocked">{flowsFailing} failing</Badge>
            <Badge variant="status" tone="neutral">{flowsUntested} not-tested</Badge>
          </div>
        </header>

        <div className="space-y-6">
          {uiFlowGroups.map(([key, group]) => (
            <div key={key}>
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                {PAGE_GROUP_LABELS[key] ?? key}
              </h3>
              <ul className="space-y-2">
                {group.map((f) => (
                  <FlowTestRow
                    key={f.id}
                    projectSlug={slug}
                    flow={{
                      id: f.id,
                      title: f.title,
                      trigger: f.trigger,
                      expected_outcome: f.expected_outcome,
                      type: f.type,
                      test_status: f.test_status,
                      last_tested_date: f.last_tested_date instanceof Date ? f.last_tested_date.getTime() / 1000 : f.last_tested_date,
                    }}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom: backend + automated flows */}
      {(backendGroup.length > 0 || automatedGroup.length > 0) && (
        <section>
          <header className="mb-4">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Backend + automated flows
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Not user-clickable — verifies via API smoke tests / cron / watchers.
            </p>
          </header>
          <div className="space-y-3">
            {backendGroup.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-400">Backend</h3>
                <ul className="space-y-2">
                  {backendGroup.map((f) => (
                    <FlowTestRow
                      key={f.id}
                      projectSlug={slug}
                      flow={{
                        id: f.id, title: f.title, trigger: f.trigger, expected_outcome: f.expected_outcome,
                        type: f.type, test_status: f.test_status,
                        last_tested_date: f.last_tested_date instanceof Date ? f.last_tested_date.getTime() / 1000 : f.last_tested_date,
                      }}
                    />
                  ))}
                </ul>
              </div>
            )}
            {automatedGroup.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-400">Automated</h3>
                <ul className="space-y-2">
                  {automatedGroup.map((f) => (
                    <FlowTestRow
                      key={f.id}
                      projectSlug={slug}
                      flow={{
                        id: f.id, title: f.title, trigger: f.trigger, expected_outcome: f.expected_outcome,
                        type: f.type, test_status: f.test_status,
                        last_tested_date: f.last_tested_date instanceof Date ? f.last_tested_date.getTime() / 1000 : f.last_tested_date,
                      }}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pages reference (auxiliary) */}
      <section>
        <header className="mb-4">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Pages
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Static reference — every page declared in the project's pages table.
          </p>
        </header>
        <ul className="grid gap-2 md:grid-cols-2">
          {pages.map((p) => (
            <li key={p.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur px-4 py-2 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <code className="font-mono text-zinc-400">{p.route}</code>
                <Badge variant="tag">{p.layout_type ?? '—'}</Badge>
              </div>
              <p className="text-zinc-300 mt-1">{p.title}</p>
              {p.purpose && <p className="text-zinc-500 text-[11px] mt-0.5 line-clamp-1">{p.purpose}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
