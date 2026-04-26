// Client-side react-flow graph: Feature ↔ Flow ↔ Page ↔ Component (R10.5 #3).

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type Resp = {
  nodes: {
    flows: { id: string; type: 'flow'; label: string }[];
    features: { id: string; type: 'feature'; label: string }[];
    pages: { id: string; type: 'page'; label: string }[];
    components: { id: string; type: 'component'; label: string; page_id: string }[];
  };
  edges: {
    flow_features: { flow_id: string; feature_id: string }[];
    flow_pages: { flow_id: string; page_id: string }[];
    page_features: { page_id: string; feature_id: string }[];
    page_components: { page_id: string; component_id: number }[];
  };
};

const TYPE_STYLES: Record<string, { bg: string; border: string; fg: string }> = {
  flow: { bg: '#11111c', border: '#a855f7', fg: '#e9d5ff' },
  feature: { bg: '#11111c', border: '#00d4aa', fg: '#a7f3d0' },
  page: { bg: '#11111c', border: '#f59e0b', fg: '#fde68a' },
  component: { bg: '#11111c', border: '#52525b', fg: '#d4d4d8' },
};

function nodeStyle(type: string): React.CSSProperties {
  const t = TYPE_STYLES[type] ?? TYPE_STYLES.component;
  return {
    background: t.bg,
    color: t.fg,
    border: `1px solid ${t.border}`,
    borderRadius: 10,
    padding: '6px 10px',
    fontSize: 12,
    fontFamily: 'inherit',
  };
}

// Force-direct layout via simple grid by node type — no external lib.
function layout(nodes: Node[]): Node[] {
  const groups: Record<string, Node[]> = {};
  for (const n of nodes) {
    const t = (n.data?.docType as string) ?? 'component';
    if (!groups[t]) groups[t] = [];
    groups[t].push(n);
  }
  const order = ['flow', 'feature', 'page', 'component'];
  const positioned: Node[] = [];
  let x = 0;
  for (const type of order) {
    const items = groups[type] ?? [];
    items.forEach((n, i) => {
      positioned.push({ ...n, position: { x, y: i * 70 } });
    });
    x += 260;
  }
  return positioned;
}

export function GraphCanvas({ slug }: { slug: string }) {
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/graph/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d: Resp) => setData(d))
      .catch((e) => setError(String(e)));
  }, [slug]);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] };

    const all: Node[] = [];
    for (const f of data.nodes.flows) all.push({ id: f.id, data: { label: f.label, docType: 'flow' }, style: nodeStyle('flow'), position: { x: 0, y: 0 } });
    for (const f of data.nodes.features) all.push({ id: f.id, data: { label: f.label, docType: 'feature' }, style: nodeStyle('feature'), position: { x: 0, y: 0 } });
    for (const p of data.nodes.pages) all.push({ id: p.id, data: { label: p.label, docType: 'page' }, style: nodeStyle('page'), position: { x: 0, y: 0 } });
    for (const c of data.nodes.components) all.push({ id: c.id, data: { label: c.label, docType: 'component' }, style: nodeStyle('component'), position: { x: 0, y: 0 } });

    const positioned = layout(all);

    const edgeList: Edge[] = [];
    let idx = 0;
    for (const e of data.edges.flow_features) edgeList.push({ id: `ff-${idx++}`, source: e.flow_id, target: e.feature_id, style: { stroke: '#52525b' }, label: 'uses' });
    for (const e of data.edges.flow_pages) edgeList.push({ id: `fp-${idx++}`, source: e.flow_id, target: e.page_id, style: { stroke: '#52525b' }, label: 'visits' });
    for (const e of data.edges.page_features) edgeList.push({ id: `pf-${idx++}`, source: e.page_id, target: e.feature_id, style: { stroke: '#52525b' }, label: 'implements' });
    for (const e of data.edges.page_components) edgeList.push({ id: `pc-${idx++}`, source: e.page_id, target: `c-${e.component_id}`, style: { stroke: '#3f3f46' }, animated: false });
    return { nodes: positioned, edges: edgeList };
  }, [data]);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-300">
        Failed to load graph: {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-zinc-500 p-4">Loading graph…</div>;
  }

  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <p className="text-zinc-500">No nodes to display yet.</p>
        <p className="mt-1 text-xs text-zinc-600">Add flows, features, pages, or components first.</p>
      </div>
    );
  }

  return (
    <div className="h-[640px] rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="#222233" />
          <Controls />
          <MiniMap pannable zoomable nodeStrokeWidth={2} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
