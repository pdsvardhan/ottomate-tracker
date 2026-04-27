// ComponentPreview — renders the preview_url.
// Auto-detects:
//   - direct image URLs (.png/.jpg/.webp/.svg/.gif) → <img>
//   - iframe-friendly hosts (codesandbox, stackblitz, codepen, etc.) → <iframe>
//   - everything else → external link card

const IFRAME_HOSTS = [
  'codesandbox.io', 'stackblitz.com', 'codepen.io', 'jsfiddle.net',
  'play.tailwindcss.com', 'tldraw.com', 'val.town',
];

const IMAGE_EXTS = /\.(png|jpe?g|webp|svg|gif|avif)$/i;

export function ComponentPreview({ previewUrl }: { previewUrl: string | null }) {
  if (!previewUrl) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <p className="text-zinc-500 text-sm">No preview added yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          Add a screenshot URL, CodeSandbox link, or live demo URL in the edit form below.
        </p>
      </div>
    );
  }

  if (IMAGE_EXTS.test(previewUrl)) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 overflow-hidden">
        <img
          src={previewUrl}
          alt="Component preview"
          className="w-full max-h-[520px] object-contain rounded-lg bg-zinc-950"
        />
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="block mt-2 text-[11px] text-cyan-400 hover:underline truncate text-center font-mono"
        >
          {previewUrl}
        </a>
      </div>
    );
  }

  let host = '';
  try {
    host = new URL(previewUrl).host;
  } catch {
    // not a URL — treat as link
  }

  if (host && IFRAME_HOSTS.some((h) => host.includes(h))) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <iframe
          src={previewUrl}
          className="w-full h-[520px] bg-zinc-950"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title="Component preview"
        />
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="block px-3 py-2 text-[11px] text-cyan-400 hover:underline truncate font-mono border-t border-zinc-800"
        >
          ↗ {previewUrl}
        </a>
      </div>
    );
  }

  // Fallback — link card
  return (
    <a
      href={previewUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-zinc-700 transition-colors"
    >
      <div className="text-sm text-cyan-400 font-medium mb-1">↗ Open preview in new tab</div>
      <div className="text-xs text-zinc-500 font-mono break-all">{previewUrl}</div>
    </a>
  );
}
