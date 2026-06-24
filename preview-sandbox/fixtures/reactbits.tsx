import React from 'react';

// react-bits upstream-demo ports. theme: 'dark' to match the react-bits site
// (their demos render on a dark background) unless the component is a light card.
// Helpers + sample data live in this file; names are unique to avoid collisions.

type Fixture = {
  props?: Record<string, unknown>;
  children?: React.ReactNode;
  wrap?: boolean;
  theme?: 'light' | 'dark';
};

// ---- shared sample assets ----
const rbPhoto = (n: number, w = 600, h = 400) => `https://picsum.photos/seed/${n}/${w}/${h}`;

// Small inline-SVG logo (data URI) for nav components.
const rbLogo =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
      '<rect width="48" height="48" rx="10" fill="#5227FF"/>' +
      '<text x="24" y="32" font-family="system-ui,Arial" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">O</text>' +
      '</svg>'
  );

// ---- CircularGallery: [{ image, text }] ----
const rbCircularItems = [
  { image: rbPhoto(11, 800, 600), text: 'Bridge' },
  { image: rbPhoto(12, 800, 600), text: 'Desk Setup' },
  { image: rbPhoto(13, 800, 600), text: 'Waterfall' },
  { image: rbPhoto(14, 800, 600), text: 'Strawberries' },
  { image: rbPhoto(15, 800, 600), text: 'Deep Diving' },
  { image: rbPhoto(16, 800, 600), text: 'Train Track' },
  { image: rbPhoto(17, 800, 600), text: 'Santorini' },
  { image: rbPhoto(18, 800, 600), text: 'Blurry Lights' },
];

// ---- DomeGallery: string[] (or {src,alt}) ----
const rbDomeImages = Array.from({ length: 7 }, (_, i) => ({
  src: rbPhoto(30 + i, 600, 600),
  alt: `Gallery image ${i + 1}`,
}));

// ---- FlyingPosters: string[] of poster images ----
const rbPosters = Array.from({ length: 6 }, (_, i) => rbPhoto(40 + i, 400, 600));

// ---- Folder: items are ReactNodes shown as papers ----
const rbFolderPaper = (label: string, key: number) => (
  <div
    key={key}
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      fontSize: 9,
      fontWeight: 600,
      color: '#27272a',
    }}
  >
    {label}
  </div>
);
const rbFolderItems = [
  rbFolderPaper('Docs', 0),
  rbFolderPaper('Images', 1),
  rbFolderPaper('Notes', 2),
];

// ---- Stack: cards are ReactNodes (images) ----
const rbStackImg = (n: number) => (
  <img
    src={rbPhoto(50 + n, 500, 500)}
    alt={`card-${n}`}
    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 15, pointerEvents: 'none' }}
  />
);
const rbStackCards = [rbStackImg(1), rbStackImg(2), rbStackImg(3), rbStackImg(4)];

// ---- Stepper: each child becomes a step ----
const rbStepText = (title: string, body: string) => (
  <div style={{ fontFamily: 'system-ui, sans-serif', color: '#e4e4e7', padding: '8px 4px' }}>
    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>{title}</h3>
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#a1a1aa' }}>{body}</p>
  </div>
);
const rbStepperChildren = [
  rbStepText('Welcome', 'This is the first step. Use Continue to advance through the flow.'),
  rbStepText('Your details', 'Step two collects information. The indicator above tracks progress.'),
  rbStepText('Preferences', 'Step three lets you tune options before finishing.'),
  rbStepText('All set', 'Final step — press Complete to wrap up the wizard.'),
];

