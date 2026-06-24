import React from 'react';
import { z } from 'zod';
import { Star, Film, Clapperboard } from 'lucide-react';

// iter-36 — salvage fixtures for the 19 app-extracted 'review' components.
//
// Shape per entry: { props?, children?, wrap?, theme? }. The build renders
// React.createElement(Cmp, props, children); wrap:true puts it in a 600x320
// relative box; theme:'light' flips the iframe to a white bg.
//
// NOTES on hard limitations (documented inline, fixtures still supplied):
//  - The catalog `@/components/icons` shim aliases to lucide-react, whose icons
//    are PascalCase (XCircle, PlusCircle, Calendar) and which has no `Github`.
//    The source components reference LOWERCASE custom icons (Icons.github,
//    Icons.xCircle, Icons.plusCircle, Icons.calendar) that resolve to
//    `undefined` -> React "element type is invalid" crash. This affects
//    mc-auth-oauth-github and all three mc-filter-* (their trigger-button icon
//    is on the default render path). Not fixable from this file (shim-only).
//  - Components that call useFormContext()/useSidebar() at the top level need an
//    ancestor provider that the build's render harness cannot inject (it only
//    feeds props/children). Affects mc-form-autosave and mc-sidebar-shadcn.
//  - mc-ai-code-block: the build auto-picks the FIRST function export, which is
//    the `highlightCode` helper, not the `CodeBlock` component. Props are still
//    set for CodeBlock; it will paint empty until the export-pick is corrected.

/* ------------------------------------------------------------------ helpers */

// Minimal TanStack-Table `Column` stand-in for the data-table filters. Holds an
// internal filter value via a closure so the filters have a coherent column.
function reviewMockColumn(opts: {
  value?: unknown;
  faceted?: [number, number];
  meta?: Record<string, unknown>;
} = {}): any {
  let filterValue: unknown = opts.value;
  return {
    id: 'demo',
    getFilterValue: () => filterValue,
    setFilterValue: (v: unknown) => {
      filterValue = typeof v === 'function' ? (v as any)(filterValue) : v;
    },
    getFacetedMinMaxValues: () => opts.faceted ?? [0, 100],
    getFacetedUniqueValues: () => new Map(),
    columnDef: { meta: opts.meta ?? {} },
  };
}

const reviewCast = [
  { id: 1, name: 'Ada Vega', character: 'Cmdr. Ada Vega', profileUrl: 'https://i.pravatar.cc/120?img=5', order: 0 },
  { id: 2, name: 'Milo Hart', character: 'Dr. Milo Hart', profileUrl: 'https://i.pravatar.cc/120?img=12', order: 1 },
  { id: 3, name: 'Renée Cole', character: 'Pilot Renée Cole', profileUrl: 'https://i.pravatar.cc/120?img=32', order: 2 },
  { id: 4, name: 'Theo Park', character: 'Engineer Theo Park', profileUrl: 'https://i.pravatar.cc/120?img=15', order: 3 },
  { id: 5, name: 'Iris Wong', character: 'Navigator Iris Wong', profileUrl: 'https://i.pravatar.cc/120?img=47', order: 4 },
  { id: 6, name: 'Sam Okoye', character: 'Capt. Sam Okoye', profileUrl: null, order: 5 },
];

const reviewFacetOptions = [
  { label: 'Action', value: 'action', count: 128 },
  { label: 'Drama', value: 'drama', count: 96, icon: Film },
  { label: 'Sci-Fi', value: 'scifi', count: 64, icon: Clapperboard },
  { label: 'Comedy', value: 'comedy', count: 51 },
  { label: 'Thriller', value: 'thriller', count: 33 },
];

const reviewQuality = {
  resolution: '2160p' as const,
  hdr: 'DV' as const,
  audio: 'Atmos' as const,
  source: 'REMUX' as const,
};

