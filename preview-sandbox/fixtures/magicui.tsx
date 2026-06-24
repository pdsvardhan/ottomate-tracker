import React, { createRef } from 'react';

// magicui upstream-demo ports (iter-36 Bucket A). theme: match upstream bg.
//
// The preview harness renders React.createElement(Cmp, props, children) where
// Cmp is the component exported from each catalog source file. We can only feed
// props / children / wrap / theme, so each entry reconstructs the upstream demo
// data + markup faithfully within that contract.

/* ---------------------------------------------------------------------------
 * Shared brand icons (reused by AnimatedBeam / Dock / OrbitingCircles demos),
 * lifted verbatim from the upstream demos.
 * ------------------------------------------------------------------------- */
type SvgProps = React.SVGProps<SVGSVGElement>;

const McNotion = (p: SvgProps) => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...p}>
    <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#fff" />
    <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z" fill="#000" />
  </svg>
);

const McOpenAI = (p: SvgProps) => (
  <svg width="100" height="100" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...p}>
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

const McGoogleDrive = (p: SvgProps) => (
  <svg width="100" height="100" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" {...p}>
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);

const McWhatsapp = (p: SvgProps) => (
  <svg width="100" height="100" viewBox="0 0 175.216 175.552" xmlns="http://www.w3.org/2000/svg" {...p}>
    <defs>
      <linearGradient id="mc-wa-b" x1="85.915" x2="86.535" y1="32.567" y2="137.092" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#57d163" />
        <stop offset="1" stopColor="#23b33a" />
      </linearGradient>
    </defs>
    <path d="m12.966 161.238 10.439-38.114a73.42 73.42 0 0 1-9.821-36.772c.017-40.556 33.021-73.55 73.578-73.55 19.681.01 38.154 7.669 52.047 21.572s21.537 32.383 21.53 52.037c-.018 40.553-33.027 73.553-73.578 73.553h-.032c-12.313-.005-24.412-3.094-35.159-8.954z" fill="#fff" />
    <path d="M87.184 25.227c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.313-6.179 22.558 23.146-6.069 2.235 1.324c9.387 5.571 20.15 8.517 31.126 8.523h.023c33.707 0 61.14-27.426 61.153-61.135a60.75 60.75 0 0 0-17.895-43.251 60.75 60.75 0 0 0-43.235-17.928z" fill="url(#mc-wa-b)" />
    <path d="M68.772 55.603c-1.378-3.061-2.828-3.123-4.137-3.176l-3.524-.043c-1.226 0-3.218.46-4.902 2.3s-6.435 6.287-6.435 15.332 6.588 17.785 7.506 19.013 12.718 20.381 31.405 27.75c15.529 6.124 18.689 4.906 22.061 4.6s10.877-4.447 12.408-8.74 1.532-7.971 1.073-8.74-1.685-1.226-3.525-2.146-10.877-5.367-12.562-5.981-2.91-.919-4.137.921-4.746 5.979-5.819 7.206-2.144 1.381-3.984.462-7.76-2.861-14.784-9.124c-5.465-4.873-9.154-10.891-10.228-12.73s-.114-2.835.808-3.751c.825-.824 1.838-2.147 2.759-3.22s1.224-1.84 1.836-3.065.307-2.301-.153-3.22-4.032-10.011-5.666-13.647" fill="#fff" fillRule="evenodd" />
  </svg>
);

