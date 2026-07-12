// lib/diagrams/mermaid-to-flow.ts
//
// #178 (c) React Flow rollout (adr-021 / owner bake-off pick #175).
// Parses the mermaid-flowchart SUBSET actually used by diagram_artifacts rows
// (flowchart/graph TD|LR, [] {} [( )] ( ) shapes, -->, -.->, -.label.->,
// -->|label|, & fan-out, chained edges, subgraphs flattened to a group tag)
// and lays the graph out with dagre. Anything it cannot fully parse returns
// null and the caller falls back to the Mermaid renderer — a diagram is either
// converted faithfully or not converted at all.
//
// Server-safe: pure functions, no React. dagre runs at RSC render time.

import dagre from '@dagrejs/dagre';

export type FlowNodeKind = 'rect' | 'decision' | 'store' | 'rounded';

export interface ParsedNode {
  id: string;
  label: string;
  sub?: string;
  group?: string;
  kind: FlowNodeKind;
}
export interface ParsedEdge {
  source: string;
  target: string;
  label?: string;
  dotted: boolean;
  bidir?: boolean;
}
export interface ParsedGraph {
  direction: 'TB' | 'LR';
  nodes: ParsedNode[];
  edges: ParsedEdge[];
}

export interface LaidOutGraph extends ParsedGraph {
  positions: Record<string, { x: number; y: number }>;
  width: number;
  height: number;
}

const BR_RE = /<br\s*\/?>/gi;

/** Real newlines inside quoted labels break line-based parsing — normalize to <br/>. */
function normalizeQuotedNewlines(src: string): string {
  let out = '';
  let inQuote = false;
  for (const ch of src) {
    if (ch === '"') { inQuote = !inQuote; out += ch; continue; }
    if (ch === '\n' && inQuote) { out += '<br/>'; continue; }
    out += ch;
  }
  return out;
}

function cleanLabel(raw: string): { label: string; sub?: string } {
  const text = raw.replace(/^"|"$/g, '').trim();
  const parts = text.split(BR_RE).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { label: text };
  return { label: parts[0]!, sub: parts.length > 1 ? parts.slice(1).join(' · ') : undefined };
}

const ID_RE = '[A-Za-z0-9_][A-Za-z0-9_-]*';
// Shape patterns, most specific first. [( )] before [ ], ([ ]) and (( )) before ( ).
const SHAPES: { re: RegExp; kind: FlowNodeKind }[] = [
  { re: new RegExp(`^(${ID_RE})\\[\\(([\\s\\S]*)\\)\\]$`), kind: 'store' },
  { re: new RegExp(`^(${ID_RE})\\(\\[([\\s\\S]*)\\]\\)$`), kind: 'rounded' }, // stadium
  { re: new RegExp(`^(${ID_RE})\\(\\(([\\s\\S]*)\\)\\)$`), kind: 'rounded' },
  { re: new RegExp(`^(${ID_RE})\\{([\\s\\S]*)\\}$`), kind: 'decision' },
  { re: new RegExp(`^(${ID_RE})\\[([\\s\\S]*)\\]$`), kind: 'rect' },
  { re: new RegExp(`^(${ID_RE})\\(([\\s\\S]*)\\)$`), kind: 'rounded' },
];
const BARE_RE = new RegExp(`^(${ID_RE})$`);

// Edge operators, most specific first: bidirectional (<-->), dotted-with-label
// (-.text.->), dotted (-.->), solid-with-inline-label (-- text -->), solid
// (--> / --->). Each may also carry a |label| suffix.
const EDGE_OP_RE = /(<-{2,3}>|-\.(?:[^.>]{0,80}?)\.->|-\.->|--\s[^>]*?\s-{2,3}>|-{2,3}>)(?:\s*\|([^|]*)\|)?/g;

function inlineOpLabel(op: string): string {
  if (op.startsWith('-.') && op !== '-.->') return op.slice(2, -3).trim();
  if (/^--\s/.test(op)) return op.replace(/^--\s*/, '').replace(/\s*-{2,3}>$/, '').replace(/^"|"$/g, '').trim();
  return '';
}

