import React from 'react';
import { CheckIcon, BoldIcon, ItalicIcon, UnderlineIcon, RocketIcon, GripVerticalIcon } from 'lucide-react';

// Per-library upstream-demo ports (iter-36 Bucket A). theme: match upstream bg.
// kibo is shadcn-style -> theme:'light' for every entry.
//
// Many kibo components are compound: the preview build picks ONE host export
// (the first component-like export, via Object.values(Mod).find(isComp)) and
// renders React.createElement(host, props, children). So we (a) feed prop-driven
// hosts realistic data, and (b) for hosts that compose sub-parts, import those
// sub-parts from the component's own source by absolute path and build the
// upstream demo as `children`. The build's nodePaths + @/ + @repo/shadcn-ui
// alias plugins resolve these imports.
//
// Two hosts are blocked by factors outside this file (documented inline):
// mc-resizable (component targets react-resizable-panels v2/3 API but v4 is
// installed -> PanelGroup/PanelResizeHandle are undefined) and mc-kibo-editor
// (picked host is EditorBubbleMenu, a Tiptap menu that hides its children until
// a text selection exists). Both still bundle + mount without our own errors.

// --- sibling-part imports (resolved by the real build pipeline) --------------
import {
  BannerIcon as KBannerIcon,
  BannerTitle as KBannerTitle,
  BannerAction as KBannerAction,
  BannerClose as KBannerClose,
} from '/mnt/storage/ottomate/assets/components/mc-banner/index.tsx';
import {
  ComboboxTrigger as KComboboxTrigger,
  ComboboxContent as KComboboxContent,
  ComboboxInput as KComboboxInput,
  ComboboxList as KComboboxList,
  ComboboxEmpty as KComboboxEmpty,
  ComboboxGroup as KComboboxGroup,
  ComboboxItem as KComboboxItem,
} from '/mnt/storage/ottomate/assets/components/mc-combobox-kibo/index.tsx';
import {
  ContributionGraphCalendar as KCGCalendar,
  ContributionGraphBlock as KCGBlock,
  ContributionGraphFooter as KCGFooter,
  ContributionGraphTotalCount as KCGTotalCount,
  ContributionGraphLegend as KCGLegend,
} from '/mnt/storage/ottomate/assets/components/mc-contribution-graph/index.tsx';
import {
  RatingButton as KRatingButton,
} from '/mnt/storage/ottomate/assets/components/mc-kibo-rating/index.tsx';
import {
  StatusIndicator as KStatusIndicator,
  StatusLabel as KStatusLabel,
} from '/mnt/storage/ottomate/assets/components/mc-kibo-status/index.tsx';
import {
  TagsTrigger as KTagsTrigger,
  TagsValue as KTagsValue,
  TagsContent as KTagsContent,
  TagsInput as KTagsInput,
  TagsList as KTagsList,
  TagsEmpty as KTagsEmpty,
  TagsGroup as KTagsGroup,
  TagsItem as KTagsItem,
} from '/mnt/storage/ottomate/assets/components/mc-kibo-tags/index.tsx';
import {
  MiniCalendarNavigation as KMCNav,
  MiniCalendarDays as KMCDays,
  MiniCalendarDay as KMCDay,
} from '/mnt/storage/ottomate/assets/components/mc-mini-calendar/index.tsx';
import {
  ReelContent as KReelContent,
  ReelItem as KReelItem,
  ReelImage as KReelImage,
  ReelOverlay as KReelOverlay,
  ReelHeader as KReelHeader,
  ReelControls as KReelControls,
  ReelProgress as KReelProgress,
  ReelPreviousButton as KReelPrev,
  ReelNextButton as KReelNext,
  ReelPlayButton as KReelPlay,
  ReelMuteButton as KReelMute,
  ReelNavigation as KReelNavigation,
} from '/mnt/storage/ottomate/assets/components/mc-reel/index.tsx';
import {
  RelativeTimeZone as KRTZone,
  RelativeTimeZoneDate as KRTZoneDate,
  RelativeTimeZoneDisplay as KRTZoneDisplay,
  RelativeTimeZoneLabel as KRTZoneLabel,
} from '/mnt/storage/ottomate/assets/components/mc-relative-time/index.tsx';

// --- shared demo data --------------------------------------------------------
const kbAvatars = [1, 12, 23, 34, 45].map((n) => `https://i.pravatar.cc/100?img=${n}`);