const McGitHub = (p: SvgProps) => (
  <svg viewBox="0 0 438.549 438.549" {...p}>
    <path fill="currentColor" d="M409.132 114.573c-19.608-33.596-46.205-60.194-79.798-79.8-33.598-19.607-70.277-29.408-110.063-29.408-39.781 0-76.472 9.804-110.063 29.408-33.596 19.605-60.192 46.204-79.8 79.8C9.803 148.168 0 184.854 0 224.63c0 47.78 13.94 90.745 41.827 128.906 27.884 38.164 63.906 64.572 108.063 79.227 5.14.954 8.945.283 11.419-1.996 2.475-2.282 3.711-5.14 3.711-8.562 0-.571-.049-5.708-.144-15.417a2549.81 2549.81 0 01-.144-25.406l-6.567 1.136c-4.187.767-9.469 1.092-15.846 1-6.374-.089-12.991-.757-19.842-1.999-6.854-1.231-13.229-4.086-19.13-8.559-5.898-4.473-10.085-10.328-12.56-17.556l-2.855-6.57c-1.903-4.374-4.899-9.233-8.992-14.559-4.093-5.331-8.232-8.945-12.419-10.848l-1.999-1.431c-1.332-.951-2.568-2.098-3.711-3.429-1.142-1.331-1.997-2.663-2.568-3.997-.572-1.335-.098-2.43 1.427-3.289 1.525-.859 4.281-1.276 8.28-1.276l5.708.853c3.807.763 8.516 3.042 14.133 6.851 5.614 3.806 10.229 8.754 13.846 14.842 4.38 7.806 9.657 13.754 15.846 17.847 6.184 4.093 12.419 6.136 18.699 6.136 6.28 0 11.704-.476 16.274-1.423 4.565-.952 8.848-2.383 12.847-4.285 1.713-12.758 6.377-22.559 13.988-29.41-10.848-1.14-20.601-2.857-29.264-5.14-8.658-2.286-17.605-5.996-26.835-11.14-9.235-5.137-16.896-11.516-22.985-19.126-6.09-7.614-11.088-17.61-14.987-29.979-3.901-12.374-5.852-26.648-5.852-42.826 0-23.035 7.52-42.637 22.557-58.817-7.044-17.318-6.379-36.732 1.997-58.24 5.52-1.715 13.706-.428 24.554 3.853 10.85 4.283 18.794 7.952 23.84 10.994 5.046 3.041 9.089 5.618 12.135 7.708 17.705-4.947 35.976-7.421 54.818-7.421s37.117 2.474 54.823 7.421l10.849-6.849c7.419-4.57 16.18-8.758 26.262-12.565 10.088-3.805 17.802-4.853 23.134-3.138 8.562 21.509 9.325 40.922 2.279 58.24 15.036 16.18 22.559 35.787 22.559 58.817 0 16.178-1.958 30.497-5.853 42.966-3.9 12.471-8.941 22.457-15.125 29.979-6.191 7.521-13.901 13.85-23.131 18.986-9.232 5.14-18.182 8.85-26.84 11.136-8.662 2.286-18.415 4.004-29.263 5.146 9.894 8.562 14.842 22.077 14.842 40.539v60.237c0 3.422 1.19 6.279 3.572 8.562 2.379 2.279 6.136 2.95 11.276 1.995 44.163-14.653 80.185-41.062 108.068-79.226 27.88-38.161 41.825-81.126 41.825-128.906-.01-39.771-9.818-76.454-29.414-110.049z" />
  </svg>
);

/* ---------------------------------------------------------------------------
 * AnimatedBeam — ref-driven (containerRef/fromRef/toRef). The harness renders
 * only the beam SVG (the circles it points at are a sibling layout the harness
 * can't mount), so we supply real ref objects so it mounts cleanly. Wrap gives
 * the SVG a sized canvas. Light theme like the upstream card.
 * ------------------------------------------------------------------------- */
const beamContainerRef = createRef<HTMLDivElement>();
const beamFromRef = createRef<HTMLDivElement>();
const beamToRef = createRef<HTMLDivElement>();

/* ---------------------------------------------------------------------------
 * Dock — children are icon chips. DockIcon lives in the component's own module
 * (not importable here); Dock renders non-DockIcon children as-is, so styled
 * icon spans still appear in the dock bar.
 * ------------------------------------------------------------------------- */
const dockIconChip = (icon: React.ReactNode, key: number) => (
  <div key={key} className="flex aspect-square size-12 cursor-pointer items-center justify-center rounded-full bg-black/10 p-2 dark:bg-white/10">
    {icon}
  </div>
);
const dockChildren = [
  dockIconChip(<McGitHub className="size-6" />, 0),
  dockIconChip(<McGoogleDrive className="size-6" />, 1),
  dockIconChip(<McNotion className="size-6" />, 2),
  dockIconChip(<McWhatsapp className="size-6" />, 3),
];

/* ---------------------------------------------------------------------------
 * File Tree — prop-driven via `elements`, matches upstream demo data exactly.
 * ------------------------------------------------------------------------- */
const FILE_TREE_ELEMENTS = [
  {
    id: 'src', type: 'folder', isSelectable: true, name: 'src',
    children: [
      { id: 'lib', type: 'folder', isSelectable: true, name: 'lib', children: [{ id: 'utils', isSelectable: true, name: 'utils.ts' }] },
      { id: 'app', type: 'folder', isSelectable: true, name: 'app', children: [{ id: 'page', isSelectable: true, name: 'page.tsx' }, { id: 'layout', isSelectable: true, name: 'layout.tsx' }] },
      {
        id: 'components', type: 'folder', isSelectable: true, name: 'components',
        children: [
          { id: 'header', isSelectable: true, name: 'header.tsx' },
          { id: 'ui', type: 'folder', isSelectable: true, name: 'ui', children: [{ id: 'button', isSelectable: true, name: 'button.tsx' }] },
          { id: 'footer', isSelectable: true, name: 'footer.tsx' },
        ],
      },
    ],
  },
];