interface SegmentNode { id: string; def?: { label: string; sub?: string; kind: FlowNodeKind } }

/** Split a segment on '&' fan-outs, but only at bracket/quote depth 0 —
 *  labels like "Clean & normalize" must not split. */
function splitFanout(seg: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let cur = '';
  for (const ch of seg) {
    if (ch === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (ch === '[' || ch === '(' || ch === '{') depth++;
      if (ch === ']' || ch === ')' || ch === '}') depth--;
      if (ch === '&' && depth === 0) { parts.push(cur); cur = ''; continue; }
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseSegment(seg: string): SegmentNode[] | null {
  const parts = splitFanout(seg);
  if (parts.length === 0) return null;
  const out: SegmentNode[] = [];
  for (const part of parts) {
    let matched = false;
    for (const { re, kind } of SHAPES) {
      const m = part.match(re);
      if (m) {
        out.push({ id: m[1]!, def: { ...cleanLabel(m[2]!), kind } });
        matched = true;
        break;
      }
    }
    if (!matched) {
      const b = part.match(BARE_RE);
      if (!b) return null;
      out.push({ id: b[1]! });
    }
  }
  return out;
}

export function parseMermaidFlowchart(src: string): ParsedGraph | null {
  const lines = normalizeQuotedNewlines(src).split('\n');
  let direction: 'TB' | 'LR' | null = null;
  const nodes = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];
  const groupStack: string[] = [];

  const ensureNode = (s: SegmentNode) => {
    const existing = nodes.get(s.id);
    const group = groupStack.length ? groupStack[groupStack.length - 1] : undefined;
    if (existing) {
      if (s.def) {
        existing.label = s.def.label;
        existing.sub = s.def.sub;
        existing.kind = s.def.kind;
      }
      if (!existing.group && group) existing.group = group;
      return;
    }
    nodes.set(s.id, {
      id: s.id,
      label: s.def?.label ?? s.id,
      sub: s.def?.sub,
      kind: s.def?.kind ?? 'rect',
      group,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    const dir = line.match(/^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/);
    if (dir) {
      const d = dir[1]!;
      direction = d === 'LR' || d === 'RL' ? 'LR' : 'TB';
      continue;
    }
    if (/^(?:flowchart|graph)\b/.test(line)) { direction = 'TB'; continue; }

    const sg = line.match(/^subgraph\s+(.+)$/);
    if (sg) {
      // subgraph ID["Title"] | subgraph ID[Title] | subgraph Title
      const body = sg[1]!.trim();
      const withId = body.match(new RegExp(`^(?:${ID_RE})\\[([\\s\\S]*)\\]$`));
      const title = withId ? cleanLabel(withId[1]!).label : cleanLabel(body).label;
      groupStack.push(title);
      continue;
    }
    if (/^end$/.test(line)) { groupStack.pop(); continue; }
    if (/^direction\s+(TD|TB|LR|RL|BT)$/.test(line)) continue; // subgraph-local direction — layout keeps the global one

    // Split the line into node segments separated by edge operators.
    EDGE_OP_RE.lastIndex = 0;
    const segs: string[] = [];
    const ops: { dotted: boolean; label?: string; bidir?: boolean }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = EDGE_OP_RE.exec(line))) {
      segs.push(line.slice(last, m.index).trim());
      const op = m[1]!;
      const dotted = op.startsWith('-.');
      const bidir = op.startsWith('<');
      const label = (m[2] ?? inlineOpLabel(op)).replace(/^"|"$/g, '').trim() || undefined;
      ops.push({ dotted, label, bidir });
      last = m.index + m[0].length;
    }
    segs.push(line.slice(last).trim());

    if (ops.length === 0) {
      // standalone node definition line
      const seg = parseSegment(line);
      if (!seg || seg.length !== 1 || !seg[0]!.def) return null; // unknown statement → bail
      ensureNode(seg[0]!);
      continue;
    }

    const parsedSegs = segs.map(parseSegment);
    if (parsedSegs.some((s) => s === null)) return null;
    for (const s of parsedSegs as SegmentNode[][]) s.forEach(ensureNode);
    for (let i = 0; i < ops.length; i++) {
      const from = parsedSegs[i] as SegmentNode[];
      const to = parsedSegs[i + 1] as SegmentNode[];
      for (const f of from) for (const t of to) {
        // Self-loop annotations (X -.note.-> X) carry no structure — skip the edge.
        if (f.id === t.id) continue;
        edges.push({ source: f.id, target: t.id, label: ops[i]!.label, dotted: ops[i]!.dotted, bidir: ops[i]!.bidir });
      }
    }
  }

  // iter-65 #515: edge-less diagrams are valid when they carry group structure
  // (e.g. the API-surface map: routes grouped by stage, no arrows). They get the
  // grouped-grid layout instead of dagre. Ungrouped edge-less soups stay on the
  // Mermaid fallback — there's no structure to lay out.
  const nodeArr = Array.from(nodes.values());
  if (!direction || nodes.size < 2) return null;
  if (edges.length === 0 && !nodeArr.some((n) => n.group)) return null;
  return { direction, nodes: nodeArr, edges };
}

// ── erDiagram (iter-65 #515) ──
// Entity-relationship diagrams (the per-project data models) previously always
// fell back to the Mermaid renderer. Parses the subset in diagram_artifacts:
//   ENTITY ||--o{ OTHER : "label"     (all crow's-foot cardinality pairs)
//   ENTITY { type field PK ... }      (attribute blocks)
// Entities render as store-kind nodes with their first attributes as the sub
// line; relationships become labelled edges with a cardinality hint.

const CARD_HINT: Record<string, string> = {
  '||': '1', '|o': '0..1', 'o|': '0..1', 'o{': 'N', '}o': 'N', '|{': '1..N', '}|': '1..N', '}{': 'N',
};

export function parseMermaidErDiagram(src: string): ParsedGraph | null {
  const lines = normalizeQuotedNewlines(src).split('\n');
  if (!/^\s*erDiagram\b/.test(src.trim())) return null;
  const nodes = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];

  const ensure = (id: string) => {
    if (!nodes.has(id)) nodes.set(id, { id, label: id, kind: 'store' });
    return nodes.get(id)!;
  };

  const REL_RE = new RegExp(`^(${ID_RE})\\s+([|o}{]{2})(?:--|\\.\\.)([|o}{]{2})\\s+(${ID_RE})\\s*:\\s*(.+)$`);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!.trim();
    i++;
    if (!line || line.startsWith('%%') || /^erDiagram\b/.test(line)) continue;

    const rel = line.match(REL_RE);
    if (rel) {
      const [, a, cardA, cardB, b, rawLabel] = rel;
      ensure(a!); ensure(b!);
      const hintA = CARD_HINT[cardA!] ?? '';
      const hintB = CARD_HINT[cardB!] ?? '';
      const hint = hintA && hintB ? ` ${hintA}:${hintB}` : '';
      edges.push({
        source: a!, target: b!,
        label: `${rawLabel!.replace(/^"|"$/g, '').trim()}${hint}`,
        dotted: line.includes('..'),
      });
      continue;
    }

    // single-line attribute block: ENTITY { type name type name ... }
    const inlineBlock = line.match(new RegExp(`^(${ID_RE})\\s*\\{(.+)\\}$`));
    if (inlineBlock) {
      const node = ensure(inlineBlock[1]!);
      const tokens = inlineBlock[2]!.trim().split(/\s+/);
      const fields: string[] = [];
      for (let t = 1; t < tokens.length; t += 2) fields.push(tokens[t]!); // type name pairs → names
      if (fields.length > 0) {
        node.sub = fields.slice(0, 4).join(' · ') + (fields.length > 4 ? ' · …' : '');
      }
      continue;
    }

    const block = line.match(new RegExp(`^(${ID_RE})\\s*\\{$`));
    if (block) {
      const node = ensure(block[1]!);
      const fields: string[] = [];
      while (i < lines.length && !/^\s*\}\s*$/.test(lines[i]!)) {
        const f = lines[i]!.trim();
        i++;
        if (!f || f.startsWith('%%')) continue;
        // "type name PK|FK|UK ..." → keep the name, star the keys
        const parts = f.split(/\s+/);
        if (parts.length >= 2) fields.push(/\bPK\b/.test(f) ? `${parts[1]}★` : parts[1]!);
        else if (parts.length === 1) fields.push(parts[0]!);
      }
      i++; // consume '}'
      if (fields.length > 0) {
        node.sub = fields.slice(0, 4).join(' · ') + (fields.length > 4 ? ' · …' : '');
      }
      continue;
    }

    // bare entity mention on its own line
    const bare = line.match(BARE_RE);
    if (bare) { ensure(bare[1]!); continue; }

    return null; // unknown statement → faithful conversion impossible, fall back
  }

  if (nodes.size < 2) return null;
  // ER graphs fan wide, not deep — LR keeps a 10-entity model readable inside
  // the height-capped canvas (TB rendered at min-zoom, unreadably small).
  return { direction: 'LR', nodes: Array.from(nodes.values()), edges };
}