const reviewCode = [
  'export async function getUser(id: string) {',
  '  const res = await fetch(`/api/users/${id}`);',
  '  if (!res.ok) throw new Error("not found");',
  '  return res.json();',
  '}',
].join('\n');

// react-hook-form render-prop demo body for FormWrapper.
function reviewFormBody(): (methods: any) => React.ReactNode {
  return (methods: any) => (
    <div className="flex w-80 flex-col gap-3">
      <label className="text-sm font-medium text-zinc-800">Project name</label>
      <input
        {...methods.register('name')}
        defaultValue="Ottomate"
        className="h-9 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-indigo-500"
        placeholder="Acme Inc."
      />
      <label className="text-sm font-medium text-zinc-800">Email</label>
      <input
        {...methods.register('email')}
        defaultValue="team@ottomate.dev"
        className="h-9 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-indigo-500"
        placeholder="you@example.com"
      />
      <button
        type="submit"
        className="mt-1 h-9 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Save changes
      </button>
    </div>
  );
}

// items + renderer for ListReorder
const reviewListItems = [
  { id: 'a', label: 'Draft the brief' },
  { id: 'b', label: 'Review wireframes' },
  { id: 'c', label: 'Build the prototype' },
  { id: 'd', label: 'Ship to staging' },
];
function reviewListRender(item: { id: string; label: string }, i: number): React.ReactNode {
  return (
    <div className="mb-2 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-sm">
      <span className="flex size-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-semibold text-indigo-700">
        {i + 1}
      </span>
      <span className="text-sm font-medium text-zinc-800">{item.label}</span>
      <span className="ml-auto cursor-grab text-zinc-400">⠿</span>
    </div>
  );
}

// stateofus DesignClient demo data (renders filter bar + slot grid; no fetch
// happens unless a slot drawer is opened).
const reviewSouComponents = [
  { id: 1, page_id: 'home', project_slug: 'stateofus', name: 'Hero', purpose_on_page: 'Top-of-page headline + CTA', category: 'hero', picked: 1 as const, asset_library_ref: 'mc-hero-backdrop', skip_reason: null, picked_variant: null, current_phase: 'design' },
  { id: 2, page_id: 'home', project_slug: 'stateofus', name: 'Feature grid', purpose_on_page: 'Three-up value props', category: 'features', picked: 0 as const, asset_library_ref: null, skip_reason: null, picked_variant: null, current_phase: 'design' },
  { id: 3, page_id: 'home', project_slug: 'stateofus', name: 'Footer', purpose_on_page: 'Links + legal', category: 'footer', picked: 0 as const, asset_library_ref: null, skip_reason: 'custom-implementation', picked_variant: null, current_phase: 'design' },
  { id: 4, page_id: 'about', project_slug: 'stateofus', name: 'Team carousel', purpose_on_page: 'Meet the team', category: 'carousel', picked: 0 as const, asset_library_ref: null, skip_reason: null, picked_variant: null, current_phase: 'design' },
];
const reviewSouPages = [
  { id: 'home', title: 'Home', route: '/', layout_type: 'landing' },
  { id: 'about', title: 'About', route: '/about', layout_type: 'content' },
];

/* ----------------------------------------------------------------- overrides */

