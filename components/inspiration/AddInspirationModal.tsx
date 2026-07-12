'use client';

// Add-inspiration modal. iter-16 (owner: "I will only add the LINK and IMAGE of
// the site; the others I'm not sure what you expect from me"). Simplified to
// three fields — source URL, image, title — and everything else is derived:
// the id is slugified from the title, the source type is auto-detected from the
// URL host (shown as a small overridable chip). The live preview on the right no
// longer clips. Still POSTs to /api/inspirations with the bearer token, then
// refreshes the gallery.
// iter-65 #523/#524 (owner: "i can only upload the image, not the link" + "the
// image i upload should be shown here"): the link field now accepts scheme-less
// pastes (type=url rejected them silently pre-submit), and the image can be a
// real FILE upload — stored server-side via image_base64 → /asset-library, so
// the gallery card actually shows it (dribbble hotlinks are blocked upstream).

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';

const SOURCE_TYPES = ['dribbble', 'figma-community', 'behance', 'mobbin', 'other'] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

function detectSource(url: string): SourceType {
  try {
    const h = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
    if (h.includes('dribbble')) return 'dribbble';
    if (h.includes('figma')) return 'figma-community';
    if (h.includes('behance')) return 'behance';
    if (h.includes('mobbin')) return 'mobbin';
  } catch { /* incomplete URL */ }
  return 'other';
}

// A friendly title guess from the URL's last path segment (or host).
function titleFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const seg = u.pathname.split('/').filter(Boolean).pop() || u.hostname.replace(/^www\./, '').split('.')[0];
    const words = seg.replace(/[-_]+/g, ' ').replace(/\.[a-z0-9]+$/i, '').trim();
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
  } catch { return ''; }
}

function slugId(title: string, url: string): string {
  let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length < 1) {
    try { slug = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').split('.')[0]; }
    catch { slug = 'ref'; }
  }
  return ('insp-' + slug).slice(0, 80);
}

const FIELD_STYLE = { borderColor: 'var(--line)', background: 'rgba(5,6,15,.6)', color: 'var(--ink)' } as const;

