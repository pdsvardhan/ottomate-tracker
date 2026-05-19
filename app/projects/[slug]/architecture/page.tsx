// Architecture tab — Spotlight Glass redesign (E.6 closes iteration #5 item 29).
// Renders 5 canonical diagram kinds + ADR cards anchored to each kind (per ADR-010)
// + a data-model rail (per ADR-009; conditional on has_data_layer or any data_sources).
// Filesystem .mmd fallback retained for legacy projects.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { asc, eq, isNull } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { MermaidView } from '@/components/architecture/MermaidView';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

const REPOS_DIR = process.env.OTTOMATE_REPOS_DIR ?? '/repos';

const KIND_ORDER = ['process', 'topology', 'data', 'ux', 'api'] as const;
type Kind = (typeof KIND_ORDER)[number];

const KIND_LABELS: Record<Kind, string> = {
  process: 'Process flow',
  topology: 'System topology',
  data: 'Data model',
  ux: 'User flow',
  api: 'API map',
};

const KIND_DESC: Record<Kind, string> = {
  process: 'How work moves through the pipeline.',
  topology: 'How services and storage talk to each other.',
  data: 'Core entities and their relationships.',
  ux: 'Happy-path user journey through the app.',
  api: 'API surface grouped by domain.',
};

interface ArchDiagram {
  source: string;
  caption: string | null;
  origin: 'db' | 'filesystem';
}

export default async function ArchitectureTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  // Pull DB-backed diagrams (primary path).
  const dbRows = db.select().from(schema.diagram_artifacts)
    .where(eq(schema.diagram_artifacts.project_slug, slug))
    .orderBy(asc(schema.diagram_artifacts.kind), asc(schema.diagram_artifacts.position))
    .all();

  const byKind = new Map<string, ArchDiagram[]>();
  for (const row of dbRows) {
    const arr = byKind.get(row.kind) ?? [];
    arr.push({ source: row.mermaid_src, caption: row.caption, origin: 'db' });
    byKind.set(row.kind, arr);
  }

  // Filesystem fallback for kinds not in DB.
  if (byKind.size === 0) {
    const archDir = path.join(REPOS_DIR, slug, 'architecture');
    try {
      const entries = readdirSync(archDir);
      for (const name of entries) {
        if (!name.endsWith('.mmd')) continue;
        try {
          const body = readFileSync(path.join(archDir, name), 'utf8');
          const kind = name.replace(/\.mmd$/, '').toLowerCase();
          const arr = byKind.get(kind) ?? [];
          arr.push({ source: body, caption: name, origin: 'filesystem' });
          byKind.set(kind, arr);
        } catch {
          // skip
        }
      }
    } catch {
      // archDir missing
    }
  }

  // ADRs for this project, grouped by anchored_to.
  const adrs = db.select().from(schema.adr_index)
    .where(eq(schema.adr_index.project_slug, slug))
    .orderBy(asc(schema.adr_index.id))
    .all();
  const adrsByAnchor = new Map<string, typeof adrs>();
  for (const a of adrs) {
    const key = a.anchored_to ?? 'general';
    const arr = adrsByAnchor.get(key) ?? [];
    arr.push(a);
    adrsByAnchor.set(key, arr);
  }

  // Data-model rail context: hide the data section entirely if neither flag.
  const dataConcepts = db.select().from(schema.project_data_concepts)
    .where(eq(schema.project_data_concepts.project_slug, slug)).get();
  const dataSourcesCount = db.select().from(schema.data_sources)
    .where(eq(schema.data_sources.project_slug, slug)).all().length;
  const hasDataLayer = Boolean(dataConcepts?.has_data_layer) || dataSourcesCount > 0;

  if (byKind.size === 0) {
    return (
      <EmptyState
        title="No architecture diagrams yet"
        body="Seeds 5 starter diagrams (Process flow / System topology / Data model / User flow / API map) via INSERT INTO diagram_artifacts. Stage 2.8 skill pass populates these automatically."
      />
    );
  }

  return (
    <div className="space-y-12">
      {KIND_ORDER.map((kind) => {
        const group = byKind.get(kind) ?? [];
        const adrCards = adrsByAnchor.get(kind) ?? [];
        // Hide the data section entirely when not applicable.
        if (kind === 'data' && !hasDataLayer && group.length === 0) return null;
        if (group.length === 0 && adrCards.length === 0) return null;

        return (
          <section key={kind} id={`arch-${kind}`} className="scroll-mt-20">
            <header className="mb-4">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  {KIND_LABELS[kind]}
                </h2>
                <Badge variant="count">{group.length}</Badge>
                {group.some((d) => d.origin === 'filesystem') && (
                  <Badge variant="status" tone="open" title="Legacy filesystem-backed diagram.">
                    legacy
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">{KIND_DESC[kind]}</p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                {group.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-900/60 bg-zinc-950/30 backdrop-blur p-6 text-center text-xs text-zinc-600">
                    No diagram yet for this kind — seed via{' '}
                    <code className="font-mono text-zinc-500">INSERT INTO diagram_artifacts</code>.
                  </div>
                ) : (
                  group.map((d, i) => (
                    <div key={`${kind}-${i}`} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-4">
                      {d.caption && (
                        <p className="text-xs text-zinc-500 mb-3 font-mono">{d.caption}</p>
                      )}
                      <MermaidView source={d.source} filename={d.caption ?? `${kind}-${i + 1}.mmd`} />
                    </div>
                  ))
                )}
              </div>

              {adrCards.length > 0 && (
                <aside className="space-y-3">
                  <h3 className="text-[11px] uppercase tracking-wider text-zinc-500">ADRs that shaped this</h3>
                  {adrCards.map((a) => (
                    <details key={a.id} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-xl px-4 py-3">
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-baseline justify-between gap-2">
                          <code className="text-[10px] font-mono text-zinc-500 truncate">{a.id}</code>
                          {a.status && <Badge variant="status" tone={a.status === 'accepted' ? 'shipped' : 'neutral'}>{a.status}</Badge>}
                        </div>
                        <p className="text-sm text-zinc-200 mt-1">{a.title}</p>
                        {((a.tags ?? []) as string[]).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {((a.tags ?? []) as string[]).slice(0, 4).map((t) => (
                              <Badge key={t} variant="tag">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </summary>
                      <p className="mt-3 pt-3 border-t border-zinc-800/40 text-xs text-zinc-400 font-mono">
                        body_path: {a.body_path}
                      </p>
                    </details>
                  ))}
                </aside>
              )}
            </div>
          </section>
        );
      })}

      {/* General decisions rail (ADRs with anchored_to = NULL) */}
      {(adrsByAnchor.get('general') ?? []).length > 0 && (
        <section>
          <header className="mb-4">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              General decisions
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Meta + process ADRs without a specific diagram anchor.</p>
          </header>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(adrsByAnchor.get('general') ?? []).map((a) => (
              <details key={a.id} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl px-4 py-3">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-baseline justify-between gap-2">
                    <code className="text-[10px] font-mono text-zinc-500 truncate">{a.id}</code>
                    {a.status && <Badge variant="status" tone={a.status === 'accepted' ? 'shipped' : 'neutral'}>{a.status}</Badge>}
                  </div>
                  <p className="text-sm text-zinc-200 mt-1">{a.title}</p>
                </summary>
                <p className="mt-3 pt-3 border-t border-zinc-800/40 text-xs text-zinc-400 font-mono">
                  body_path: {a.body_path}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
