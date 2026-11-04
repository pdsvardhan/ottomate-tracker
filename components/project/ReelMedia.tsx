'use client';

// Hero reel with real media (#165): renders the project's reel file when one
// exists (video: muted/loop/autoplay; image: cover) and falls back to the
// animated ReelCanvas placeholder otherwise. Carries a discreet bearer-gated
// uploader (same sessionStorage token pattern as the other admin affordances)
// so the owner can set/replace a reel from the page itself.

import { useRef, useState } from 'react';
import { ReelCanvas } from './ReelCanvas';
import { useViewer } from '@/components/auth/ViewerContext';

export interface ReelInfo { url: string; kind: 'video' | 'image'; name: string }

export function ReelMedia({ slug, reel }: { slug: string; reel: ReelInfo | null }) {
  // iter-208 #1509: the uploader is an owner control — the visitor view has no token and no button.
  const { owner } = useViewer();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(f: File) {
    setBusy(true);
    setErr(null);
    try {
      const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      const fd = new FormData();
      fd.set('file', f);
      fd.set('name', `reel${ext}`); // uploaded media becomes THE reel
      const res = await fetch(`/api/projects/${slug}/media`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `upload failed (${res.status})`);
      }
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'upload failed');
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0">
      {reel ? (
        reel.kind === 'video' ? (
          <video
            src={reel.url}
            className="h-full w-full object-cover"
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element — served from our own API route
          // iter-16 (owner: "this picture is cropped"): object-contain shows the
          // whole screenshot inside the 16:9 frame (letterboxed on the dark reel
          // bg) instead of cropping it to fill.
          <img src={reel.url} alt="" className="h-full w-full object-contain" />
        )
      ) : (
        <ReelCanvas />
      )}

      {/* discreet uploader — bottom-right of the reel (owner view only) */}
      {owner && (
        <div className="absolute bottom-3 right-3 z-10 pointer-events-auto">
          <input
            ref={fileRef}
            type="file"
            accept=".mp4,.webm,.gif,.png,.jpg,.jpeg,.webp,.avif"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            title={reel ? 'Replace reel media' : 'Upload reel media'}
            className="mono rounded-md border border-white/15 bg-black/50 px-2 py-1 text-[11px] tracking-wide text-zinc-400 backdrop-blur transition-colors hover:text-zinc-100"
          >
            {busy ? 'uploading…' : reel ? '⟳ reel' : '+ reel'}
          </button>
          {err && <div className="mono mt-1 max-w-[200px] text-right text-[10px] text-rose-400">{err}</div>}
        </div>
      )}
    </div>
  );
}