export function AddInspirationModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get('action') === 'new';

  const [sourceUrl, setSourceUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [titleManual, setTitleManual] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>('other');
  const [typeManual, setTypeManual] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  const autoType = detectSource(sourceUrl);

  useEffect(() => {
    if (!sourceUrl.trim()) return;
    if (!typeManual) setSourceType(autoType);
    if (!titleManual) setTitle(titleFromUrl(sourceUrl));
  }, [sourceUrl, autoType, typeManual, titleManual]);

  useEffect(() => {
    if (!open) {
      setSourceUrl(''); setThumbnailUrl(''); setTitle(''); setTitleManual(false);
      setSourceType('other'); setTypeManual(false); setError(null);
      setImageFile(null);
      setImagePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    }
  }, [open]);

  function pickImageFile(f: File | null) {
    setImageFile(f);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  function close() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('action');
    router.replace('/inspirations' + (next.toString() ? '?' + next.toString() : ''));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
      // #523: accept scheme-less pastes — the API's z.string().url() needs a scheme.
      const normalizedUrl = sourceUrl.trim().startsWith('http')
        ? sourceUrl.trim()
        : `https://${sourceUrl.trim()}`;
      const body: Record<string, unknown> = {
        id: slugId(title, normalizedUrl),
        title: title.trim() || titleFromUrl(normalizedUrl) || 'Untitled inspiration',
        source_url: normalizedUrl,
        source_type: sourceType,
      };
      if (imageFile) {
        // #524: real file upload — shipped as a data URL, stored server-side.
        body.image_base64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(new Error('could not read the image file'));
          r.readAsDataURL(imageFile);
        });
      } else if (thumbnailUrl.trim()) {
        body.thumbnail_url = thumbnailUrl.trim();
      }

      const res = await fetch('/api/inspirations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'request failed' }));
        setError(j.error ? `${j.error}${j.issues ? ': ' + JSON.stringify(j.issues) : ''}` : `HTTP ${res.status}`);
        return;
      }
      startTransition(() => { close(); router.refresh(); });
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (!o) close(); }}
      title="Add inspiration"
      description="Paste the link and an image — the rest is filled in for you."
      widthClass="max-w-3xl"
    >
      <div className="sc">
        <div className="grid gap-5 md:grid-cols-[1fr_.82fr]">
          {/* ── form: just link, image, title ── */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <label className="block">
              <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>Link to the site *</span>
              {/* #523: type="text" — type="url" silently rejected scheme-less
                  pastes like dribbble.com/shots/…; we normalize on submit. */}
              <input
                required type="text" autoFocus
                value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="dribbble.com/shots/… (https:// optional)"
                className="w-full rounded-lg border px-3 py-2 text-[length:var(--t-label)] outline-none"
                style={FIELD_STYLE}
              />
            </label>

            <div className="block">
              <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>Image of the site — upload a screenshot</span>
              <label
                className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer text-[length:var(--t-label)]"
                style={FIELD_STYLE}
              >
                <input
                  type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={(e) => pickImageFile(e.target.files?.[0] ?? null)}
                />
                <span className="mono rounded px-2 py-0.5 text-[10.5px] border shrink-0" style={{ borderColor: 'var(--line)', color: 'var(--cyan)' }}>choose file</span>
                <span className="truncate" style={{ color: imageFile ? 'var(--ink)' : 'var(--dim)' }}>
                  {imageFile ? imageFile.name : 'stored on the server — survives dead links'}
                </span>
                {imageFile && (
                  <button type="button" onClick={(e) => { e.preventDefault(); pickImageFile(null); }} className="ml-auto shrink-0" style={{ color: 'var(--mute)' }}>✕</button>
                )}
              </label>
              {!imageFile && (
                <input
                  type="text"
                  value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="…or paste a direct image URL"
                  className="mt-1.5 w-full rounded-lg border px-3 py-2 text-[length:var(--t-label)] outline-none"
                  style={FIELD_STYLE}
                />
              )}
            </div>

            <label className="block">
              <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>Title <span style={{ color: 'var(--dim)' }}>· auto-filled, edit if you like</span></span>
              <input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleManual(true); }}
                placeholder="Glassy analytics dashboard"
                className="w-full rounded-lg border px-3 py-2 text-[length:var(--t-label)] outline-none"
                style={FIELD_STYLE}
              />
            </label>

            <div>
              <span className="block text-[length:var(--t-cap)] mb-1.5" style={{ color: 'var(--dim)' }}>source · auto-detected</span>
              <div className="flex flex-wrap gap-1.5">
                {SOURCE_TYPES.map((s) => {
                  const active = sourceType === s;
                  const isAuto = !typeManual && s === autoType && sourceUrl.trim().length > 0;
                  return (
                    <button
                      key={s} type="button"
                      onClick={() => { setSourceType(s); setTypeManual(true); }}
                      className="mono rounded-full px-2.5 py-1 text-[10.5px] transition-colors border"
                      style={active
                        ? { borderColor: 'color-mix(in srgb, var(--vio) 70%, transparent)', background: 'color-mix(in srgb, var(--vio) 16%, transparent)', color: '#d8b4fe' }
                        : { borderColor: 'var(--line)', background: 'transparent', color: 'var(--mute)' }}
                    >
                      {s}{isAuto ? ' · auto' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={close} className="rounded-lg border px-4 py-2 text-[length:var(--t-label)]" style={{ borderColor: 'var(--line)', color: 'var(--mute)' }}>Cancel</button>
              <button type="submit" disabled={submitting} className="mono rounded-lg px-4 py-2 text-[length:var(--t-cap)] font-bold disabled:opacity-50" style={{ color: '#070811', background: 'linear-gradient(92deg,var(--cyan),#7ce8f7)' }}>
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>

          {/* ── live preview of the gallery card ── */}
          <div>
            <div className="mono text-[10px] tracking-[.2em] uppercase mb-2.5" style={{ color: 'var(--dim)' }}>Live preview</div>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--line)', background: 'rgba(18,16,38,.6)' }}>
              <div className="grid place-items-center" style={{ aspectRatio: '16 / 10', background: 'linear-gradient(135deg,rgba(168,85,247,.15),rgba(18,16,38,.7),rgba(34,211,238,.15))' }}>
                {imagePreview || thumbnailUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview ?? thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="mono text-[9.5px] tracking-[.1em] uppercase" style={{ color: 'var(--dim)' }}>{sourceType}</span>
                )}
              </div>
              <div className="px-3.5 py-3">
                <div className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{title.trim() || 'Untitled inspiration'}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="mono text-[9px] rounded px-1.5 py-0.5 border" style={{ color: '#d8b4fe', borderColor: 'color-mix(in srgb, var(--vio) 30%, transparent)', background: 'color-mix(in srgb, var(--vio) 12%, transparent)' }}>{sourceType}</span>
                </div>
              </div>
            </div>
            <p className="mt-2.5 mono text-[9.5px] leading-relaxed" style={{ color: 'var(--dim)' }}>updates as you type — exactly what lands in the gallery grid</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
