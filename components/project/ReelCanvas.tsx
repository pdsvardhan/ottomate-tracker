'use client';

// Generic animated "demo reel" panel — drifting multi-hue light orbs on near-black.
// Project-agnostic (unlike the portfolio-specific room in the mockup); a rich
// placeholder until real media lands. Reduced-motion → single static frame.

import { useEffect, useRef } from 'react';

const HUES = ['#ff3d8b', '#a855f7', '#22d3ee', '#ff8a5b', '#f5b23c'];

export function ReelCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0;
    let H = 0;
    const resize = () => {
      const r = c.getBoundingClientRect();
      W = c.width = Math.max(1, Math.floor(r.width * dpr));
      H = c.height = Math.max(1, Math.floor(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const orbs = Array.from({ length: 7 }, (_, i) => ({
      x: 0.15 + Math.random() * 0.7,
      y: 0.15 + Math.random() * 0.7,
      r: 0.16 + Math.random() * 0.26,
      hue: HUES[i % HUES.length],
      ph: Math.random() * 6.283,
    }));

    let raf = 0;
    const t0 = performance.now();
    const draw = (now: number) => {
      ctx.fillStyle = '#05060f';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const tt = (now - t0) / 1000;
      const mind = Math.min(W, H);
      for (const o of orbs) {
        const ox = (o.x + (reduce ? 0 : Math.sin(tt * 0.28 + o.ph) * 0.05)) * W;
        const oy = (o.y + (reduce ? 0 : Math.cos(tt * 0.23 + o.ph) * 0.05)) * H;
        const rad = o.r * mind;
        const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, rad);
        grd.addColorStop(0, o.hue + '55');
        grd.addColorStop(1, o.hue + '00');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(ox, oy, rad, 0, 6.283);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 block h-full w-full" />;
}