const kbComboboxData = [
  { label: 'Next.js', value: 'next.js' },
  { label: 'SvelteKit', value: 'sveltekit' },
  { label: 'Nuxt.js', value: 'nuxt.js' },
  { label: 'Remix', value: 'remix' },
  { label: 'Astro', value: 'astro' },
];

const kbTagsData = [
  { id: 'react', label: 'React' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'nextjs', label: 'Next.js' },
  { id: 'vite', label: 'Vite' },
];
const kbSelectedTags = ['react', 'typescript'];

// Contribution graph: one year of activity, each with date/count/level.
const kbContribData = (() => {
  const out: { date: string; count: number; level: number }[] = [];
  const start = new Date('2026-01-01');
  for (let i = 0; i < 364; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const count = Math.floor((Math.sin(i / 9) + 1) * 6) + (i % 5 === 0 ? 7 : 0);
    const level = Math.min(4, Math.floor(count / 3));
    out.push({ date: d.toISOString().slice(0, 10), count, level });
  }
  return out;
})();

// Reel: image-only items so it renders headlessly without video playback.
const kbReelData = [
  { id: 1, type: 'image', src: 'https://picsum.photos/seed/reel1/450/800', duration: 5, title: 'Sunrise Ridge', description: 'Morning over the valley' },
  { id: 2, type: 'image', src: 'https://picsum.photos/seed/reel2/450/800', duration: 5, title: 'City Lights', description: 'Downtown after dark' },
  { id: 3, type: 'image', src: 'https://picsum.photos/seed/reel3/450/800', duration: 5, title: 'Coast Road', description: 'Cliffside drive' },
];

const kbNow = new Date('2026-06-24T15:30:00Z');

// --- editor demo: the picked host (EditorBubbleMenu) needs an active Tiptap
// editor + selection, so its children mount into a hidden BubbleMenu. We still
// pass a self-contained formatted-document surface (DOM-only, no editor deps).
function KEditorDemo() {
  return (
    <div className="w-[440px] rounded-lg border border-zinc-200 bg-white p-4 text-left text-zinc-800 shadow-sm">
      <div className="mb-2 flex items-center gap-0.5 rounded-md border border-zinc-200 p-1">
        <button className="rounded p-1.5 hover:bg-zinc-100" type="button"><BoldIcon size={14} /></button>
        <button className="rounded p-1.5 hover:bg-zinc-100" type="button"><ItalicIcon size={14} /></button>
        <button className="rounded p-1.5 hover:bg-zinc-100" type="button"><UnderlineIcon size={14} /></button>
        <span className="mx-1 h-5 w-px bg-zinc-200" />
        <button className="rounded px-2 py-1 text-xs hover:bg-zinc-100" type="button">H1</button>
        <button className="rounded px-2 py-1 text-xs hover:bg-zinc-100" type="button">H2</button>
      </div>
      <h2 className="mb-1 text-lg font-semibold">Project kickoff notes</h2>
      <p className="mb-2 text-sm leading-relaxed text-zinc-600">
        A rich-text editor with <strong>bold</strong>, <em>italic</em>, and slash
        commands. Type <code className="rounded bg-zinc-100 px-1">/</code> to insert blocks.
      </p>
      <ul className="ml-4 list-disc text-sm text-zinc-600">
        <li>Draft the spec</li>
        <li>Review with the team</li>
        <li>Ship the preview</li>
      </ul>
    </div>
  );
}

// --- image-crop: the picked host (Cropper) needs a real File. Build one from a
// tiny inline PNG so FileReader resolves headlessly.
function makeDemoFile(): File {
  const b64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], 'demo.png', { type: 'image/png' });
}

// --- resizable: the catalog component targets the react-resizable-panels v2/3
// API (PanelGroup / PanelResizeHandle), but v4 is installed where those names
// are undefined, so the picked host (ResizableHandle) throws regardless of what
// we pass. We supply a DOM-only resizable-layout mockup as children (no broken
// primitive imports) to represent the upstream demo.
function KResizableDemo() {
  return (
    <div className="flex h-[260px] w-[460px] overflow-hidden rounded-lg border border-zinc-200">
      <div className="flex flex-1 items-center justify-center p-6 text-sm font-medium text-zinc-700">One</div>
      <div className="flex w-px items-center justify-center bg-zinc-200">
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-zinc-300 bg-white">
          <GripVerticalIcon className="size-2.5 text-zinc-500" />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center p-6 text-sm font-medium text-zinc-700">Two</div>
        <div className="flex h-px items-center justify-center bg-zinc-200">
          <div className="z-10 flex h-3 w-4 rotate-90 items-center justify-center rounded-sm border border-zinc-300 bg-white">
            <GripVerticalIcon className="size-2.5 text-zinc-500" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-sm font-medium text-zinc-700">Three</div>
      </div>
    </div>
  );
}

