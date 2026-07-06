'use client';

// Branded React Flow renderer for converted diagram_artifacts (#178 c, owner
// bake-off pick #175). Positions arrive pre-computed (dagre, server-side) via
// lib/diagrams/mermaid-to-flow — this component only renders. Node styling
// carries the Cyber-Den look from the winning lab prototype; scroll is never
// hijacked (no zoom/pan-on-scroll on an embedded canvas).

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { LaidOutGraph, FlowNodeKind } from '@/lib/diagrams/mermaid-to-flow';

const KIND_ACCENT: Record<FlowNodeKind, string> = {
  rect: '#a855f7',      // violet — components / steps
  decision: '#22d3ee',  // cyan — gates / branches
  store: '#f5b23c',     // amber — data stores
  rounded: '#34d399',   // emerald — endpoints / actors
};

type DiagNode = Node<{ label: string; sub?: string; group?: string; kind: FlowNodeKind; horizontal: boolean }, 'diag'>;

function DiagNodeView({ data }: NodeProps<DiagNode>) {
  const accent = KIND_ACCENT[data.kind] ?? KIND_ACCENT.rect;
  const tPos = data.horizontal ? Position.Left : Position.Top;
  const sPos = data.horizontal ? Position.Right : Position.Bottom;
  return (
    <div
      style={{
        width: 200,
        padding: '9px 12px',
        borderRadius: data.kind === 'store' ? 16 : data.kind === 'decision' ? 4 : 12,
        background: '#0f1220',
        border: `1px solid ${accent}`,
        boxShadow: `0 6px 20px rgba(0,0,0,.45), 0 0 18px -6px ${accent}`,
        color: '#e4e4e7',
      }}
    >
      <Handle type="target" position={tPos} style={{ opacity: 0, border: 0 }} />
      {data.group && (
        <div style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: '#71717a', marginBottom: 3 }}>
          {data.group}
        </div>
      )}
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, color: accent }}>{data.label}</div>
      {data.sub && <div style={{ marginTop: 3, fontSize: 11, lineHeight: 1.3, color: '#a1a1aa' }}>{data.sub}</div>}
      <Handle type="source" position={sPos} style={{ opacity: 0, border: 0 }} />
    </div>
  );
}

const nodeTypes = { diag: DiagNodeView };

export function FlowDiagramView({ graph }: { graph: LaidOutGraph }) {
  const horizontal = graph.direction === 'LR';
  const nodes: DiagNode[] = graph.nodes.map((n) => ({
    id: n.id,
    type: 'diag',
    position: graph.positions[n.id] ?? { x: 0, y: 0 },
    data: { label: n.label, sub: n.sub, group: n.group, kind: n.kind, horizontal },
  }));
  const edges: Edge[] = graph.edges.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    animated: !e.dotted,
    ...(e.bidir ? { markerStart: { type: MarkerType.ArrowClosed, color: '#6b7280', width: 16, height: 16 } } : {}),
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280', width: 16, height: 16 },
    style: e.dotted
      ? { stroke: '#52525b', strokeWidth: 1.5, strokeDasharray: '5 5' }
      : { stroke: '#52525b', strokeWidth: 1.5 },
    labelStyle: { fill: '#a1a1aa', fontSize: 10.5 },
    labelBgStyle: { fill: '#0b0c14', fillOpacity: 0.85 },
  }));

  // Height tracks the laid-out graph so small diagrams stay compact and tall
  // ones do not get crushed; hard caps keep the page scannable.
  const height = Math.min(720, Math.max(260, graph.height + 60));

  return (
    <div style={{ height }} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 overflow-hidden">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.14 }}
          minZoom={0.3}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={false}
          zoomOnScroll={false}
          preventScrolling={false}
        >
          <Background gap={22} color="#1c1c2b" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
