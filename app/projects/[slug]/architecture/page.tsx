// Architecture tab — Spotlight Glass redesign + showcase overhaul.
// Renders the available diagram kinds as named, zoom/pan/fullscreen tabs.
// The ADR side-rail and the "General decisions" section were removed for the
// showcase (owner doesn't want ADRs surfaced) — the diagram area is the focus.
// Filesystem .mmd fallback retained for legacy projects.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { ArchitectureDiagrams, type DiagramGroup } from '@/components/architecture/ArchitectureDiagrams';
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

  if (byKind.size === 0) {
    return (
      <EmptyState
        title="No architecture diagrams yet"
        body="Seeds 5 starter diagrams (Process flow / System topology / Data model / User flow / API map) via INSERT INTO diagram_artifacts. Stage 2.8 skill pass populates these automatically."
      />
    );
  }

  // Build named, ordered diagram groups for the client tab switcher.
  // Known kinds first (in KIND_ORDER), then any unrecognised kinds the DB may hold.
  const knownGroups: DiagramGroup[] = KIND_ORDER
    .filter((kind) => (byKind.get(kind) ?? []).length > 0)
    .map((kind) => {
      const arr = byKind.get(kind)!;
      return {
        kind,
        label: KIND_LABELS[kind],
        desc: KIND_DESC[kind],
        legacy: arr.some((d) => d.origin === 'filesystem'),
        diagrams: arr.map((d) => ({ source: d.source, caption: d.caption })),
      };
    });

  const extraGroups: DiagramGroup[] = Array.from(byKind.entries())
    .filter(([kind]) => !(KIND_ORDER as readonly string[]).includes(kind))
    .map(([kind, arr]) => ({
      kind,
      label: kind.charAt(0).toUpperCase() + kind.slice(1),
      desc: 'Project-specific diagram.',
      legacy: arr.some((d) => d.origin === 'filesystem'),
      diagrams: arr.map((d) => ({ source: d.source, caption: d.caption })),
    }));

  const groups = [...knownGroups, ...extraGroups];

  return <ArchitectureDiagrams groups={groups} />;
}
