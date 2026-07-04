'use client';

// Count-up numeral (extracted from ProjectShowcase for reuse on the homepage
// hero stats, iter-12). Non-numeric values render as-is; honors reduced motion.

import { useEffect, useState } from 'react';

export function NumberTicker({ value }: { value: string | number }) {
  const raw = String(value);
  const m = raw.match(/^(\d+)(\D*)$/);
  const target = m ? parseInt(m[1], 10) : null;
  const suffix = m ? m[2] : '';
  const prefix = raw.startsWith('$') ? '$' : '';
  const [n, setN] = useState(target === null ? raw : `${prefix}0${suffix}`);
  useEffect(() => {
    if (target === null) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(`${prefix}${target}${suffix}`); return; }
    let raf = 0; const start = performance.now(); const dur = 1300;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setN(`${prefix}${Math.round(e * target)}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, suffix, prefix]);
  return <span className="tabular-nums">{n}</span>;
}
