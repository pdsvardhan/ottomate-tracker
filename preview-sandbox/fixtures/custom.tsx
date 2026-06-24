import React from 'react';

// Custom Ottomate components — demo fixtures, light theme.
// mc-feature-grid and mc-pricing-table already have working fixtures in
// fixtures.tsx (inlineOverrides), so they are intentionally not re-declared here.

type CustomFixture = { props?: Record<string, unknown>; children?: React.ReactNode; wrap?: boolean; theme?: 'light' | 'dark' };

// --- SearchWithResults: provide a working async onSearch + select handlers --
type CustomResult = { id: string; title: string; subtitle?: string; href?: string };
const CUSTOM_RESULTS: CustomResult[] = [
  { id: '1', title: 'Getting started', subtitle: 'Docs · Introduction' },
  { id: '2', title: 'Installation guide', subtitle: 'Docs · Setup' },
  { id: '3', title: 'Theming & tokens', subtitle: 'Docs · Customization' },
  { id: '4', title: 'Component catalog', subtitle: 'Reference · Components' },
];
function customSearch(q: string): Promise<CustomResult[]> {
  const ql = q.toLowerCase();
  return Promise.resolve(CUSTOM_RESULTS.filter((r) => r.title.toLowerCase().includes(ql) || (r.subtitle ?? '').toLowerCase().includes(ql)));
}

// --- Demo list items reused by the two transition components ----------------
function customListItems(): React.ReactNode[] {
  const items = [
    { title: 'Deploy preview', meta: 'Vercel · 12s ago' },
    { title: 'Run test suite', meta: 'CI · 1m ago' },
    { title: 'Publish catalog', meta: 'Build · 4m ago' },
    { title: 'Sync assets', meta: 'Storage · 9m ago' },
  ];
  return items.map((it, i) => (
    <div
      key={i}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: 360, padding: '12px 16px', marginBottom: 8, borderRadius: 12,
        border: '1px solid #e4e4e7', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 14, color: '#18181b' }}>{it.title}</span>
      <span style={{ fontSize: 12, color: '#71717a' }}>{it.meta}</span>
    </div>
  ));
}

// PageTransition wraps its children in a motion.main; show a representative
// "page" body. (Upstream relies on next/navigation; if the build can mount it
// at all, this renders the transitioned page content.)
function customPageBody(): React.ReactNode {
  return (
    <div style={{ width: 380, padding: 24, borderRadius: 16, background: '#ffffff', border: '1px solid #e4e4e7' }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#18181b' }}>Dashboard</h2>
      <p style={{ marginTop: 8, marginBottom: 0, fontSize: 14, color: '#52525b' }}>
        Animated route content. Each navigation fades and slides this view into place.
      </p>
      <div style={{ marginTop: 16 }}>{customListItems().slice(0, 2)}</div>
    </div>
  );
}

export const overrides: Record<string, CustomFixture> = {
  // Search input with a working result provider (light theme).
  'mc-search-with-results': {
    props: { placeholder: 'Search docs…', onSearch: customSearch, onSelect: () => {} },
    children: null,
    theme: 'light',
  },
  // Page transition: representative page body as animated children.
  'mc-transition-page-view': {
    props: {},
    children: customPageBody(),
    theme: 'light',
  },
  // Stagger list: a few rows that animate in with a stagger.
  'mc-transition-stagger-list': {
    props: { staggerDelay: 0.06 },
    children: customListItems(),
    theme: 'light',
  },
};