// ── layout ──

const NODE_W = 200;
function nodeHeight(n: ParsedNode): number {
  const subLines = n.sub ? Math.ceil(n.sub.length / 30) : 0;
  return 42 + subLines * 14 + (n.group ? 16 : 0);
}

// iter-65 #515: layout for edge-less grouped graphs (e.g. API-surface maps).
// dagre with no edges piles everything into one rank; instead each group
// becomes a column with its nodes stacked, columns flowing left to right.
const COL_GAP = 36;
const ROW_GAP = 14;
const GROUP_HEAD = 34;

function layoutGroupedGrid(g: ParsedGraph): LaidOutGraph {
  const groups = new Map<string, ParsedNode[]>();
  for (const n of g.nodes) {
    const key = n.group ?? '·';
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(n);
  }
  const positions: Record<string, { x: number; y: number }> = {};
  let x = 12;
  let maxY = 0;
  for (const [, members] of groups) {
    let y = 12 + GROUP_HEAD;
    for (const n of members) {
      positions[n.id] = { x, y };
      y += nodeHeight(n) + ROW_GAP;
    }
    maxY = Math.max(maxY, y);
    x += NODE_W + COL_GAP;
  }
  return { ...g, positions, width: x - COL_GAP + 12, height: maxY + 12 };
}