// --- table: picked host is TableBody (render-prop reading a null context ->
// "No results."). Render a self-contained static data table as children.
function KTableDemo() {
  const rows = [
    { name: 'Acme Corp', status: 'Active', plan: 'Enterprise', mrr: '$4,200' },
    { name: 'Globex', status: 'Trial', plan: 'Pro', mrr: '$0' },
    { name: 'Initech', status: 'Active', plan: 'Team', mrr: '$980' },
    { name: 'Umbrella', status: 'Churned', plan: 'Pro', mrr: '$0' },
  ];
  return (
    <table className="w-[460px] border-collapse text-left text-sm text-zinc-800">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500">
          <th className="px-3 py-2 font-medium">Account</th>
          <th className="px-3 py-2 font-medium">Status</th>
          <th className="px-3 py-2 font-medium">Plan</th>
          <th className="px-3 py-2 text-right font-medium">MRR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-b border-zinc-100">
            <td className="px-3 py-2 font-medium">{r.name}</td>
            <td className="px-3 py-2">{r.status}</td>
            <td className="px-3 py-2 text-zinc-600">{r.plan}</td>
            <td className="px-3 py-2 text-right tabular-nums">{r.mrr}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Fixture = { props?: Record<string, unknown>; children?: React.ReactNode; wrap?: boolean; theme?: 'light' | 'dark' };

export const overrides: Record<string, Fixture> = {
  // AvatarStack -- host renders children (mapped into overlapping circles).
  'mc-avatar-stack': {
    props: { size: 40 },
    children: kbAvatars.map((src, i) => (
      <img key={i} alt={`User ${i + 1}`} src={src} data-slot="avatar" className="size-full rounded-full object-cover" />
    )),
    theme: 'light',
  },

  // Banner (dismissible) -- icon + message + action + close.
  'mc-banner': {
    props: { className: 'rounded-lg' },
    children: (
      <>
        <KBannerIcon icon={RocketIcon} />
        <KBannerTitle>Important message - this is a banner.</KBannerTitle>
        <KBannerAction>Learn more</KBannerAction>
        <KBannerClose />
      </>
    ),
    theme: 'light',
  },

  // Combobox -- open by default so trigger + framework list are visible.
  'mc-combobox-kibo': {
    props: { data: kbComboboxData, type: 'framework', defaultValue: 'next.js', open: true },
    children: (
      <>
        <KComboboxTrigger />
        <KComboboxContent>
          <KComboboxInput />
          <KComboboxList>
            <KComboboxEmpty />
            <KComboboxGroup>
              {kbComboboxData.map((item) => (
                <KComboboxItem key={item.value} value={item.value}>
                  {item.label}
                </KComboboxItem>
              ))}
            </KComboboxGroup>
          </KComboboxList>
        </KComboboxContent>
      </>
    ),
    theme: 'light',
  },

  // ContributionGraph -- a year of activity with calendar blocks + legend.
  'mc-contribution-graph': {
    props: { data: kbContribData },
    children: (
      <>
        <KCGCalendar>
          {({ activity, dayIndex, weekIndex }: any) => (
            <KCGBlock activity={activity} dayIndex={dayIndex} weekIndex={weekIndex} />
          )}
        </KCGCalendar>
        <KCGFooter>
          <KCGTotalCount />
          <KCGLegend />
        </KCGFooter>
      </>
    ),
    theme: 'light',
  },

  // ImageCrop -- picked host is Cropper, which needs a real File prop.
  'mc-image-crop': {
    props: { file: makeDemoFile(), aspect: 16 / 9 },
    children: null,
    theme: 'light',
  },

  // RichTextEditor -- picked host (EditorBubbleMenu) hides children in a Tiptap
  // bubble menu; we still pass a self-contained formatted-document demo.
  'mc-kibo-editor': {
    props: {},
    children: <KEditorDemo />,
    theme: 'light',
  },

  // Rating -- 5 stars, value 3 (read-only). Buttons are sibling parts.
  'mc-kibo-rating': {
    props: { defaultValue: 3, readOnly: true },
    children: Array.from({ length: 5 }, (_, i) => (
      <KRatingButton key={i} className="text-amber-500" />
    )),
    theme: 'light',
  },

  // Status -- online badge with pulsing indicator + label.
  'mc-kibo-status': {
    props: { status: 'online' },
    children: (
      <>
        <KStatusIndicator />
        <KStatusLabel />
      </>
    ),
    theme: 'light',
  },

  // DataTable -- picked host (TableBody) only yields "No results." from a null
  // context; render a self-contained static data table as children instead.
  'mc-kibo-table': {
    props: {},
    children: () => <KTableDemo />,
    theme: 'light',
  },

  // TagsInput -- trigger shows selected tags, popover open with the tag list.
  'mc-kibo-tags': {
    props: { open: true },
    children: (
      <>
        <KTagsTrigger>
          {kbSelectedTags.map((id) => {
            const t = kbTagsData.find((x) => x.id === id)!;
            return (
              <KTagsValue key={id} onRemove={() => {}}>
                {t.label}
              </KTagsValue>
            );
          })}
        </KTagsTrigger>
        <KTagsContent>
          <KTagsInput placeholder="Search tag..." />
          <KTagsList>
            <KTagsEmpty />
            <KTagsGroup>
              {kbTagsData.map((t) => (
                <KTagsItem key={t.id} value={t.id}>
                  {t.label}
                  {kbSelectedTags.includes(t.id) ? <CheckIcon className="size-4 text-emerald-500" /> : null}
                </KTagsItem>
              ))}
            </KTagsGroup>
          </KTagsList>
        </KTagsContent>
      </>
    ),
    theme: 'light',
  },

  // MiniCalendar -- prev/next navigation around a 5-day strip.
  'mc-mini-calendar': {
    props: { defaultValue: new Date('2026-06-24'), defaultStartDate: new Date('2026-06-23'), days: 5 },
    children: (
      <>
        <KMCNav direction="prev" />
        <KMCDays>
          {(date: Date) => <KMCDay key={date.toISOString()} date={date} />}
        </KMCDays>
        <KMCNav direction="next" />
      </>
    ),
    theme: 'light',
  },

  // Reel -- a vertical story reel (TikTok / Instagram-style): autoplaying
  // segmented progress bars at the top, image items that auto-advance, tap
  // zones for prev/next, and play/mute controls. autoPlay drives the visible
  // animation (progress fill + slide change); ReelProgress renders the bars.
  'mc-reel': {
    props: { data: kbReelData, autoPlay: true, className: 'h-[440px] rounded-xl' },
    children: (
      <>
        <KReelContent>
          {(item: any) => (
            <KReelItem key={item.id}>
              <KReelImage src={item.src} alt={item.title} />
            </KReelItem>
          )}
        </KReelContent>
        <KReelProgress />
        <KReelOverlay>
          <KReelHeader>
            <div className="flex items-center gap-2 text-white">
              <span className="flex size-8 items-center justify-center rounded-full bg-white/25 text-xs font-semibold backdrop-blur">SR</span>
              <span className="text-sm font-semibold drop-shadow">storyreel</span>
            </div>
          </KReelHeader>
          <KReelNavigation>
            <KReelPrev />
            <KReelNext />
          </KReelNavigation>
          <KReelControls>
            <KReelPlay />
            <KReelMute />
          </KReelControls>
        </KReelOverlay>
      </>
    ),
    theme: 'light',
  },

  // RelativeTime -- multiple time zones with date + clock.
  'mc-relative-time': {
    props: { time: kbNow },
    children: (
      <>
        <KRTZone zone="America/New_York">
          <KRTZoneLabel>EST</KRTZoneLabel>
          <KRTZoneDate />
          <KRTZoneDisplay />
        </KRTZone>
        <KRTZone zone="Europe/London">
          <KRTZoneLabel>GMT</KRTZoneLabel>
          <KRTZoneDate />
          <KRTZoneDisplay />
        </KRTZone>
        <KRTZone zone="Asia/Tokyo">
          <KRTZoneLabel>JST</KRTZoneLabel>
          <KRTZoneDate />
          <KRTZoneDisplay />
        </KRTZone>
      </>
    ),
    theme: 'light',
  },

  // Resizable -- picked host (ResizableHandle) is broken against the installed
  // react-resizable-panels v4 (renamed API); pass a DOM-only resizable mockup.
  'mc-resizable': {
    props: { withHandle: true },
    children: <KResizableDemo />,
    theme: 'light',
  },
};
