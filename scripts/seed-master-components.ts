#!/usr/bin/env tsx
// Seed the master components asset library from cross-project scan.
// Source content: 06-tracker-v3-design/master-components-seed.md (15 entries from 6 projects)

import { getDb, schema } from '../lib/db/client';

const SEED_COMPONENTS = [
  {
    id: 'mc-stat-card-gradient',
    name: 'GradientStatCard',
    category: 'display' as const,
    description: 'Stat tile with gradient background, label + value + optional change indicator',
    source_paths: ['/repos/balls-of-the-bull/components/shared/StatCard.tsx', '/repos/media-dashboard/components/shared/StatCard.tsx'],
    variants: ['gradient', 'glass', 'minimal'],
    used_in_projects: ['balls-of-the-bull', 'media-dashboard'],
  },
  {
    id: 'mc-animated-number',
    name: 'AnimatedNumber',
    category: 'feedback' as const,
    description: 'Number with count-up animation; supports currency, percent, raw number',
    source_paths: ['/repos/balls-of-the-bull/components/shared/AnimatedCurrency.tsx', '/repos/media-dashboard/components/shared/AnimatedNumber.tsx', '/repos/tasks/components/fx/FlipNumber.tsx'],
    variants: ['count-up', 'flip-digits', 'currency'],
    used_in_projects: ['balls-of-the-bull', 'media-dashboard', 'tasks'],
  },
  {
    id: 'mc-command-palette',
    name: 'CommandPalette',
    category: 'overlay' as const,
    description: 'cmdk-based command palette with keyboard nav, grouped results, hotkey trigger',
    source_paths: ['/repos/media-dashboard/components/shared/CommandPalette.tsx', '/repos/tasks/components/CommandPalette.tsx'],
    variants: ['standard', 'with-search-results'],
    used_in_projects: ['media-dashboard', 'tasks'],
  },
  {
    id: 'mc-sidebar-categorized',
    name: 'CategorizedSidebar',
    category: 'layout' as const,
    description: 'Collapsible sidebar with category sections, accent bars, active route glow, priority dots',
    source_paths: ['/repos/tasks/components/Sidebar.tsx'],
    variants: ['flat', 'tree', 'with-counts'],
    used_in_projects: ['tasks'],
  },
  {
    id: 'mc-poster-tile',
    name: 'PosterTile',
    category: 'display' as const,
    description: 'Movie/album poster with title, year, status badge, hover lift',
    source_paths: ['/repos/media-dashboard/components/shared/PosterTile.tsx'],
    variants: ['movie', 'tv', 'album', 'compact'],
    used_in_projects: ['media-dashboard'],
  },
  {
    id: 'mc-hero-backdrop',
    name: 'HeroBackdrop',
    category: 'display' as const,
    description: 'Full-bleed hero image with gradient overlay, text-readable',
    source_paths: ['/repos/media-dashboard/components/detail/HeroBackdrop.tsx'],
    variants: ['gradient-down', 'gradient-up', 'full-fade', 'tonal-shift'],
    used_in_projects: ['media-dashboard'],
  },
  {
    id: 'mc-search-bar',
    name: 'SearchBar',
    category: 'input' as const,
    description: 'Text input with debounced search, results panel, fuzzy match',
    source_paths: ['/repos/cap-a/src/components/Search/SearchBar.jsx'],
    variants: ['inline', 'modal', 'autocomplete', 'with-fuse'],
    used_in_projects: ['cap-a'],
  },
  {
    id: 'mc-error-boundary',
    name: 'ErrorBoundary',
    category: 'feedback' as const,
    description: 'React error boundary with fallback UI',
    source_paths: ['/repos/cap-a/src/components/ErrorBoundary.jsx'],
    variants: ['minimal', 'with-reset', 'with-report'],
    used_in_projects: ['cap-a'],
  },
  {
    id: 'mc-loading-screen',
    name: 'LoadingScreen',
    category: 'feedback' as const,
    description: 'Full-screen loader with branding',
    source_paths: ['/repos/cap-a/src/components/LoadingScreen.jsx'],
    variants: ['minimal', 'branded', 'with-progress'],
    used_in_projects: ['cap-a'],
  },
  {
    id: 'mc-radial-donut',
    name: 'RadialDonut',
    category: 'feedback' as const,
    description: 'Circular progress indicator (percent, count)',
    source_paths: ['/repos/tasks/components/fx/RadialDonut.tsx'],
    variants: ['simple', 'animated', 'with-label'],
    used_in_projects: ['tasks'],
  },
  {
    id: 'mc-sparkline',
    name: 'Sparkline',
    category: 'display' as const,
    description: 'Tiny inline line/bar chart',
    source_paths: ['/repos/tasks/components/fx/Sparkline.tsx'],
    variants: ['line', 'bar', 'area'],
    used_in_projects: ['tasks'],
  },
  {
    id: 'mc-quality-badge',
    name: 'QualityBadge',
    category: 'display' as const,
    description: 'Media quality badge (4K/HDR/Atmos/etc)',
    source_paths: ['/repos/media-dashboard/components/shared/QualityBadge.tsx'],
    variants: ['compact', 'full', 'inline'],
    used_in_projects: ['media-dashboard'],
  },
  {
    id: 'mc-cast-carousel',
    name: 'CastCarousel',
    category: 'display' as const,
    description: 'Horizontal scrollable cast/crew grid with snap',
    source_paths: ['/repos/media-dashboard/components/detail/CastCarousel.tsx'],
    variants: ['cast', 'crew', 'photos'],
    used_in_projects: ['media-dashboard'],
  },
  {
    id: 'mc-task-drawer',
    name: 'TaskDrawer',
    category: 'overlay' as const,
    description: 'Slide-in side drawer for detail editing (markdown body + day-picker + timeline)',
    source_paths: ['/repos/tasks/components/CardDetail/Drawer.tsx'],
    variants: ['detail-only', 'with-editor', 'with-timeline'],
    used_in_projects: ['tasks'],
  },
  {
    id: 'mc-kanban-board',
    name: 'KanbanBoard',
    category: 'layout' as const,
    description: 'Drag-drop kanban board with columns, cards, @dnd-kit-powered',
    source_paths: ['/repos/tasks/components/Kanban/Board.tsx'],
    variants: ['simple', 'with-counts', 'with-add-button'],
    used_in_projects: ['tasks'],
  },
];

async function main() {
  const db = await getDb();
  let inserted = 0;
  for (const c of SEED_COMPONENTS) {
    try {
      await db.insert(schema.master_components).values({
        ...c,
        dark_light_compat: true,
        responsive: true,
      }).onConflictDoNothing({ target: schema.master_components.id });
      inserted++;
    } catch (err) {
      console.error(`Failed to insert ${c.id}:`, err);
    }
  }
  console.log(`✅ Seeded ${inserted}/${SEED_COMPONENTS.length} master components`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