export function layoutGraph(g: ParsedGraph): LaidOutGraph {
  if (g.edges.length === 0) return layoutGroupedGrid(g);
  const dg = new dagre.graphlib.Graph();
  dg.setGraph({ rankdir: g.direction, nodesep: 26, ranksep: g.direction === 'LR' ? 70 : 54, marginx: 12, marginy: 12 });
  dg.setDefaultEdgeLabel(() => ({}));
  for (const n of g.nodes) dg.setNode(n.id, { width: NODE_W, height: nodeHeight(n) });
  for (const e of g.edges) dg.setEdge(e.source, e.target);
  dagre.layout(dg);

  const positions: Record<string, { x: number; y: number }> = {};
  let maxX = 0; let maxY = 0;
  for (const n of g.nodes) {
    const p = dg.node(n.id);
    positions[n.id] = { x: p.x - NODE_W / 2, y: p.y - p.height / 2 };
    maxX = Math.max(maxX, p.x + NODE_W / 2);
    maxY = Math.max(maxY, p.y + p.height / 2);
  }
  return { ...g, positions, width: maxX, height: maxY };
}

/** One-call convenience: parse + layout, or null (caller falls back to Mermaid). */
export function mermaidToFlow(src: string): LaidOutGraph | null {
  try {
    const parsed = /^\s*erDiagram\b/.test(src.trim())
      ? parseMermaidErDiagram(src)   // iter-65 #515: data models convert too
      : parseMermaidFlowchart(src);
    return parsed ? layoutGraph(parsed) : null;
  } catch {
    return null;
  }
}