/* ---------------------------------------------------------------------------
 * Marquee — review-card children, ported from the upstream marquee demo.
 * ------------------------------------------------------------------------- */
const MARQUEE_REVIEWS = [
  { name: 'Jack', username: '@jack', body: "I've never seen anything like this before. It's amazing. I love it.", img: 'https://avatar.vercel.sh/jack' },
  { name: 'Jill', username: '@jill', body: "I don't know what to say. I'm speechless. This is amazing.", img: 'https://avatar.vercel.sh/jill' },
  { name: 'John', username: '@john', body: "I'm at a loss for words. This is amazing. I love it.", img: 'https://avatar.vercel.sh/john' },
];
function MarqueeReviewCard({ img, name, username, body }: { img: string; name: string; username: string; body: string }) {
  return (
    <figure className="relative h-full w-64 cursor-pointer overflow-hidden rounded-xl border border-gray-950/[.1] bg-gray-950/[.01] p-4 hover:bg-gray-950/[.05]">
      <div className="flex flex-row items-center gap-2">
        <img className="rounded-full" width="32" height="32" alt="" src={img} />
        <div className="flex flex-col">
          <figcaption className="text-sm font-medium text-black">{name}</figcaption>
          <p className="text-xs font-medium text-black/40">{username}</p>
        </div>
      </div>
      <blockquote className="mt-2 text-sm text-black">{body}</blockquote>
    </figure>
  );
}
const marqueeChildren = MARQUEE_REVIEWS.map((r) => <MarqueeReviewCard key={r.username} {...r} />);

/* ---------------------------------------------------------------------------
 * Orbiting Circles — children orbit; component positions them. Wrap gives a
 * sized canvas. Brand icons, like the upstream demo.
 * ------------------------------------------------------------------------- */
const orbitingChildren = [
  <McWhatsapp key="wa" />, <McNotion key="no" />, <McOpenAI key="oa" className="fill-black" />, <McGoogleDrive key="gd" />,
];

/* ---------------------------------------------------------------------------
 * Confetti — auto-fires on mount onto a full-size canvas. Upstream shows a big
 * "Confetti" heading behind it; Confetti renders its children after the canvas.
 * ------------------------------------------------------------------------- */
const confettiHeading = (
  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl leading-none font-semibold whitespace-pre-wrap text-transparent">
    Confetti
  </span>
);