// ---- CardNav items: {label, bgColor, textColor, links:[{label,href,ariaLabel}]} ----
const rbCardNavItems = [
  {
    label: 'About',
    bgColor: '#0D0716',
    textColor: '#fff',
    links: [
      { label: 'Company', href: '#', ariaLabel: 'About Company' },
      { label: 'Careers', href: '#', ariaLabel: 'About Careers' },
    ],
  },
  {
    label: 'Projects',
    bgColor: '#170D27',
    textColor: '#fff',
    links: [
      { label: 'Featured', href: '#', ariaLabel: 'Featured Projects' },
      { label: 'Case Studies', href: '#', ariaLabel: 'Project Case Studies' },
    ],
  },
  {
    label: 'Contact',
    bgColor: '#271E37',
    textColor: '#fff',
    links: [
      { label: 'Email', href: '#', ariaLabel: 'Email us' },
      { label: 'Twitter', href: '#', ariaLabel: 'Twitter' },
      { label: 'LinkedIn', href: '#', ariaLabel: 'LinkedIn' },
    ],
  },
];

// ---- PillNav items: {label, href, ariaLabel} ----
const rbPillItems = [
  { label: 'Home', href: '#', ariaLabel: 'Home' },
  { label: 'About', href: '#about', ariaLabel: 'About' },
  { label: 'Services', href: '#services', ariaLabel: 'Services' },
  { label: 'Contact', href: '#contact', ariaLabel: 'Contact' },
];

// ---- TiltedCard overlay content ----
const rbTiltedOverlay = (
  <p
    style={{
      margin: 0,
      padding: '10px 14px',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 600,
      fontSize: 14,
      color: '#fff',
    }}
  >
    Ottomate Studio
  </p>
);

