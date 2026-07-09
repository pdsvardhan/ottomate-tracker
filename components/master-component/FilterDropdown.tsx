'use client';

// Generic glass filter dropdown (iter-16). Generalises the iter-15 rating
// dropdown so the tag filter matches the site too (owner: the native <select>
// "is not styled according to the site"). Picking an option navigates with the
// same query param the server already reads, so server-side filtering is
// unchanged; a hidden input mirrors the value so the search form preserves it.
// Long option lists (tags) get an inline search box.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface FilterOption { value: string; label: string; count?: number; hue?: string }

export function FilterDropdown({
  paramName, value, options, basePath = '/components-browser', searchable = false, minWidth = 170,
}: {
  paramName: string;
  value: string;
  options: FilterOption[];
  basePath?: string;
  searchable?: boolean;
  minWidth?: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value) ?? options[0];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value === '');
  }, [query, options]);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
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
    if (v) next.set(paramName, v);
    else next.delete(paramName);
    router.push(basePath + (next.toString() ? '?' + next.toString() : ''));
  }

  return (
    <div ref={rootRef} className="fd" style={{ minWidth }}>
      <input type="hidden" name={paramName} value={value} />
      <button type="button" className="fd-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="fd-face">
          {current?.hue && <span className="fd-dot" style={{ background: current.hue, boxShadow: `0 0 8px ${current.hue}` }} />}
          <span className="fd-label">{current?.label}</span>
        </span>
        <span className="fd-chev" data-open={open ? 'true' : 'false'} aria-hidden>▾</span>
      </button>

      {open && (
        <div className="fd-menu a-pop-in" role="listbox">
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="fd-search mono"
            />
          )}
          <div className="fd-list">
            {shown.map((o) => (
              <button
                key={o.value || 'any'}
                type="button"
                role="option"
                aria-selected={o.value === value}
                className="fd-opt"
                data-active={o.value === value ? 'true' : 'false'}
                onClick={() => pick(o.value)}
              >
                <span className="fd-face">
                  {o.hue && <span className="fd-dot" style={{ background: o.hue, boxShadow: `0 0 8px ${o.hue}` }} />}
                  <span className="fd-label">{o.label}</span>
                </span>
                {o.count !== undefined && <span className="fd-count mono">{o.count}</span>}
              </button>
            ))}
            {shown.length === 0 && <div className="fd-empty mono">no matches</div>}
          </div>
        </div>
      )}

      <style jsx>{`
        .fd { position: relative; }
        .fd-trigger {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          width: 100%; cursor: pointer;
          border-radius: 12px; border: 1px solid var(--line);
          background: rgba(255,255,255,.03); color: var(--ink);
          padding: 12px 15px; font-size: var(--t-label);
          transition: border-color .25s, background .25s;
        }
        .fd-trigger:hover { border-color: color-mix(in srgb, var(--vio) 55%, transparent); }
        .fd-face { display: inline-flex; align-items: center; gap: 9px; min-width: 0; }
        .fd-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fd-dot { width: 8px; height: 8px; border-radius: 999px; display: inline-block; flex: none; }
        .fd-chev { color: var(--dim); font-size: 12px; transition: transform .25s ease; flex: none; }
        .fd-chev[data-open='true'] { transform: rotate(180deg); }
        .fd-menu {
          position: absolute; z-index: 50; top: calc(100% + 8px); left: 0; right: 0; min-width: 200px;
          border-radius: 14px; border: 1px solid color-mix(in srgb, var(--vio) 40%, transparent);
          background: rgba(10,10,18,.97); backdrop-filter: blur(14px);
          box-shadow: 0 20px 60px rgba(0,0,0,.65), 0 0 30px rgba(168,85,247,.12);
          padding: 6px;
        }
        .fd-search {
          width: 100%; box-sizing: border-box; margin-bottom: 6px;
          border-radius: 9px; border: 1px solid var(--line); background: rgba(5,6,15,.6);
          color: var(--ink); padding: 8px 11px; font-size: var(--t-cap); outline: none;
        }
        .fd-search:focus { border-color: color-mix(in srgb, var(--cyan) 55%, transparent); }
        .fd-list { display: flex; flex-direction: column; gap: 2px; max-height: 300px; overflow-y: auto; }
        .fd-opt {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          width: 100%; cursor: pointer; text-align: left;
          border: 0; background: transparent; color: var(--mute);
          border-radius: 9px; padding: 9px 12px; font-size: var(--t-label);
          transition: background .18s, color .18s;
        }
        .fd-opt:hover { background: rgba(255,255,255,.06); color: var(--ink); }
        .fd-opt[data-active='true'] { background: rgba(255,255,255,.07); color: var(--ink); }
        .fd-count { font-size: var(--t-cap); color: var(--dim); flex: none; }
        .fd-empty { padding: 10px 12px; font-size: var(--t-cap); color: var(--dim); }
      `}</style>
    </div>
  );
}
