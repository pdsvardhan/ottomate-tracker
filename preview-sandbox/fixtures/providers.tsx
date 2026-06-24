import React, { useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';

// iter-37 — element-based fixtures for the last non-rendering catalog components.
// Merged LAST, so these OVERRIDE any earlier fixture for the same id.
//
// Shape per entry mirrors the rest of the fixture system:
//   { element?, props?, children?, wrap?, theme? }
// The build does: const node = (element != null) ? element
//                                                  : React.createElement(Cmp, props, children)
// So whenever a component needs a PROVIDER above it, React hooks/refs, or a
// composed demo, we hand the build a fully-formed `element` and it renders THAT
// instead of the bare component.
//
// Imports are by ABSOLUTE path to each component's own source file; `@/…`
// imports inside those files are resolved by the build's shim-alias plugin.

/* ── mc-tooltip-shadcn — radix tooltip needs a TooltipProvider + open state ── */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '/mnt/storage/ottomate/assets/components/mc-tooltip-shadcn/tooltip';

/* ── mc-sidebar-shadcn — needs SidebarProvider above Sidebar ── */
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '/mnt/storage/ottomate/assets/components/mc-sidebar-shadcn/sidebar';

/* ── mc-form-autosave — calls useFormContext(); needs a FormProvider ── */
import { AutosaveForm } from '/mnt/storage/ottomate/assets/components/mc-form-autosave/AutosaveForm';

/* ── mc-command-palette — force open; empty query shows actions (no fetch) ── */
import { CommandPalette } from '/mnt/storage/ottomate/assets/components/mc-command-palette/CommandPalette';

/* ── mc-elastic-slider — chakra <Icon> throws (needs ChakraProvider); pass plain icons ── */
import ElasticSlider from '/mnt/storage/ottomate/assets/components/mc-elastic-slider/ElasticSlider';

/* ── mc-file-tree — magicui Tree/Folder/File ── */
import {
  Tree,
  type TreeViewElement,
} from '/mnt/storage/ottomate/assets/components/mc-file-tree/file-tree';

/* ── mc-scroll-progress — fixed top bar at scaleX:0 without scroll ── */
import { ScrollProgress } from '/mnt/storage/ottomate/assets/components/mc-scroll-progress/scroll-progress';

/* ── mc-meteors — aceternity Meteors; paints nothing bare ── */
import { Meteors } from '/mnt/storage/ottomate/assets/components/mc-meteors/meteors';

/* ── mc-border-beam — magicui BorderBeam; needs a sized relative card ── */
import { BorderBeam } from '/mnt/storage/ottomate/assets/components/mc-border-beam/border-beam';

/* ── mc-glowing-effect — defaults disabled=true; needs glow + enabled ── */
import { GlowingEffect } from '/mnt/storage/ottomate/assets/components/mc-glowing-effect/glowing-effect';

/* ── mc-animated-beam — needs container + from/to refs at real elements ── */
import { AnimatedBeam } from '/mnt/storage/ottomate/assets/components/mc-animated-beam/animated-beam';

/* ───────────────────────────── demo components ───────────────────────────── */

// Form-autosave: provide a real react-hook-form context so useFormContext() works.
function FormAutosaveDemo() {
  const methods = useForm({ defaultValues: { title: 'Untitled note', body: 'Type to autosave…' } });
  return (
    <FormProvider {...methods}>
      <form className="w-[420px] space-y-3 rounded-xl border border-zinc-200 bg-white p-5 text-zinc-900">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Document title</label>
          {/* AutosaveForm watches the form and renders a live status pill */}
          <AutosaveForm onSave={async () => { await new Promise((r) => setTimeout(r, 400)); }} />
        </div>
        <input
          {...methods.register('title')}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <textarea
          {...methods.register('body')}
          rows={3}
          className="w-full resize-none rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <p className="text-xs text-zinc-400">Edits debounce-save automatically; the pill above reflects status.</p>
      </form>
    </FormProvider>
  );
}

// Animated-beam: two circles with real refs + a container ref between them.
function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const circle =
    'z-10 flex size-14 items-center justify-center rounded-full border-2 border-zinc-200 bg-white shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]';
  return (
    <div
      ref={containerRef}
      className="relative flex h-[260px] w-[460px] items-center justify-between rounded-xl border border-zinc-200 bg-white p-12"
    >
      <div ref={fromRef} className={circle}><span className="text-2xl">📥</span></div>
      <div ref={toRef} className={circle}><span className="text-2xl">🤖</span></div>
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={fromRef}
        toRef={toRef}
        duration={3}
        gradientStartColor="#a97cf8"
        gradientStopColor="#f38cb8"
      />
    </div>
  );
}

// File-tree: a small, pre-expanded source tree built from `elements`.
const fileTreeElements: TreeViewElement[] = [
  {
    id: 'src',
    name: 'src',
    children: [
      {
        id: 'components',
        name: 'components',
        children: [
          { id: 'button', name: 'Button.tsx' },
          { id: 'card', name: 'Card.tsx' },
        ],
      },
      {
        id: 'lib',
        name: 'lib',
        children: [{ id: 'utils', name: 'utils.ts' }],
      },
      { id: 'app', name: 'App.tsx' },
      { id: 'main', name: 'main.tsx' },
    ],
  },
  { id: 'pkg', name: 'package.json' },
  { id: 'readme', name: 'README.md' },
];

