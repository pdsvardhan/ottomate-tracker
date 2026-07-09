'use client';

// Rating filter (iter-15 direct redesign from the external design round).
// Replaces the native <select> ("too simple looking") on the Components Browser
// filter bar with a custom glass dropdown: grade-colored glow dots, per-grade
// counts, hover states, animated chevron. Filtering semantics are unchanged —
// picking an option navigates with the same ?quality= param the server already
// reads, so the existing server-side filter keeps working. A hidden input mirrors
// the value so submitting the search form preserves the rating too.

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface RatingCounts { any: number; A: number; B: number; C: number }

const OPTIONS = [
  { value: '', label: 'Any rating', hue: 'var(--dim)' },
  { value: 'A', label: 'Standout', hue: 'var(--cyan)' },
  { value: 'B', label: 'Solid', hue: 'var(--vio)' },
  { value: 'C', label: 'Fine', hue: 'var(--amber)' },
] as const;

export function RatingFilter({ value, counts }: { value: string; counts: RatingCounts }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];
  const countFor = (v: string) => (v === '' ? counts.any : counts[v as 'A' | 'B' | 'C']);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(v: string) {
    setOpen(false);
    const next = new URLSearchParams(params.toString());
    if (v) next.set('quality', v);
    else next.delete('quality');
    router.push('/components-browser' + (next.toString() ? '?' + next.toString() : ''));
  }

  return (
    <div ref={rootRef} className="rf">
      <input type="hidden" name="quality" value={value} />
      <button
        type="button"
        className="rf-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="rf-face">
          <span className="rf-dot" style={{ background: current.hue, boxShadow: `0 0 8px ${current.hue}` }} />
          {current.label}
        </span>
        <span className="rf-chev" data-open={open ? 'true' : 'false'} aria-hidden>▾</span>
      </button>

      {open && (
        <div className="rf-menu a-pop-in" role="listbox">
          {OPTIONS.map((o) => (
            <button
              key={o.value || 'any'}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className="rf-opt"
              data-active={o.value === value ? 'true' : 'false'}
              onClick={() => pick(o.value)}
            >
              <span className="rf-face">
                <span className="rf-dot" style={{ background: o.hue, boxShadow: `0 0 8px ${o.hue}` }} />
                {o.label}
              </span>
              <span className="rf-count mono">{countFor(o.value)}</span>
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .rf { position: relative; }
        .rf-trigger {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          min-width: 190px; cursor: pointer;
          border-radius: 12px; border: 1px solid var(--line);
          background: rgba(255,255,255,.03); color: var(--ink);
          padding: 12px 15px; font-size: var(--t-label);
          transition: border-color .25s, background .25s;
        }
        .rf-trigger:hover { border-color: color-mix(in srgb, var(--vio) 55%, transparent); }
        .rf-face { display: inline-flex; align-items: center; gap: 9px; }
        .rf-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; flex: none; }
        .rf-chev { color: var(--dim); font-size: 12px; transition: transform .25s ease; }
        .rf-chev[data-open='true'] { transform: rotate(180deg); }
        .rf-menu {
          position: absolute; z-index: 50; top: calc(100% + 8px); left: 0; right: 0; min-width: 200px;
          border-radius: 14px; border: 1px solid color-mix(in srgb, var(--vio) 40%, transparent);
          background: rgba(10,10,18,.97); backdrop-filter: blur(14px);
          box-shadow: 0 20px 60px rgba(0,0,0,.65), 0 0 30px rgba(168,85,247,.12);
          padding: 6px; display: flex; flex-direction: column; gap: 2px;
        }
        .rf-opt {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          width: 100%; cursor: pointer; text-align: left;
          border: 0; background: transparent; color: var(--mute);
          border-radius: 9px; padding: 10px 12px; font-size: var(--t-label);
          transition: background .18s, color .18s;
        }
        .rf-opt:hover { background: rgba(255,255,255,.06); color: var(--ink); }
        .rf-opt[data-active='true'] { background: rgba(255,255,255,.07); color: var(--ink); }
        .rf-count { font-size: var(--t-cap); color: var(--dim); }
      `}</style>
    </div>
  );
}
