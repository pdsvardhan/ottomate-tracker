'use client';

// Bake-off Style A — Mermaid, restyled. Same engine as the live diagrams but a
// heavier custom theme: rounded nodes, palette fills/strokes, drop-shadow glow,
// thicker curved edges, a real display font. Renders responsively (SVG scaled to
// container width) with no pan/zoom chrome — a static, prettier Mermaid.

import { useEffect, useRef, useState } from 'react';

let cached: Promise<typeof import('mermaid').default> | null = null;

async function getMermaid() {
  if (cached) return cached;
  cached = import('mermaid').then((m) => {
    m.default.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '14px',
        primaryColor: '#141626',
        primaryTextColor: '#e6e6ee',
        primaryBorderColor: '#a855f7',
        lineColor: '#6b7280',
        secondaryColor: '#0f1220',
        tertiaryColor: '#0f1220',
        clusterBkg: 'rgba(168,85,247,0.06)',
        clusterBorder: 'rgba(168,85,247,0.35)',
      },
      themeCSS: `
        .node rect, .node polygon, .node circle, .node path {
          rx: 12px; ry: 12px;
          filter: drop-shadow(0 4px 14px rgba(0,0,0,.5));
        }
        .node .label, .nodeLabel { font-weight: 600; }
        .edgePaths .path { stroke-width: 1.6px; }
        .edgeLabel, .edgeLabel p { background: #0b0e17; color: #a1a1aa; }
        .cluster rect { rx: 16px; ry: 16px; }
      `,
      flowchart: { curve: 'basis', htmlLabels: true, padding: 14, nodeSpacing: 44, rankSpacing: 54 },
      securityLevel: 'strict',
    });
    return m.default;
  });
  return cached;
}

export function MermaidLab({ source, id }: { source: string; id: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        const mermaid = await getMermaid();
        const { svg } = await mermaid.render(`lab-${id}-${Date.now()}`, source);
        if (dead || !host.current) return;
        host.current.innerHTML = svg;
        const el = host.current.querySelector('svg');
        if (el) {
          el.removeAttribute('height');
          el.style.width = '100%';
          el.style.maxWidth = '100%';
          el.style.height = 'auto';
        }
      } catch (e) {
        if (!dead) setErr(String(e));
      }
    })();
    return () => {
      dead = true;
    };
  }, [source, id]);

  if (err) {
    return (
      <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
        Mermaid failed: {err}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 overflow-x-auto">
      <div ref={host} />
    </div>
  );
}
