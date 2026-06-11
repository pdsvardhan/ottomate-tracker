// Architecture tab — progressive-disclosure restructure (iter-16, Doc B 2026-06-11).
// Reads top-to-bottom in documentation-layer order: Workflow (how value moves)
// → System (how it is shaped) → Platform (how it connects to the ecosystem)
// → Decisions (why it is built this way — curated adr_index entries, adr-017).
// Secondary diagrams (data / ux / api / unknown kinds) collapse under "More detail".
// Filesystem .mmd fallback retained for legacy projects.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import {
  ArchitectureView,
  type DecisionEntry,
  type DiagramSection,
} from '@/components/architecture/ArchitectureDiagrams';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

const REPOS_DIR = process.env.OTTOMATE_REPOS_DIR ?? '/repos';

// Primary layers, in documentation-layer order (Doc C L2 → L3 → L5).
const LAYERS = [
  { kind: 'process', label: 'Workflow', desc: 'How value moves through the project — trigger to output.' },
  { kind: 'topology', label: 'System', desc: 'How the system is shaped — layers and relationships.' },
  { kind: 'platform', label: 'Platform', desc: 'How this project connects to the wider ecosystem.' },
] as const;

// Secondary kinds: real diagrams, but not part of the 90-second read.
const DETAIL_META: Record<string, { label: string; desc: string }> = {
  data: { label: 'Data model', desc: 'Core entities and their relationships.' },
  ux: { label: 'User flow', desc: 'Happy-path user journey through the app.' },
  api: { label: 'API map', desc: 'API surface grouped by domain.' },
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

  // Curated decisions (Doc B layer 3): accepted, not superseded, newest first.
  const adrRows = db.select().from(schema.adr_index)
    .where(and(
      eq(schema.adr_index.project_slug, slug),
      eq(schema.adr_index.status, 'accepted'),
      isNull(schema.adr_index.superseded_by),
    ))
    .orderBy(desc(schema.adr_index.date))
    .all();

  const decisions: DecisionEntry[] = adrRows.map((d) => ({
    id: d.id,
    title: d.title,
    date: d.date instanceof Date ? d.date.toISOString().slice(0, 7) : String(d.date).slice(0, 7),
    tags: Array.isArray(d.tags) ? d.tags : [],
  }));

  if (byKind.size === 0 && decisions.length === 0) {
    return (
      <EmptyState
        title="No architecture content yet"
        body="Diagrams land via POST /api/projects/<slug>/architecture — Workflow (process), System (topology), Platform, plus data / ux / api detail kinds. Decisions land via the adr-index endpoint."
      />
    );
  }

  const toSection = (
    kind: string,
    label: string,
    desc: string,
    arr: ArchDiagram[],
  ): DiagramSection => ({
    kind,
    label,
    desc,
    legacy: arr.some((d) => d.origin === 'filesystem'),
    diagrams: arr.map((d) => ({ source: d.source, caption: d.caption })),
  });

  // Primary sections, in layer order.
  const sections: DiagramSection[] = LAYERS
    .filter((l) => (byKind.get(l.kind) ?? []).length > 0)
    .map((l) => toSection(l.kind, l.label, l.desc, byKind.get(l.kind)!));

  // Everything else collapses under "More detail" (known detail kinds first).
  const layerKinds = LAYERS.map((l) => l.kind as string);
  const detailKinds = [
    ...Object.keys(DETAIL_META).filter((k) => byKind.has(k)),
    ...Array.from(byKind.keys()).filter((k) => !layerKinds.includes(k) && !(k in DETAIL_META)),
  ];
  const details: DiagramSection[] = detailKinds.map((kind) => {
    const meta = DETAIL_META[kind] ?? {
      label: kind.charAt(0).toUpperCase() + kind.slice(1),
      desc: 'Project-specific diagram.',
    };
    return toSection(kind, meta.label, meta.desc, byKind.get(kind)!);
  });

  return <ArchitectureView sections={sections} details={details} decisions={decisions} />;
}
