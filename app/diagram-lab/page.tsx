// Diagram bake-off — cointrail rendered three ways so the owner can pick a style
// (owner ask 2026-07-06). Real content: diagram_artifacts (topology) + the
// SMS-auto-capture flow_steps. Not linked in nav — a scratch comparison page.
// Whichever style wins gets rolled out to every project + the landing infra.

import { asc, eq } from 'drizzle-orm';
import type { Edge } from '@xyflow/react';
import { getDb, schema } from '@/lib/db/client';
import { MermaidLab } from '@/components/lab/MermaidLab';
import { ReactFlowLab, type LabNode } from '@/components/lab/ReactFlowLab';
import { JourneyBespoke } from '@/components/lab/JourneyBespoke';

export const dynamic = 'force-dynamic';

// Cointrail topology re-encoded as a node/edge graph for Style B (React Flow),
// derived 1:1 from the real topology mermaid (diagram_artifacts kind=topology).
const TOPO_NODES: LabNode[] = [
  { id: 'U', type: 'lab', position: { x: 0, y: 120 }, data: { label: 'User browser', accent: 'amber' } },
  { id: 'CFT', type: 'lab', position: { x: 240, y: 120 }, data: { label: 'Cloudflare Tunnel', sub: 'no app auth — network-bound', accent: 'cyan' } },
  { id: 'PAGES', type: 'lab', position: { x: 500, y: 30 }, data: { label: 'App Router pages', sub: '/ → /cards, /expenses, /recurring', accent: 'violet' } },
  { id: 'API', type: 'lab', position: { x: 500, y: 130 }, data: { label: 'Next.js API routes', sub: 'app/api/*', accent: 'violet' } },
  { id: 'ICL', type: 'lab', position: { x: 500, y: 230 }, data: { label: 'lib/ingest.ts', sub: 'ingestFetch()', accent: 'violet' } },
  { id: 'SQL', type: 'lab', position: { x: 770, y: 130 }, data: { label: 'finance.db', sub: 'better-sqlite3 · manual entries', accent: 'coral' } },
  { id: 'ING', type: 'lab', position: { x: 770, y: 250 }, data: { label: 'ingest container', sub: 'FastAPI :8600 · source of truth', accent: 'emerald' } },
  { id: 'PHONE', type: 'lab', position: { x: 500, y: 340 }, data: { label: 'Phone SMS', sub: 'MacroDroid + Android APK', accent: 'amber' } },
];
const TOPO_EDGES: Edge[] = [
  { id: 'e1', source: 'U', target: 'CFT' },
  { id: 'e2', source: 'CFT', target: 'PAGES' },
  { id: 'e3', source: 'PAGES', target: 'API' },
  { id: 'e4', source: 'API', target: 'SQL' },
  { id: 'e5', source: 'API', target: 'ICL' },
  { id: 'e6', source: 'ICL', target: 'ING', label: 'X-API-Key' },
  { id: 'e7', source: 'PHONE', target: 'ING', label: 'SMS', animated: false, style: { strokeDasharray: '5 5', stroke: '#52525b', strokeWidth: 1.5 } },
];

function StyleTag({ letter, name, hue }: { letter: string; name: string; hue: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="grid min-w-7 place-items-center rounded-lg px-1.5 py-0.5 text-[13px] font-bold" style={{ background: hue, color: '#0a0a0f' }}>
        {letter}
      </span>
      <span className="text-sm font-semibold text-zinc-200">{name}</span>
    </div>
  );
}

export default async function DiagramLab() {
  const db = await getDb();
  const diagrams = db
    .select()
    .from(schema.diagram_artifacts)
    .where(eq(schema.diagram_artifacts.project_slug, 'cointrail'))
    .all();
  const topology = diagrams.find((d) => d.kind === 'topology');

  const steps = db
    .select()
    .from(schema.flow_steps)
    .where(eq(schema.flow_steps.flow_id, 'flow-sms-auto-capture'))
    .orderBy(asc(schema.flow_steps.sort_order))
    .all();

  // Style A flow: a Mermaid flowchart LR generated from the same steps.
  const flowMermaid =
    'flowchart LR\n' +
    steps.map((s, i) => `  N${i}["${s.action.replace(/"/g, "'")}"]`).join('\n') +
    '\n' +
    steps.slice(0, -1).map((_, i) => `  N${i} --> N${i + 1}`).join('\n');

  // Style B flow: the same steps as a horizontal React Flow.
  const flowNodes: LabNode[] = steps.map((s, i) => ({
    id: `s${i}`,
    type: 'lab',
    position: { x: i * 270, y: 0 },
    data: { label: s.action, sub: s.result, accent: s.actor === 'user' ? 'violet' : 'cyan' },
  }));
  const flowEdges: Edge[] = steps.slice(0, -1).map((_, i) => ({ id: `fe${i}`, source: `s${i}`, target: `s${i + 1}` }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold text-zinc-100">Diagram lab — cointrail</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
        The same real cointrail content, rendered three ways. Pick the style you want rolled out to every project
        and every diagram (architecture, user flows, and the landing infra graphic).
      </p>

      {/* ── USER FLOW ── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-100">User flow — “SMS transaction auto-capture”</h2>
        <p className="mt-1 text-[13px] text-zinc-500">{steps.length} steps, straight from flow_steps (actor · action · result).</p>
        <div className="mt-5 space-y-8">
          <div>
            <StyleTag letter="A" name="Mermaid, restyled" hue="#22d3ee" />
            <MermaidLab id="flow" source={flowMermaid} />
          </div>
          <div>
            <StyleTag letter="B" name="React Flow canvas" hue="#a855f7" />
            <ReactFlowLab nodes={flowNodes} edges={flowEdges} height={200} />
          </div>
          <div>
            <StyleTag letter="C" name="Bespoke journey" hue="#34d399" />
            <JourneyBespoke steps={steps} />
          </div>
        </div>
      </section>

      {/* ── SYSTEM TOPOLOGY ── */}
      <section className="mt-14">
        <h2 className="text-lg font-semibold text-zinc-100">System topology</h2>
        <p className="mt-1 text-[13px] text-zinc-500">Deployment shape — browser → tunnel → Next.js container → Ingest + SQLite.</p>
        <div className="mt-5 space-y-8">
          <div>
            <StyleTag letter="A/C" name="Mermaid, restyled" hue="#22d3ee" />
            {topology ? <MermaidLab id="topo" source={topology.mermaid_src} /> : <p className="text-sm text-zinc-500">No topology diagram found.</p>}
          </div>
          <div>
            <StyleTag letter="B" name="React Flow canvas" hue="#a855f7" />
            <ReactFlowLab nodes={TOPO_NODES} edges={TOPO_EDGES} height={430} />
          </div>
        </div>
      </section>

      <p className="mt-12 text-xs text-zinc-600">
        Not linked in nav — a scratch comparison page. Tell me the letter (A / B / C) and I&apos;ll roll it out to
        every project&apos;s architecture + flow diagrams and the landing infra graphic.
      </p>
    </div>
  );
}
