'use client';

// Bake-off Style B — a branded React Flow canvas. Custom nodes styled in the
// Cyber-Den palette (per-type / per-actor accent + glow), animated directional
// edges. Positions are supplied by the caller (small hand-laid graphs) so no
// external layout lib is needed. Scroll/zoom-on-scroll are disabled so the
// embedded canvas never hijacks page scrolling.

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

const ACCENTS: Record<string, string> = {
  cyan: '#22d3ee',
  violet: '#a855f7',
  coral: '#fb7185',
  amber: '#f59e0b',
  emerald: '#34d399',
  dim: '#71717a',
};

export type LabNode = Node<{ label: string; sub?: string; accent: string }, 'lab'>;

function LabNodeView({ data }: NodeProps<LabNode>) {
  const accent = ACCENTS[data.accent] ?? ACCENTS.dim;
  return (
    <div
      style={{
        minWidth: 150,
        maxWidth: 214,
        padding: '9px 12px',
        borderRadius: 12,
        background: '#0f1220',
        border: `1px solid ${accent}`,
        boxShadow: `0 6px 20px rgba(0,0,0,.45), 0 0 18px -6px ${accent}`,
        color: '#e4e4e7',
        fontFamily: 'inherit',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0, border: 0 }} />
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, color: accent }}>{data.label}</div>
      {data.sub && <div style={{ marginTop: 3, fontSize: 11, lineHeight: 1.3, color: '#a1a1aa' }}>{data.sub}</div>}
      <Handle type="source" position={Position.Right} style={{ opacity: 0, border: 0 }} />
    </div>
  );
}

const nodeTypes = { lab: LabNodeView };

export function ReactFlowLab({
  nodes,
  edges,
  height = 340,
}: {
  nodes: LabNode[];
  edges: Edge[];
  height?: number;
}) {
  const styledEdges: Edge[] = edges.map((e) => ({
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280', width: 16, height: 16 },
    style: { stroke: '#52525b', strokeWidth: 1.5 },
    ...e,
  }));

  return (
    <div style={{ height }} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 overflow-hidden">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.16 }}
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