export const overrides: Record<string, Fixture> = {
  // BorderGlow — content card with animated glow sweep. Sizes to children.
  'mc-border-glow': {
    props: {
      glowColor: '40 80 80',
      colors: ['#c084fc', '#f472b6', '#38bdf8'],
      animated: true,
      borderRadius: 28,
    },
    children: (
      <div
        style={{
          padding: '48px 56px',
          maxWidth: 360,
          fontFamily: 'system-ui, sans-serif',
          color: '#e4e4e7',
        }}
      >
        <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: '#fff' }}>Border Glow</h3>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#a1a1aa' }}>
          Move your cursor near the edges to steer the conic glow around this card.
        </p>
      </div>
    ),
    theme: 'dark',
  },

  // CardNav — logo + expandable nav cards.
  'mc-card-nav': {
    props: {
      logo: rbLogo,
      logoAlt: 'Ottomate',
      items: rbCardNavItems,
      baseColor: '#fff',
      menuColor: '#000',
      buttonBgColor: '#111',
      buttonTextColor: '#fff',
    },
    children: null,
    theme: 'dark',
  },

  // CircularGallery — WebGL curved image carousel. Fill a sized box.
  'mc-circular-gallery': {
    props: { items: rbCircularItems, bend: 3, textColor: '#ffffff', borderRadius: 0.05 },
    children: null,
    wrap: true,
    theme: 'dark',
  },

  // DecayCard — turbulence-displaced image with caption.
  'mc-decay-card': {
    props: { width: 280, height: 380, image: rbPhoto(61, 600, 800) },
    children: (
      <h2 style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
        The
        <br />
        Decay
        <br />
        Effect
      </h2>
    ),
    theme: 'dark',
  },

  // DomeGallery — full-bleed 3D dome of images. Fill a sized box.
  'mc-dome-gallery': {
    props: { images: rbDomeImages, grayscale: false, fit: 0.6, minRadius: 320 },
    children: null,
    wrap: true,
    theme: 'dark',
  },

  // ElasticSlider — volume-style elastic slider (default chakra/react-icons).
  'mc-elastic-slider': {
    props: { defaultValue: 50, startingValue: 0, maxValue: 100, isStepped: false },
    children: null,
    theme: 'dark',
  },

  // FlyingPosters — WebGL scroll stack of posters. Fill a sized box.
  'mc-flying-posters': {
    props: { items: rbPosters, planeWidth: 220, planeHeight: 320, distortion: 3 },
    children: null,
    wrap: true,
    theme: 'dark',
  },

  // Folder — click to open; papers are the items.
  'mc-folder': {
    props: { color: '#5227FF', size: 2, items: rbFolderItems },
    children: null,
    theme: 'dark',
  },

  // MagicBento — self-contained 6-card grid; just tune glow.
  'mc-magic-bento': {
    props: {
      textAutoHide: true,
      enableStars: true,
      enableSpotlight: true,
      enableBorderGlow: true,
      spotlightRadius: 300,
      particleCount: 12,
      glowColor: '132, 0, 255',
    },
    children: null,
    theme: 'dark',
  },

  // ModelViewer — 3D GLTF viewer. No local asset, so use a public sample model
  // (Khronos Duck .glb). placeholderSrc shows while loading.
  'mc-model-viewer': {
    props: {
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
      width: 400,
      height: 320,
      autoRotate: true,
      autoRotateSpeed: 0.5,
      environmentPreset: 'studio',
      placeholderSrc: rbPhoto(70, 200, 200),
      showScreenshotButton: false,
    },
    children: null,
    theme: 'dark',
  },

  // PillNav — pill-style nav with logo. Uses react-router Link internally.
  'mc-pill-nav': {
    props: {
      logo: rbLogo,
      logoAlt: 'Ottomate',
      items: rbPillItems,
      activeHref: '#',
      baseColor: '#fff',
      pillColor: '#120F17',
      hoveredPillTextColor: '#120F17',
      pillTextColor: '#fff',
    },
    children: null,
    theme: 'dark',
  },

  // PixelCard — pixel shimmer on hover; needs children content.
  'mc-pixel-card': {
    props: { variant: 'blue' },
    children: (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: '#e4e4e7',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>Pixel</span>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>hover me</span>
      </div>
    ),
    theme: 'dark',
  },

  // ProfileCard — interactive tilt profile card.
  'mc-profile-card': {
    props: {
      avatarUrl: 'https://i.pravatar.cc/400?img=12',
      miniAvatarUrl: 'https://i.pravatar.cc/100?img=12',
      name: 'Javi A. Torres',
      title: 'Software Engineer',
      handle: 'javicodes',
      status: 'Online',
      contactText: 'Contact',
      showUserInfo: true,
      enableTilt: true,
    },
    children: null,
    theme: 'dark',
  },

  // ReflectiveCard — webcam-backed metallic ID card (self-contained content).
  'mc-reflective-card': {
    props: { color: 'white', metalness: 1, roughness: 0.4, grayscale: 1 },
    children: null,
    theme: 'dark',
  },

  // StackedCards — draggable photo stack with autoplay.
  'mc-stack': {
    props: {
      cards: rbStackCards,
      randomRotation: true,
      sensitivity: 180,
      sendToBackOnClick: false,
      autoplay: true,
      autoplayDelay: 2500,
      pauseOnHover: true,
    },
    children: null,
    wrap: true,
    theme: 'dark',
  },

  // AnimatedStepper — multi-step wizard. Children are the steps.
  'mc-stepper-rb': {
    props: { initialStep: 1, backButtonText: 'Back', nextButtonText: 'Continue' },
    children: rbStepperChildren,
    theme: 'dark',
  },

  // TiltedCard — 3D tilt image card with caption + overlay.
  'mc-tilted-card': {
    props: {
      imageSrc: rbPhoto(80, 500, 500),
      altText: 'Ottomate showcase',
      captionText: 'Ottomate Studio',
      containerHeight: '300px',
      containerWidth: '300px',
      imageHeight: '300px',
      imageWidth: '300px',
      rotateAmplitude: 14,
      scaleOnHover: 1.1,
      showMobileWarning: false,
      showTooltip: true,
      displayOverlayContent: true,
      overlayContent: rbTiltedOverlay,
    },
    children: null,
    theme: 'dark',
  },
};
