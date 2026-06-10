// Client-side Mermaid renderer for .mmd source, wrapped in a pan/zoom/fullscreen
// viewport (react-zoom-pan-pinch). The library is client-only and this whole
// component is 'use client', so there is no SSR evaluation of it.

'use client';

import { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

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

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-md border border-zinc-700/70 bg-zinc-900/80 text-zinc-300 backdrop-blur transition-colors hover:border-cyan-700/60 hover:text-cyan-200"
    >
      {children}
    </button>
  );
}

export function MermaidView({ source, filename }: { source: string; filename: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

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

  // Esc exits fullscreen.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
        Mermaid render failed: {error}
      </div>
    );
  }

  const viewport = (full: boolean) => (
    <TransformWrapper
      minScale={0.3}
      maxScale={6}
      initialScale={1}
      centerOnInit
      wheel={{ step: 0.08 }}
      doubleClick={{ mode: 'reset' }}
    >
      {(utils: ReactZoomPanPinchRef) => (
        <div className="relative">
          {/* Controls */}
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
            <ControlButton label="Zoom in" onClick={() => utils.zoomIn()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4M11 8v6M8 11h6" /></svg>
            </ControlButton>
            <ControlButton label="Zoom out" onClick={() => utils.zoomOut()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4M8 11h6" /></svg>
            </ControlButton>
            <ControlButton label="Reset view" onClick={() => utils.resetTransform()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.36 2.64L3 8" /><path d="M3 3v5h5" /></svg>
            </ControlButton>
            <ControlButton label={full ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setFullscreen(!full)}>
              {full ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9H5V5M15 9h4V5M9 15H5v4M15 15h4v4" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
              )}
            </ControlButton>
          </div>

          <TransformComponent
            wrapperClass="!w-full"
            wrapperStyle={{ width: '100%', height: full ? 'calc(100vh - 7rem)' : '24rem', cursor: 'grab' }}
            contentClass="!w-full items-center justify-center"
          >
            <div ref={full ? undefined : ref} className="mermaid-host [&_svg]:max-w-none" />
          </TransformComponent>
        </div>
      )}
    </TransformWrapper>
  );

  return (
    <>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-xs font-mono text-zinc-400 truncate">{filename}</h4>
          <span className="text-[10px] text-zinc-600">scroll to zoom · drag to pan · dbl-click to reset</span>
        </div>
        {viewport(false)}
      </div>

      {/* Fullscreen overlay — re-renders its own copy of the SVG host */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur p-6 flex flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-sm font-mono text-zinc-300 truncate">{filename}</h4>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="rounded-md border border-zinc-700/70 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300 hover:border-cyan-700/60 hover:text-cyan-200 transition-colors"
            >
              Close (Esc)
            </button>
          </div>
          <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <FullscreenDiagram source={source} filename={filename} />
          </div>
        </div>
      )}
    </>
  );
}

// Renders an independent Mermaid SVG into the fullscreen viewport so the inline
// and fullscreen instances don't fight over the same DOM ref.
function FullscreenDiagram({
  source,
  filename,
}: {
  source: string;
  filename: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = await loadMermaid();
        const id = `mermaid-fs-${filename.replace(/\W/g, '_')}-${Date.now()}`;
        const { svg } = await mermaid.render(id, source);
        if (!cancelled && hostRef.current) hostRef.current.innerHTML = svg;
      } catch {
        // inline view already surfaces render errors
      }
    })();
    return () => { cancelled = true; };
  }, [source, filename]);

  return (
    <TransformWrapper
      minScale={0.3}
      maxScale={6}
      initialScale={1}
      centerOnInit
      wheel={{ step: 0.08 }}
      doubleClick={{ mode: 'reset' }}
    >
      <TransformComponent
        wrapperStyle={{ width: '100%', height: '100%', cursor: 'grab' }}
        contentClass="!w-full items-center justify-center"
      >
        <div ref={hostRef} className="mermaid-host [&_svg]:max-w-none" />
      </TransformComponent>
    </TransformWrapper>
  );
}
