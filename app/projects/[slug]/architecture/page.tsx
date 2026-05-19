// Architecture tab — reads diagrams from the diagram_artifacts DB table (new in
// iteration #5 migration 0002), with a legacy filesystem fallback for projects
// that haven't been migrated to the DB-backed flow yet.
//
// Item 28 fix (C.6): the prior version only read /repos/<slug>/architecture/*.mmd,
// which was always empty for the ottomate project itself (lives at /opt/homeserver,
// not /repos/...). Now the page works regardless of repo location, and the empty
// state is informative + actionable instead of opaque.
//
// E.6 populates ottomate's diagrams (process flow, topology, data, ux, api) into
// diagram_artifacts. ADR pairing + data-model rail also live there.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { MermaidView } from '@/components/architecture/MermaidView';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

const REPOS_DIR = process.env.OTTOMATE_REPOS_DIR ?? '/repos';

const KIND_LABELS: Record<string, string> = {
  process: 'Process flow',
  topology: 'System topology',
  data: 'Data model',
  ux: 'User flow',
  api: 'API map',
};

interface ArchDiagram {
  source: string;
  caption: string | null;
  kind: string;
  origin: 'db' | 'filesystem';
}

export default async function ArchitectureTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  // Primary path: diagram_artifacts DB rows ordered by (kind, position).
  const dbRows = db.select().from(schema.diagram_artifacts)
    .where(eq(schema.diagram_artifacts.project_slug, slug))
    .orderBy(asc(schema.diagram_artifacts.kind), asc(schema.diagram_artifacts.position))
    .all();

  let diagrams: ArchDiagram[] = dbRows.map((row) => ({
    source: row.mermaid_src,
    caption: row.caption,
    kind: row.kind,
    origin: 'db' as const,
  }));

  // Fallback: filesystem .mmd sources at /repos/<slug>/architecture/.
  if (diagrams.length === 0) {
    const archDir = path.join(REPOS_DIR, slug, 'architecture');
    try {
      const entries = readdirSync(archDir);
      const fsEntries: ArchDiagram[] = [];
      for (const name of entries) {
        if (!name.endsWith('.mmd')) continue;
        try {
          const body = readFileSync(path.join(archDir, name), 'utf8');
          fsEntries.push({
            source: body,
            caption: name,
            kind: name.replace(/\.mmd$/, ''),
            origin: 'filesystem',
          });
        } catch {
          // skip unreadable
        }
      }
      diagrams = fsEntries;
    } catch {
      // archDir doesn't exist — leave diagrams empty.
    }
  }

  if (diagrams.length === 0) {
    return (
      <EmptyState
        title="No architecture diagrams yet"
        body={`Diagrams live in the diagram_artifacts table keyed by (project_slug, kind, position). Skill seeds 5 starter diagrams (${Object.values(KIND_LABELS).join(', ')}) during Stage 2.8 architecture pass. Until then, drop .mmd files into /repos/${slug}/architecture/ as a fallback.`}
      />
    );
  }

  // Group by kind for the new section layout (lands in full with E.6).
  const byKind = new Map<string, ArchDiagram[]>();
  for (const d of diagrams) {
    const arr = byKind.get(d.kind) ?? [];
    arr.push(d);
    byKind.set(d.kind, arr);
  }

  return (
    <div className="space-y-10">
      {Array.from(byKind.entries()).map(([kind, group]) => (
        <section key={kind}>
          <header className="mb-4 flex items-baseline gap-3 flex-wrap">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              {KIND_LABELS[kind] ?? kind}
            </h2>
            <Badge variant="count">{group.length}</Badge>
            {group[0].origin === 'filesystem' && (
              <Badge variant="status" tone="open" title="Legacy filesystem-backed diagram; migrate to diagram_artifacts when convenient.">
                legacy
              </Badge>
            )}
          </header>
          <div className="space-y-6">
            {group.map((d, i) => (
              <div
                key={`${kind}-${i}`}
                className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-4"
              >
                {d.caption && (
                  <p className="text-xs text-zinc-500 mb-3 font-mono">{d.caption}</p>
                )}
                <MermaidView source={d.source} filename={d.caption ?? `${kind}-${i + 1}.mmd`} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
