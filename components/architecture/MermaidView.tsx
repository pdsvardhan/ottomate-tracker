// Client-side Mermaid renderer for .mmd source, wrapped in a pan/zoom/fullscreen
// viewport (react-zoom-pan-pinch). The library is client-only and this whole
// component is 'use client', so there is no SSR evaluation of it.
//
// iter-16: diagrams are readable by default — after render the SVG is scaled to
// fit the viewport (capped at FIT_MAX_SCALE) instead of dropping in at 1:1,
// which left large diagrams tiny. A ResizeObserver refits when the viewport
// gains size later (e.g. a diagram inside a collapsed <details> being opened),
// unless the user has already zoomed or panned by hand.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

// Don't blow small diagrams up past this when fitting.
const FIT_MAX_SCALE = 1.75;
const FIT_MARGIN_PX = 24;

function DiagramViewport({
  source,
  filename,
  height,
  idPrefix,
  fullscreenActive,
  onToggleFullscreen,
}: {
  source: string;
  filename: string;
  height: string;
  idPrefix: string;
  fullscreenActive: boolean;
  onToggleFullscreen: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const naturalSize = useRef<{ w: number; h: number } | null>(null);
  const userInteracted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // iter-13: narrow/tall diagrams no longer get the full row width (which left
  // ~80% dead space) — the viewport is sized to the diagram's own aspect.
  const [aspect, setAspect] = useState<number | null>(null);

  const fitToView = useCallback(() => {
    const utils = transformRef.current;
    const wrapperEl = utils?.instance.wrapperComponent;
    const natural = naturalSize.current;
    if (!utils || !wrapperEl || !natural || !natural.w || !natural.h) return;
    const wW = wrapperEl.clientWidth;
    const wH = wrapperEl.clientHeight;
    if (wW < 50 || wH < 50) return; // hidden (e.g. closed <details>) — observer refits later
    const scale = Math.min(
      (wW - FIT_MARGIN_PX) / natural.w,
      (wH - FIT_MARGIN_PX) / natural.h,
      FIT_MAX_SCALE,
    );
    utils.setTransform((wW - natural.w * scale) / 2, (wH - natural.h * scale) / 2, scale, 0);
  }, []);

  // Render the mermaid source into the host, then fit.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = await loadMermaid();
        const id = `${idPrefix}-${filename.replace(/\W/g, '_')}-${Date.now()}`;
        const { svg } = await mermaid.render(id, source);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svg;
        const svgEl = hostRef.current.querySelector('svg');
        // Pin the SVG to its natural (viewBox) size so fit math is exact.
        const vb = svgEl?.viewBox?.baseVal;
        if (svgEl && vb && vb.width > 0 && vb.height > 0) {
          svgEl.setAttribute('width', String(vb.width));
          svgEl.setAttribute('height', String(vb.height));
          svgEl.style.maxWidth = 'none';
          naturalSize.current = { w: vb.width, h: vb.height };
        } else if (svgEl) {
          const rect = svgEl.getBoundingClientRect();
          naturalSize.current = { w: rect.width, h: rect.height };
        }
        if (naturalSize.current && naturalSize.current.h > 0) {
          setAspect(naturalSize.current.w / naturalSize.current.h);
        }
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!cancelled) fitToView();
        }));
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [source, filename, idPrefix, fitToView]);

  // Refit when the viewport gains/changes size (details opened, window resized)
  // as long as the user hasn't taken over with manual zoom/pan.
  useEffect(() => {
    const wrapperEl = transformRef.current?.instance.wrapperComponent;
    if (!wrapperEl || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (!userInteracted.current) fitToView();
    });
    observer.observe(wrapperEl);
    return () => observer.disconnect();
  }, [fitToView]);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
        Mermaid render failed: {error}
      </div>
    );
  }

  return (
    <TransformWrapper
      ref={transformRef}
      minScale={0.2}
      maxScale={6}
      initialScale={1}
      wheel={{ step: 0.035 }}
      doubleClick={{ mode: 'reset' }}
      onZoomStart={() => { userInteracted.current = true; }}
      onPanningStart={() => { userInteracted.current = true; }}
    >
      {(utils: ReactZoomPanPinchRef) => (
        <div
          className="relative mx-auto"
          style={{
            // Fit the frame to the diagram's shape (with a small breathing
            // margin), never wider than the row. Fullscreen keeps full width.
            width: !fullscreenActive && aspect
              ? `min(100%, calc(${height} * ${(aspect * 1.12).toFixed(3)}))`
              : '100%',
          }}
        >
          {/* Controls */}
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
            <ControlButton label="Zoom in" onClick={() => { userInteracted.current = true; utils.zoomIn(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4M11 8v6M8 11h6" /></svg>
            </ControlButton>
            <ControlButton label="Zoom out" onClick={() => { userInteracted.current = true; utils.zoomOut(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4M8 11h6" /></svg>
            </ControlButton>
            <ControlButton label="Fit to view" onClick={() => { userInteracted.current = false; fitToView(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.36 2.64L3 8" /><path d="M3 3v5h5" /></svg>
            </ControlButton>
            <ControlButton label={fullscreenActive ? 'Exit fullscreen' : 'Fullscreen'} onClick={onToggleFullscreen}>
              {fullscreenActive ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9H5V5M15 9h4V5M9 15H5v4M15 15h4v4" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
              )}
            </ControlButton>
          </div>

          <TransformComponent
            wrapperClass="!w-full"
            wrapperStyle={{ width: '100%', height, cursor: 'grab' }}
          >
            <div ref={hostRef} className="mermaid-host [&_svg]:max-w-none" />
          </TransformComponent>

          {/* usage hint — inside the frame, out of the way */}
          <span className="pointer-events-none absolute bottom-2 left-3 z-10 font-mono text-[length:var(--t-cap)] text-zinc-500/80">
            scroll to zoom · drag to pan · dbl-click resets
          </span>
        </div>
      )}
    </TransformWrapper>
  );
}

export function MermaidView({ source, filename }: { source: string; filename: string }) {
  const [fullscreen, setFullscreen] = useState(false);

  // Esc exits fullscreen.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  return (
    <>
      {/* iter-13: fake window chrome dropped — a clean panel, controls overlay only */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-2">
        <DiagramViewport
          source={source}
          filename={filename}
          height="min(34rem, 70vh)"
          idPrefix="mermaid"
          fullscreenActive={false}
          onToggleFullscreen={() => setFullscreen(true)}
        />
      </div>

      {/* Fullscreen overlay — renders its own copy of the SVG host */}
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
            <DiagramViewport
              source={source}
              filename={filename}
              height="calc(100vh - 8.5rem)"
              idPrefix="mermaid-fs"
              fullscreenActive
              onToggleFullscreen={() => setFullscreen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