export const overrides: Record<string, any> = {
  // --- AnimatedBeam: ref-driven; mounts cleanly with real refs, wrapped canvas, light card bg.
  'mc-animated-beam': {
    props: { containerRef: beamContainerRef, fromRef: beamFromRef, toRef: beamToRef, duration: 3, gradientStartColor: '#ffaa40', gradientStopColor: '#9c40ff' },
    children: null,
    wrap: true,
    theme: 'light',
  },

  // --- AnimatedCircularProgressBar: upstream demo counts; show a filled gauge.
  'mc-animated-circular-progress': {
    props: { value: 70, max: 100, min: 0, gaugePrimaryColor: 'rgb(79 70 229)', gaugeSecondaryColor: 'rgba(0, 0, 0, 0.1)' },
    children: null,
    theme: 'light',
  },

  // --- AnimatedGridPattern: background SVG; upstream props + masked skew. Dark.
  'mc-animated-grid-pattern': {
    props: {
      numSquares: 30, maxOpacity: 0.1, duration: 3, repeatDelay: 1,
      className: 'mask-[radial-gradient(500px_circle_at_center,white,transparent)] inset-x-0 inset-y-[-30%] h-[200%] skew-y-12',
    },
    children: null,
    wrap: true,
    theme: 'dark',
  },

  // --- BorderBeam: animated beam tracing the wrap box (the demo card). Light.
  'mc-border-beam': {
    props: { duration: 8, size: 100, colorFrom: '#ffaa40', colorTo: '#9c40ff' },
    children: null,
    wrap: true,
    theme: 'light',
  },

  // --- Confetti: auto-fires onto a full-size canvas, "Confetti" heading behind. Light.
  'mc-confetti': {
    props: { className: 'absolute top-0 left-0 z-0 size-full' },
    children: confettiHeading,
    wrap: true,
    theme: 'light',
  },

  // --- Dock: MacOS dock with brand icon chips. Light.
  'mc-dock': {
    props: { direction: 'middle' },
    children: dockChildren,
    theme: 'light',
  },

  // --- DotPattern: masked dot background. Dark.
  'mc-dot-pattern': {
    props: { className: 'mask-[radial-gradient(300px_circle_at_center,white,transparent)]' },
    children: null,
    wrap: true,
    theme: 'dark',
  },

  // --- FileTree: folder/file structure via elements prop. Light.
  'mc-file-tree': {
    props: {
      className: 'overflow-hidden rounded-md p-2',
      initialSelectedId: 'button',
      initialExpandedItems: ['src', 'app', 'components', 'ui', 'lib'],
      elements: FILE_TREE_ELEMENTS,
    },
    children: null,
    wrap: true,
    theme: 'light',
  },

  // --- HeroVideoDialog: thumbnail + play overlay (prop-driven). Light.
  'mc-hero-video-dialog': {
    props: {
      animationStyle: 'from-center',
      videoSrc: 'https://www.youtube.com/embed/qh3NGpYRG3I',
      thumbnailSrc: 'https://startup-template-sage.vercel.app/hero-light.png',
      thumbnailAlt: 'Hero Video',
      className: 'max-w-2xl',
    },
    children: null,
    theme: 'light',
  },

  // --- Marquee: infinite-scrolling review cards. Light.
  'mc-marquee': {
    props: { pauseOnHover: true, className: '[--duration:20s]' },
    children: marqueeChildren,
    theme: 'light',
  },

  // --- NumberTicker: large counting number (upstream value 100). Light.
  'mc-number-ticker': {
    props: { value: 100, className: 'text-8xl font-medium tracking-tighter whitespace-pre-wrap text-black' },
    children: null,
    theme: 'light',
  },

  // --- OrbitingCircles: brand icons orbiting a path. Light.
  'mc-orbiting-circles': {
    props: { iconSize: 40, radius: 120 },
    children: orbitingChildren,
    wrap: true,
    theme: 'light',
  },

  // --- Particles: floating particle background, "Particles" heading is harness-side. Dark.
  'mc-particles': {
    props: { className: 'absolute inset-0 z-0', quantity: 100, ease: 80, color: '#ffffff', refresh: true },
    children: null,
    wrap: true,
    theme: 'dark',
  },

  // --- PulsatingButton: attention button. --primary is unavailable in the sandbox,
  //     so we give it an explicit indigo bg/text while keeping the upstream label.
  'mc-pulsating-button': {
    props: { className: 'bg-indigo-600 text-white', pulseColor: '#818cf8' },
    children: 'Join Affiliate Program',
    theme: 'light',
  },

  // --- RainbowButton: animated rainbow border button. Light.
  'mc-rainbow-button': {
    props: { className: 'px-8 py-2 text-white' },
    children: 'Get Unlimited Access',
    theme: 'light',
  },

  // --- RetroGrid: animated scrolling retro grid (WebGL, CSS fallback). Dark.
  'mc-retro-grid': {
    props: {},
    children: null,
    wrap: true,
    theme: 'dark',
  },

  // --- Ripple: concentric ripple circles behind content. Dark.
  'mc-ripple': {
    props: {},
    children: null,
    wrap: true,
    theme: 'dark',
  },

  // --- ScrollProgress: top gradient bar. scaleX is 0 without scroll, so we force
  //     it visible (scaleX:1) and thicken it so the gradient reads in the preview.
  'mc-scroll-progress': {
    props: { className: 'h-1.5', style: { scaleX: 1 } },
    children: null,
    theme: 'light',
  },

  // --- ShimmerButton: shimmering-perimeter button (literal black bg). Light.
  'mc-shimmer-button': {
    props: { className: 'shadow-2xl' },
    children: (
      <span className="text-center text-sm leading-none font-medium tracking-tight whitespace-pre-wrap text-white lg:text-lg">
        Shimmer Button
      </span>
    ),
    theme: 'light',
  },

  // --- ShineBorder: animated shine border tracing the wrap box. Light.
  'mc-shine-border': {
    props: { borderWidth: 2, duration: 14, shineColor: ['#A07CFE', '#FE8FB5', '#FFBE7B'] },
    children: null,
    wrap: true,
    theme: 'light',
  },

  // --- SparklesText: "Magic UI" with animated sparkles. Light.
  'mc-sparkles-text': {
    props: {},
    children: 'Magic UI',
    theme: 'light',
  },

  // --- TextReveal: scroll-fade text (children must be a string). Light.
  'mc-text-reveal': {
    props: {},
    children: 'Magic UI will change the way you design.',
    theme: 'light',
  },

  // --- TypingAnimation: typed characters. Light.
  'mc-typing-animation': {
    props: { className: 'text-4xl font-bold text-black' },
    children: 'Hello World! 👋',
    theme: 'light',
  },

  // --- WordRotate: vertical word rotation. Light.
  'mc-word-rotate': {
    props: { className: 'text-4xl font-bold text-black', words: ['Word', 'Rotate'] },
    children: null,
    theme: 'light',
  },
};
