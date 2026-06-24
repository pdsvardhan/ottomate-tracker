import React from 'react';
import {
  IconHome,
  IconNewSection,
  IconTerminal2,
  IconExchange,
  IconBrandGithub,
  IconBrandX,
  IconClipboardCopy,
  IconFileBroken,
  IconSignature,
  IconTableColumn,
  IconBoxAlignTopLeft,
  IconBoxAlignRightFilled,
  IconArrowWaveRightUp,
} from '@tabler/icons-react';

// Aceternity upstream-demo ports. aceternity demos are DARK -> theme:'dark'.
// Background-effect components (aurora/lamp/spotlight/meteors/wavy/card-spotlight)
// -> wrap:true with centered demo content so the effect has space to fill.

// ---------------------------------------------------------------------------
// mc-3d-card-effect - CardContainer is the picked export; build the demo body
// as its children (an inline CardBody/CardItem stack from the upstream demo).
// ---------------------------------------------------------------------------
function ace3dChildren(): React.ReactNode {
  const Body = ({ children }: any) => (
    <div className="relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[24rem] h-auto rounded-xl p-6 border [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]">
      {children}
    </div>
  );
  return (
    <Body>
      <div className="text-xl font-bold text-neutral-600 dark:text-white">
        Make things float in air
      </div>
      <p className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300">
        Hover over this card to unleash the power of CSS perspective
      </p>
      <div className="mt-4">
        <img
          src="https://picsum.photos/seed/aceternity3d/1000/600"
          height="1000"
          width="1000"
          className="h-60 w-full object-cover rounded-xl group-hover/card:shadow-xl"
          alt="thumbnail"
        />
      </div>
      <div className="flex justify-between items-center mt-8">
        <span className="px-4 py-2 rounded-xl text-xs font-normal dark:text-white">
          Try now -&gt;
        </span>
        <span className="px-4 py-2 rounded-xl bg-black dark:bg-white dark:text-black text-white text-xs font-bold">
          Sign up
        </span>
      </div>
    </Body>
  );
}