/* ─────────────────────────────── overrides ──────────────────────────────── */

export const overrides: Record<string, any> = {
  'mc-tooltip-shadcn': {
    theme: 'light',
    element: (
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger asChild>
            <button className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm">
              Hover me
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Add to library</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },

  'mc-sidebar-shadcn': {
    theme: 'light',
    element: (
      <div className="h-[420px] w-[280px] overflow-hidden rounded-xl border border-zinc-200">
        <SidebarProvider>
          <Sidebar collapsible="none" className="h-full">
            <SidebarHeader>
              <div className="px-2 py-1.5 text-sm font-semibold text-zinc-900">Ottomate</div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Library</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive>🎬 Movies</SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>📺 TV Shows</SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>🎵 Music</SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>📚 Books</SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>System</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton>⚙️ Settings</SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <div className="px-2 py-1.5 text-xs text-zinc-500">v2.4 · pdsv</div>
            </SidebarFooter>
          </Sidebar>
        </SidebarProvider>
      </div>
    ),
  },

  'mc-form-autosave': {
    theme: 'light',
    element: <FormAutosaveDemo />,
  },

  'mc-command-palette': {
    theme: 'dark',
    // Force open. With an empty query the component renders its ACTIONS list and
    // never hits /api (the fetch only fires for a non-empty debounced query).
    element: (
      <div className="relative h-[520px] w-full">
        <CommandPalette open onOpenChange={() => {}} initialQuery="" />
      </div>
    ),
  },

  'mc-elastic-slider': {
    theme: 'dark',
    // Replace the default chakra <Icon> left/right icons (which need a
    // ChakraProvider and otherwise throw "useContext is undefined") with plain
    // nodes so the slider renders standalone.
    element: (
      <div className="flex h-[200px] w-[340px] items-center justify-center">
        <ElasticSlider
          defaultValue={60}
          startingValue={0}
          maxValue={100}
          leftIcon={<span className="text-lg text-zinc-300">🔈</span>}
          rightIcon={<span className="text-lg text-zinc-300">🔊</span>}
        />
      </div>
    ),
  },

  'mc-file-tree': {
    theme: 'light',
    element: (
      <div className="h-[320px] w-[300px] rounded-xl border border-zinc-200 bg-white py-3 text-zinc-900">
        <Tree
          className="h-full"
          elements={fileTreeElements}
          initialExpandedItems={['src', 'components', 'lib']}
          initialSelectedId="app"
        />
      </div>
    ),
  },

  'mc-scroll-progress': {
    theme: 'light',
    // The bare component is a `fixed top-0` bar whose scaleX tracks page scroll,
    // so at rest (no scroll) it has zero width and paints nothing. We give it a
    // tall scrollable container AND force scaleX:1 via style so the gradient bar
    // is visible in the static preview.
    element: (
      <div className="relative h-[320px] w-[460px] overflow-y-auto rounded-xl border border-zinc-200 bg-white">
        <ScrollProgress className="!absolute h-1.5 scale-x-100" style={{ scaleX: 1 } as any} />
        <div className="space-y-4 p-6 pt-8 text-sm text-zinc-600">
          <p className="font-semibold text-zinc-900">Reading progress</p>
          <p>The gradient bar pinned to the top edge fills as the reader scrolls a page.</p>
          <div className="h-[400px] rounded-lg bg-gradient-to-b from-zinc-50 to-zinc-100" />
        </div>
      </div>
    ),
  },

  'mc-meteors': {
    theme: 'dark',
    // Meteors paint nothing on their own — they need a sized relative dark box
    // to streak across. Provide one with centered content.
    element: (
      <div className="relative flex h-[320px] w-[460px] items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <Meteors number={20} />
        <div className="relative z-10 text-center">
          <h3 className="text-xl font-semibold text-zinc-100">Meteor shower</h3>
          <p className="mt-1 text-sm text-zinc-400">Animated streaks over a dark surface</p>
        </div>
      </div>
    ),
  },

  'mc-border-beam': {
    theme: 'light',
    // A relative, rounded, sized card so the beam has a border path to trace.
    element: (
      <div className="relative w-[360px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900">
        <h3 className="text-base font-semibold">Pro plan</h3>
        <p className="mt-1 text-sm text-zinc-500">Unlimited libraries and priority sync.</p>
        <div className="mt-4 text-3xl font-bold">
          $12<span className="text-sm font-normal text-zinc-400">/mo</span>
        </div>
        <BorderBeam size={70} duration={6} colorFrom="#a97cf8" colorTo="#f38cb8" />
      </div>
    ),
  },

  'mc-glowing-effect': {
    theme: 'dark',
    // GlowingEffect defaults disabled=true (renders a hidden layer). Enable it
    // with disabled={false} + glow so the conic-gradient border is visible.
    element: (
      <div className="relative h-[220px] w-[360px] rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100">
        <GlowingEffect disabled={false} glow spread={40} proximity={64} borderWidth={2} />
        <div className="relative z-10">
          <h3 className="text-base font-semibold">Glowing card</h3>
          <p className="mt-1 text-sm text-zinc-400">An animated gradient traces the border.</p>
        </div>
      </div>
    ),
  },

  'mc-animated-beam': {
    theme: 'light',
    element: <AnimatedBeamDemo />,
  },
};