export const overrides: Record<string, any> = {
  // --- vercel-ai-chatbot (shadcn primitives) ---
  // Plain <input>; supply placeholder + value. Light theme (shadcn surface).
  'mc-input-shadcn': {
    props: { placeholder: 'Search the catalog…', defaultValue: 'Ottomate', className: 'w-72' },
    children: null,
    theme: 'light',
  },
  // Plain <textarea>; placeholder + value.
  'mc-textarea-shadcn': {
    props: {
      placeholder: 'Write a message…',
      defaultValue: 'Preview fixtures render representative demo content for the Ottomate catalog.',
      className: 'w-80',
      rows: 4,
    },
    children: null,
    theme: 'light',
  },
  // Radix tooltip Root: force defaultOpen so the content portal is visible.
  // Children compose the trigger + content (Root renders them as children).
  'mc-tooltip-shadcn': {
    props: { defaultOpen: true },
    children: (
      <>
        <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">
          Hover target
        </button>
        <span className="ml-2 inline-flex w-fit items-center rounded-2xl bg-zinc-900 px-3 py-1.5 text-xs text-white">
          Tooltip content (forced open)
        </span>
      </>
    ),
    theme: 'light',
    // NOTE: Tooltip Root needs a TooltipProvider ancestor; radix tolerates its
    // absence at render time, so the trigger renders. Portal content may be
    // positioned relative to the trigger.
  },
  // shadcn Sidebar primitive. NOTE: the auto-picked export is `Sidebar`, which
  // calls useSidebar() and throws without a <SidebarProvider> ancestor that the
  // harness cannot inject. Children are a representative menu in case the picked
  // export is the provider. Best-effort.
  'mc-sidebar-shadcn': {
    props: { collapsible: 'none' },
    children: (
      <div className="flex w-64 flex-col gap-2 p-3 text-sm">
        <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Platform</div>
        {['Dashboard', 'Projects', 'Components', 'Settings'].map((t) => (
          <button key={t} className="flex h-8 items-center rounded-md px-2.5 text-left text-zinc-700 hover:bg-zinc-100">
            {t}
          </button>
        ))}
      </div>
    ),
    theme: 'light',
  },
  // Code block. NOTE: build auto-picks the first function export (`highlightCode`
  // helper) rather than `CodeBlock`, so it renders empty. Props target CodeBlock.
  'mc-ai-code-block': {
    props: { code: reviewCode, language: 'typescript', showLineNumbers: true, className: 'w-[34rem]' },
    children: null,
    theme: 'light',
  },

  // --- kiranism-shadcn ---
  // "Continue with Github" button. NOTE: source renders <Icons.github/>, but the
  // icons shim (lucide) has no lowercase `github` export -> undefined -> React
  // "element type invalid" crash. No props needed; cannot be salvaged from here.
  'mc-auth-oauth-github': {
    props: {},
    children: null,
    theme: 'light',
  },
  // Date-range data-table filter. Supply a mock TanStack column + title.
  // NOTE: trigger renders <Icons.calendar/> on the default (no-value) path ->
  // undefined icon -> crash. Mock column supplied so it'd work once shim is fixed.
  'mc-filter-date-range': {
    props: { column: reviewMockColumn(), title: 'Release date', multiple: true },
    children: null,
    theme: 'light',
  },
  // Faceted filter. Supply options + title + mock column. The Popover shim
  // renders content inline, so the command list shows.
  // NOTE: default trigger renders <Icons.plusCircle/> -> undefined icon -> crash.
  'mc-filter-faceted': {
    props: { column: reviewMockColumn(), title: 'Genre', options: reviewFacetOptions, multiple: true },
    children: null,
    theme: 'light',
  },
  // Range-slider filter. Mock column with a faceted [0,300] range + unit.
  // NOTE: default trigger renders <Icons.plusCircle/> -> undefined icon -> crash.
  'mc-filter-slider': {
    props: {
      column: reviewMockColumn({ faceted: [0, 300], meta: { range: [0, 300], unit: 'min' } }),
      title: 'Runtime',
    },
    children: null,
    theme: 'light',
  },

  // --- media-dashboard-app ---
  // Cast carousel. Carousel/Drawer/HoverCard/Avatar are inline shims; motion is
  // real. Supply a cast array. Dark (uses var(--card) etc.).
  'mc-cast-carousel': {
    props: { cast: reviewCast },
    children: null,
    theme: 'dark',
  },
  // Hero backdrop: absolute -z-10 layer; supply a picsum image. wrap:true puts it
  // in a sized box so the backdrop image fills it. Dark (black gradient overlay).
  'mc-hero-backdrop': {
    props: { src: 'https://picsum.photos/seed/ottomate-hero/1200/500' },
    wrap: true,
    children: null,
    theme: 'dark',
  },
  // Quality badges (resolution/HDR/audio/source). Supply a quality object.
  // NOTE: uses a custom `.pill` class (no app CSS here) so spacing is minimal,
  // but the color-utility classes from the style maps still apply. Dark.
  'mc-quality-badge': {
    props: { quality: reviewQuality, compact: false },
    children: null,
    theme: 'dark',
  },
  // cmdk-style palette. Force open + provide onOpenChange + empty initialQuery so
  // it shows the "Quick actions" list without hitting /api/library/search.
  // next/link + lucide are real. Dark fullscreen overlay.
  'mc-command-palette': {
    props: { open: true, onOpenChange: () => {}, initialQuery: '' },
    children: null,
    theme: 'dark',
  },

  // --- asset-library ---
  // Autosave form. NOTE: calls useFormContext() unconditionally -> throws without
  // a <FormProvider> ancestor the harness can't inject. Props supplied anyway.
  'mc-form-autosave': {
    props: { debounceMs: 600, onSave: async () => {} },
    children: null,
    theme: 'light',
  },
  // Form wrapper: render-prop child receives form methods. zod schema + onSubmit
  // supplied; children is a FUNCTION (React passes it through; FormWrapper calls
  // children(methods)). Renders a real label+input+button form. Should render.
  'mc-form-wrapper': {
    props: {
      schema: z.object({ name: z.string().min(1), email: z.string().email() }),
      defaultValues: { name: 'Ottomate', email: 'team@ottomate.dev' },
      onSubmit: () => {},
      className: 'p-2',
    },
    children: reviewFormBody(),
    theme: 'light',
  },
  // Reorderable list (FLIP via framer-motion). Supply items + getKey + render.
  'mc-transition-list-reorder': {
    props: {
      items: reviewListItems,
      getKey: (it: { id: string }) => it.id,
      render: reviewListRender,
      className: 'w-80 list-none p-0',
    },
    children: null,
    theme: 'light',
  },
  // Slide-in modal. Force open:true + onOpenChange + ariaLabel + children panel.
  // position:fixed overlay covers the iframe -> visible. Light (panel bg-background).
  'mc-transition-modal-slide': {
    props: {
      open: true,
      onOpenChange: () => {},
      edge: 'right',
      ariaLabel: 'Demo panel',
    },
    children: (
      <div className="flex h-full flex-col gap-3 p-6">
        <h3 className="text-lg font-semibold text-zinc-900">Edit task</h3>
        <p className="text-sm text-zinc-500">Slide-in panel content. ESC or backdrop click closes it.</p>
        <input className="h-9 rounded-md border border-zinc-300 px-3 text-sm" defaultValue="Ship preview fixtures" />
        <button className="mt-auto h-9 rounded-md bg-indigo-600 text-sm font-medium text-white">Save</button>
      </div>
    ),
    theme: 'light',
  },
  // Validation message. Omit `name` (so useFormContext is NOT called) + supply
  // message + error tone. Renders a <p> with icon. Should render.
  'mc-validation-message': {
    props: { message: 'Email is required and must be valid.', tone: 'error' },
    children: null,
    theme: 'light',
  },

  // --- stateofus-v4 (whole-project /design island) ---
  // Primary file is DesignClient.tsx (the client island). Supply components +
  // pages; it renders the filter bar + slot grid client-side. The /api fetch only
  // fires when a slot drawer is opened, so the default view renders standalone.
  // NOTE: page.tsx (the server component) cannot render standalone (needs the
  // tracker + getDesignContext); DesignClient is the salvageable half.
  'mc-stateofus-v4': {
    props: { components: reviewSouComponents, pages: reviewSouPages },
    children: null,
    theme: 'light',
  },
};