// ---------------------------------------------------------------------------
// mc-aurora-background - heading + button centered inside the aurora.
// ---------------------------------------------------------------------------
function aceAuroraChildren(): React.ReactNode {
  return (
    <div className="relative flex flex-col gap-4 items-center justify-center px-4 z-10">
      <div className="text-3xl md:text-7xl font-bold dark:text-white text-center">
        Background lights are cool you know.
      </div>
      <div className="font-extralight text-base md:text-4xl dark:text-neutral-200 py-4">
        And this, is chemical burn.
      </div>
      <button className="bg-black dark:bg-white rounded-full w-fit text-white dark:text-black px-4 py-2">
        Debug now
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// mc-bento-grid - reconstruct upstream demo: 7 items, headers are image
// skeleton boxes, icons from tabler, two items span 2 columns.
// ---------------------------------------------------------------------------
const aceBentoSkeleton = (seed: number) => (
  <div
    className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100"
    style={{
      backgroundImage: 'url(https://picsum.photos/seed/bento' + seed + '/500/300)',
      backgroundSize: 'cover',
    }}
  />
);
const aceBentoItem = (
  cls: string,
  title: string,
  description: string,
  Icon: any,
  seed: number,
) => (
  <div
    key={seed}
    className={
      'group/bento shadow-input row-span-1 flex flex-col justify-between space-y-4 rounded-xl border border-neutral-200 bg-white p-4 transition duration-200 hover:shadow-xl dark:border-white/[0.2] dark:bg-black dark:shadow-none ' +
      cls
    }
  >
    {aceBentoSkeleton(seed)}
    <div className="transition duration-200 group-hover/bento:translate-x-2">
      <Icon className="h-4 w-4 text-neutral-500" />
      <div className="mt-2 mb-2 font-sans font-bold text-neutral-600 dark:text-neutral-200">
        {title}
      </div>
      <div className="font-sans text-xs font-normal text-neutral-600 dark:text-neutral-300">
        {description}
      </div>
    </div>
  </div>
);
function aceBentoChildren(): React.ReactNode {
  return [
    aceBentoItem('', 'The Dawn of Innovation', 'Explore the birth of groundbreaking ideas and inventions.', IconClipboardCopy, 1),
    aceBentoItem('', 'The Digital Revolution', 'Dive into the transformative power of technology.', IconFileBroken, 2),
    aceBentoItem('', 'The Art of Design', 'Discover the beauty of thoughtful and functional design.', IconSignature, 3),
    aceBentoItem('md:col-span-2', 'The Power of Communication', 'Understand the impact of effective communication in our lives.', IconTableColumn, 4),
    aceBentoItem('', 'The Pursuit of Knowledge', 'Join the quest for understanding and enlightenment.', IconArrowWaveRightUp, 5),
    aceBentoItem('', 'The Joy of Creation', 'Experience the thrill of bringing ideas to life.', IconBoxAlignTopLeft, 6),
    aceBentoItem('md:col-span-2', 'The Spirit of Adventure', 'Embark on exciting journeys and thrilling discoveries.', IconBoxAlignRightFilled, 7),
  ];
}

// ---------------------------------------------------------------------------
// mc-card-spotlight - upstream "Authentication steps" demo content.
// ---------------------------------------------------------------------------
const aceStepLabels = [
  'Enter your email address',
  'Create a strong password',
  'Set up two-factor authentication',
  'Verify your identity',
];
const AceStep = ({ title }: { title: string }) => (
  <li className="flex gap-2 items-start">
    <span className="h-4 w-4 shrink-0 rounded-full bg-blue-500 mt-1 flex items-center justify-center">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
    <p className="text-white">{title}</p>
  </li>
);
function aceCardSpotlightChildren(): React.ReactNode {
  return (
    <div className="relative z-20 text-left">
      <p className="text-xl font-bold text-white">Authentication steps</p>
      <div className="text-neutral-200 mt-4">
        <ul className="list-none mt-2 space-y-2">
          {aceStepLabels.map((s) => (
            <AceStep key={s} title={s} />
          ))}
        </ul>
      </div>
      <p className="text-neutral-300 mt-4 max-w-xs">
        Ensuring your account is properly secured helps protect your personal
        information and data.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// mc-floating-dock - upstream items with tabler icons.
// ---------------------------------------------------------------------------
const aceDockItems = [
  { title: 'Home', icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />, href: '#' },
  { title: 'Products', icon: <IconTerminal2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />, href: '#' },
  { title: 'Components', icon: <IconNewSection className="h-full w-full text-neutral-500 dark:text-neutral-300" />, href: '#' },
  {
    title: 'Aceternity UI',
    icon: <img src="https://picsum.photos/seed/acelogo/40/40" width={20} height={20} alt="Aceternity Logo" className="rounded-full" />,
    href: '#',
  },
  { title: 'Changelog', icon: <IconExchange className="h-full w-full text-neutral-500 dark:text-neutral-300" />, href: '#' },
  { title: 'Twitter', icon: <IconBrandX className="h-full w-full text-neutral-500 dark:text-neutral-300" />, href: '#' },
  { title: 'GitHub', icon: <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />, href: '#' },
];

// ---------------------------------------------------------------------------
// mc-floating-navbar - navItems with icons. The bar is fixed and animates in
// on scroll; we still supply the upstream demo items.
// ---------------------------------------------------------------------------
const aceNavItems = [
  { name: 'Home', link: '#', icon: <IconHome className="h-4 w-4 text-neutral-500 dark:text-white" /> },
  { name: 'About', link: '#', icon: <IconNewSection className="h-4 w-4 text-neutral-500 dark:text-white" /> },
  { name: 'Contact', link: '#', icon: <IconTerminal2 className="h-4 w-4 text-neutral-500 dark:text-white" /> },
];

// ---------------------------------------------------------------------------
// mc-text-generate-effect - upstream demo words string.
// ---------------------------------------------------------------------------
const aceTextGenerateWords =
  "Oxygen gets you high. In a catastrophic emergency, we're taking giant, panicked breaths. Suddenly you become euphoric, docile. You accept your fate. It's all right here. Emergency water landing, six hundred miles an hour. Blank faces, calm as Hindu cows";

// ---------------------------------------------------------------------------
// mc-wavy-background - heading + paragraph centered over the waves.
// ---------------------------------------------------------------------------
function aceWavyChildren(): React.ReactNode {
  return (
    <>
      <p className="text-2xl md:text-4xl lg:text-7xl text-white font-bold inter-var text-center">
        Hero waves are cool
      </p>
      <p className="text-base md:text-lg mt-4 text-white font-normal inter-var text-center">
        Leverage the power of canvas to create a beautiful hero section
      </p>
    </>
  );
}

export const overrides: Record<string, any> = {
  // CardContainer is the picked export; demo body passed as children.
  'mc-3d-card-effect': { children: ace3dChildren(), theme: 'dark' },
  // Aurora fills its parent; heading/button live as its children.
  'mc-aurora-background': { children: aceAuroraChildren(), theme: 'dark' },
  // Full upstream 7-card bento demo.
  'mc-bento-grid': { children: aceBentoChildren(), theme: 'dark' },
  // Spotlight reveals on hover; show the Authentication-steps card statically.
  'mc-card-spotlight': { children: aceCardSpotlightChildren(), wrap: true, theme: 'dark' },
  // Dock with the 7 upstream items + tabler icons.
  'mc-floating-dock': { props: { items: aceDockItems }, theme: 'dark' },
  // Floating navbar with upstream nav items.
  'mc-floating-navbar': { props: { navItems: aceNavItems }, theme: 'dark' },
  // GlowingEffect fills its relative parent; enable the glow for a static shot.
  'mc-glowing-effect': {
    props: { glow: true, disabled: false, spread: 40, proximity: 64, inactiveZone: 0.01, borderWidth: 3 },
    wrap: true,
    theme: 'dark',
  },
  // LampDemo is the self-contained default export - no props needed.
  'mc-lamp': { theme: 'dark' },
  // Meteors streak across the wrapped relative box.
  'mc-meteors': { props: { number: 20 }, wrap: true, theme: 'dark' },
  // Spotlight SVG positioned + filled white over the dark wrap box.
  'mc-spotlight': {
    props: { className: '-top-40 left-0 md:-top-20 md:left-60', fill: 'white' },
    wrap: true,
    theme: 'dark',
  },
  // Upstream demo sentence, animated word-by-word.
  'mc-text-generate-effect': { props: { words: aceTextGenerateWords }, theme: 'dark' },
  // Hero heading + paragraph over animated canvas waves.
  'mc-wavy-background': { children: aceWavyChildren(), theme: 'dark' },
};
