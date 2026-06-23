import React from 'react';
import { Zap, Shield, Rocket, Star, Home, Search, Bell, Settings } from 'lucide-react';

// Demo-fixture system (iter-77 item 269).
//
// Most catalog components are wrappers/primitives/prop-driven and render NOTHING
// when mounted bare. To make them show real content in the preview sandbox we
// inject either (a) generic demo children for components that render `children`,
// (b) curated props from the `overrides` map for prop-driven components, or
// (c) a sized relative wrapper (`wrap`) for background-effect components that
// only fill their parent.
//
// `fixtureFor(id)` is called by the generated build entry.

const box = (label: string, i: number, extra: React.CSSProperties = {}): React.ReactElement =>
  React.createElement('div', {
    key: i,
    style: {
      padding: '14px 18px', borderRadius: 12, color: '#e4e4e7',
      background: 'rgba(63,63,70,0.45)', border: '1px solid rgba(113,113,122,0.45)',
      fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: 500, minWidth: 120, ...extra,
    },
  }, label);

/** Representative children for wrapper components (marquee, list, dock, bento…). */
export function genericChildren(): React.ReactNode {
  return [box('Alpha', 0), box('Bravo', 1), box('Charlie', 2), box('Delta', 3)];
}

// Sample data.
const SERIES = [12, 19, 7, 25, 16, 31, 22, 28, 14, 33, 21, 27, 18, 24, 30, 15, 26, 20];
const DAYS = Array.from({ length: 60 }, (_, i) => ({ date: `2026-${String(1 + (i % 6)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`, count: (i * 7) % 9 }));
const NAV = [
  { name: 'Home', link: '#', label: 'Home', href: '#', title: 'Home', icon: React.createElement(Home, { className: 'h-4 w-4' }) },
  { name: 'Search', link: '#', label: 'Search', href: '#', title: 'Search', icon: React.createElement(Search, { className: 'h-4 w-4' }) },
  { name: 'Alerts', link: '#', label: 'Alerts', href: '#', title: 'Alerts', icon: React.createElement(Bell, { className: 'h-4 w-4' }) },
  { name: 'Settings', link: '#', label: 'Settings', href: '#', title: 'Settings', icon: React.createElement(Settings, { className: 'h-4 w-4' }) },
];
const TIERS = [
  { name: 'Starter', price: '$0', features: ['1 project', 'Community support', 'Basic analytics'] },
  { name: 'Pro', price: '$12', features: ['Unlimited projects', 'Priority support', 'Advanced analytics'] },
  { name: 'Team', price: '$49', features: ['Everything in Pro', 'SSO', 'Audit log'] },
];
const FEATURES = [
  { icon: Zap, title: 'Fast', description: 'Bundled with esbuild for instant previews.' },
  { icon: Shield, title: 'Safe', description: 'Isolated iframes, no app context leakage.' },
  { icon: Rocket, title: 'Scalable', description: 'One build covers the whole catalog.' },
  { icon: Star, title: 'Polished', description: 'Real renders, not red boxes.' },
];

type Fixture = { props?: Record<string, unknown>; children?: React.ReactNode; wrap?: boolean };

export const overrides: Record<string, Fixture> = {
  // dataviz
  'mc-sparkline': { props: { values: SERIES }, children: null, wrap: true },
  'mc-ai-token-counter': { props: { used: 740, limit: 1000 }, children: null },
  'mc-relative-time': { props: { time: new Date(Date.now() - 3600_000) }, children: null },
  'mc-typing-animation': { children: 'Typed inline by a real bundler' },
  'mc-radial-donut': { props: { segments: [{ value: 68, color: '#22d3ee', label: 'Done' }, { value: 32, color: '#3f3f46', label: 'Left' }], size: 180 }, children: null },
  'mc-chart-bar': { props: { data: SERIES.slice(0, 6).map((v, i) => ({ label: `M${i + 1}`, v })), series: [{ key: 'v', label: 'Value', color: '#22d3ee' }] }, children: null },
  'mc-contribution-graph': { props: { data: DAYS }, children: null },
  'mc-chart-calendar-heatmap': { props: { values: DAYS }, children: null },
  // widgets
  'mc-animated-number': { props: { value: 1234 }, children: null },
  'mc-number-ticker': { props: { value: 2026 }, children: null },
  'mc-animated-circular-progress': { props: { value: 72, max: 100, min: 0 }, children: null },
  'mc-pricing-table': { props: { tiers: TIERS }, children: null },
  'mc-feature-grid': { props: { features: FEATURES, columns: 2 }, children: null },
  'mc-hero-video-dialog': { props: { videoSrc: 'https://www.youtube.com/embed/dQw4w9WgXcQ', thumbnailSrc: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600', thumbnailAlt: 'Demo' }, children: null },
  // nav
  'mc-breadcrumbs': { props: { items: [{ label: 'Home', href: '#' }, { label: 'Projects', href: '#' }, { label: 'Ottomate' }] }, children: null },
  'mc-floating-dock': { props: { items: NAV }, children: null },
  'mc-floating-navbar': { props: { navItems: NAV }, children: null },
  'mc-pill-nav': { props: { logo: 'https://dummyimage.com/40x40/22d3ee/0a0a0f.png&text=O', logoAlt: 'O', items: NAV, activeHref: '#' }, children: null },
  'mc-card-nav': { props: { items: NAV.map((n) => ({ ...n, links: [{ label: 'Link A', href: '#' }, { label: 'Link B', href: '#' }] })) }, children: null },
  // text effects
  'mc-word-rotate': { props: { words: ['Inline', 'Live', 'Real', 'Rendered'] }, children: null },
  'mc-text-generate-effect': { props: { words: 'Components rendered inline by a real bundler.' }, children: null },
  'mc-text-reveal': { children: 'Scroll-revealed text rendered inline in the preview sandbox.' },
  // background effects — wrap in a sized relative container so they fill it
  'mc-meteors': { wrap: true, children: null },
  'mc-particles': { wrap: true, children: null },
  'mc-dot-pattern': { wrap: true, children: null },
  'mc-retro-grid': { wrap: true, children: null },
  'mc-border-beam': { wrap: true, children: box('Card content', 0, { padding: '32px 40px' }) },
  'mc-spotlight': { wrap: true, children: null },
  'mc-animated-grid-pattern': { wrap: true, children: null },
  'mc-hero-backdrop': { wrap: true, children: null },
  'mc-grid-pattern': { wrap: true, children: null },
  'mc-ripple': { wrap: true, children: null },
  'mc-glowing-effect': { wrap: true, children: box('Hover me', 0, { padding: '32px 40px' }) },
};

export function fixtureFor(id: string): { props: Record<string, unknown>; children: React.ReactNode; wrap: boolean } {
  const o = overrides[id];
  if (!o) return { props: {}, children: genericChildren(), wrap: false };
  return { props: o.props ?? {}, children: 'children' in o ? (o.children ?? null) : genericChildren(), wrap: o.wrap ?? false };
}
