'use client';

// Add-inspiration modal. iter-16 (owner: "I will only add the LINK and IMAGE of
// the site; the others I'm not sure what you expect from me"). Simplified to
// three fields — source URL, image, title — and everything else is derived:
// the id is slugified from the title, the source type is auto-detected from the
// URL host (shown as a small overridable chip). The live preview on the right no
// longer clips. Still POSTs to /api/inspirations with the bearer token, then
// refreshes the gallery.

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
    }
  }, [open]);

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
      const body: Record<string, unknown> = {
        id: slugId(title, sourceUrl),
        title: title.trim() || titleFromUrl(sourceUrl) || 'Untitled inspiration',
        source_url: sourceUrl,
        source_type: sourceType,
      };
      if (thumbnailUrl.trim()) body.thumbnail_url = thumbnailUrl.trim();

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
              <input
                required type="url" autoFocus
                value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://dribbble.com/shots/…"
                className="w-full rounded-lg border px-3 py-2 text-[length:var(--t-label)] outline-none"
                style={FIELD_STYLE}
              />
            </label>

            <label className="block">
              <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>Image of the site</span>
              <input
                type="url"
                value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://…/screenshot.png"
                className="w-full rounded-lg border px-3 py-2 text-[length:var(--t-label)] outline-none"
                style={FIELD_STYLE}
              />
            </label>

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
                {thumbnailUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
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
