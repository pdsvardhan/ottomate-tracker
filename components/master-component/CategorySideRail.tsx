'use client';

// Category "side rail" (iter-15, winner 8a from the external design round).
// Replaces the wrapping category-chip row on the Components Browser with a
// sticky index beside the grid: a color-coded glyph + count per category, the
// active section highlighted as you scroll (scrollspy via IntersectionObserver),
// click-to-jump. Presentation only — the grid + sections stay server-rendered;
// the rail just observes the existing #cat-<id> section anchors.

import { useEffect, useState } from 'react';

export interface RailCat {
  id: string;
  label: string;
  count: number;
}

// Presentational glyph + hue per category (kept here, not in lib/categories.ts,
// so the taxonomy single-source stays pure data). Unknown ids fall back to a
// neutral glyph cycling the palette.
const HUES = ['var(--mag)', 'var(--cyan)', 'var(--amber)', 'var(--vio)', 'var(--coral)', '#34d399'];
const GLYPH: Record<string, string> = {
  'buttons-actions': '◇',
  cards: '▤',
  'text-type': 'Aa',
  'backgrounds-effects': '✦',
  navigation: '⇢',
  'media-galleries': '▷',
  'data-charts': '◔',
  tables: '▦',
  'feedback-progress': '◍',
  'scroll-motion': '⇕',
  layout: '▚',
  'forms-inputs': '▭',
  overlays: '◨',
  sections: '❏',
  'auth-screens': '◉',
  'dashboard-shells': '▥',
  'ai-blocks': '✳',
};

export function CategorySideRail({ cats }: { cats: RailCat[] }) {
  const [active, setActive] = useState(cats[0]?.id ?? '');

  useEffect(() => {
    const els = cats
      .map((c) => document.getElementById(`cat-${c.id}`))
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id.slice(4)); // strip "cat-"
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [cats]);

  return (
    <aside className="cat-rail hidden lg:block">
      <div className="cat-rail-h">Categories · {cats.length}</div>
      <nav className="cat-nav">
        {cats.map((c, i) => {
          const hue = HUES[i % HUES.length];
          return (
            <a
              key={c.id}
              href={`#cat-${c.id}`}
              data-active={active === c.id ? 'true' : 'false'}
              style={{ '--cg-hue': hue } as React.CSSProperties}
              onClick={() => setActive(c.id)}
            >
              <span className="cg" style={{ color: hue }}>{GLYPH[c.id] ?? '▪'}</span>
              <span className="cl">{c.label}</span>
              <span className="cc">{c.count}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
