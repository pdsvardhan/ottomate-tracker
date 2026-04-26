// Client-side Mermaid renderer for .mmd source files.

'use client';

import { useEffect, useRef, useState } from 'react';

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;

async function loadMermaid() {
  if (mermaidPromise) return mermaidPromise;
  mermaidPromise = import('mermaid').then((m) => {
    m.default.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        background: '#0a0a0f',
        primaryColor: '#11111c',
        primaryTextColor: '#e4e4e7',
        primaryBorderColor: '#222233',
        lineColor: '#52525b',
        textColor: '#a1a1aa',
        tertiaryColor: '#1a1a26',
        secondaryColor: '#a855f7',
      },
      securityLevel: 'strict',
    });
    return m.default;
  });
  return mermaidPromise;
}

export function MermaidView({ source, filename }: { source: string; filename: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = await loadMermaid();
        const id = `mermaid-${filename.replace(/\W/g, '_')}-${Date.now()}`;
        const { svg } = await mermaid.render(id, source);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [source, filename]);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
        Mermaid render failed: {error}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 overflow-x-auto">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-300">{filename}</h4>
      </div>
      <div ref={ref} className="mermaid-host [&_svg]:max-w-full" />
    </div>
  );
}
