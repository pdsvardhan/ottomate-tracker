'use client';

// Add-inspiration modal. iter-15 "split preview" redesign (winner 10g from the
// external design round): an on-theme split panel — form on the left, a live
// preview of the exact gallery card on the right that updates as you type. The
// source type is auto-detected from the URL (override chips let you correct it).
// Toggled by ?action=new on /inspirations, POSTs to the existing /api/inspirations
// write endpoint (bearer token from sessionStorage), then refreshes the gallery.
// Data contract + submit flow unchanged — presentation + auto-detect only.

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';

const SOURCE_TYPES = ['dribbble', 'figma-community', 'behance', 'mobbin', 'other'] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

// Auto-detect the source from the URL host so the owner rarely has to touch it.
function detectSource(url: string): SourceType {
  try {
    const h = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
    if (h.includes('dribbble')) return 'dribbble';
    if (h.includes('figma')) return 'figma-community';
    if (h.includes('behance')) return 'behance';
    if (h.includes('mobbin')) return 'mobbin';
  } catch {
    /* incomplete URL — fall through */
  }
  return 'other';
}

// On-theme field styling (resolves against the .sc palette we wrap around the
// modal body). Kept as a shared object so all inputs match.
const FIELD =
  'w-full rounded-lg px-3 py-2 text-[length:var(--t-label)] outline-none transition-colors ' +
  'focus:border-[color:var(--cyan)]';

export function AddInspirationModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get('action') === 'new';

  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('dribbble');
  const [typeManual, setTypeManual] = useState(false);
  const [domain, setDomain] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [styleTags, setStyleTags] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  const autoType = detectSource(sourceUrl);

  // Follow the URL auto-detect until the owner overrides with a chip.
  useEffect(() => {
    if (!typeManual && sourceUrl.trim()) setSourceType(autoType);
  }, [autoType, typeManual, sourceUrl]);

  useEffect(() => {
    if (!open) {
      setId(''); setTitle(''); setSourceUrl(''); setSourceType('dribbble'); setTypeManual(false);
      setDomain(''); setThumbnailUrl(''); setStyleTags(''); setNotes('');
      setError(null);
    }
  }, [open]);

  function close() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('action');
    router.replace('/inspirations' + (next.toString() ? '?' + next.toString() : ''));
  }

  function parseChips(s: string): string[] | null {
    const arr = s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    return arr.length > 0 ? arr : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
      const body: Record<string, unknown> = {
        id,
        title,
        source_url: sourceUrl,
        source_type: sourceType,
      };
      if (domain.trim()) body.domain = domain.trim();
      if (thumbnailUrl.trim()) body.thumbnail_url = thumbnailUrl.trim();
      const st = parseChips(styleTags); if (st) body.style_tags = st;
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch('/api/inspirations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'request failed' }));
        setError(j.error ? `${j.error}${j.issues ? ': ' + JSON.stringify(j.issues) : ''}` : `HTTP ${res.status}`);
        return;
      }
      startTransition(() => {
        close();
        router.refresh();
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const styleChips = parseChips(styleTags) ?? [];

  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (!o) close(); }}
      title="Add inspiration"
      description="Form on the left, a live preview of the gallery card on the right."
      widthClass="max-w-4xl"
    >
      <div className="sc">
        <div className="grid gap-0 md:grid-cols-[1.15fr_.85fr] md:rounded-xl md:overflow-hidden md:border" style={{ borderColor: 'var(--line)' }}>
          {/* ── form ── */}
          <form onSubmit={handleSubmit} className="space-y-3.5 md:pr-6 md:border-r" style={{ borderColor: 'var(--line)' }}>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>ID *</span>
                <input
                  required pattern="insp-[a-z0-9-]+" minLength={5} maxLength={80}
                  value={id} onChange={(e) => setId(e.target.value)}
                  placeholder="insp-glass-dashboard"
                  className={FIELD + ' font-mono border'}
                  style={{ borderColor: 'var(--line)', background: 'rgba(5,6,15,.6)', color: 'var(--ink)' }}
                />
              </label>
              <label className="block">
                <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>Title *</span>
                <input
                  required maxLength={200}
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Glassy analytics dashboard"
                  className={FIELD + ' border'}
                  style={{ borderColor: 'var(--line)', background: 'rgba(5,6,15,.6)', color: 'var(--ink)' }}
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>Source URL *</span>
              <input
                required type="url"
                value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://dribbble.com/shots/…"
                className={FIELD + ' border'}
                style={{ borderColor: 'var(--line)', background: 'rgba(5,6,15,.6)', color: 'var(--ink)' }}
              />
            </label>

            {/* source-type override chips — auto-detected one is badged */}
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_TYPES.map((s) => {
                const active = sourceType === s;
                const isAuto = !typeManual && s === autoType && sourceUrl.trim().length > 0;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setSourceType(s); setTypeManual(true); }}
                    className="mono rounded-full px-2.5 py-1 text-[10.5px] transition-colors border"
                    style={active
                      ? { borderColor: 'color-mix(in srgb, var(--vio) 70%, transparent)', background: 'color-mix(in srgb, var(--vio) 16%, transparent)', color: '#d8b4fe', boxShadow: '0 0 14px rgba(168,85,247,.25)' }
                      : { borderColor: 'var(--line)', background: 'transparent', color: 'var(--mute)' }}
                  >
                    {s}{isAuto ? ' · auto' : ''}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>Domain</span>
                <input
                  value={domain} onChange={(e) => setDomain(e.target.value)}
                  placeholder="fintech, saas…"
                  className={FIELD + ' border'}
                  style={{ borderColor: 'var(--line)', background: 'rgba(5,6,15,.6)', color: 'var(--ink)' }}
                />
              </label>
              <label className="block">
                <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>Thumbnail URL</span>
                <input
                  type="url"
                  value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://…/preview.png"
                  className={FIELD + ' border'}
                  style={{ borderColor: 'var(--line)', background: 'rgba(5,6,15,.6)', color: 'var(--ink)' }}
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>Style tags</span>
              <input
                value={styleTags} onChange={(e) => setStyleTags(e.target.value)}
                placeholder="glassmorphism, dark, bold-type"
                className={FIELD + ' border text-xs'}
                style={{ borderColor: 'var(--line)', background: 'rgba(5,6,15,.6)', color: 'var(--ink)' }}
              />
            </label>

            <label className="block">
              <span className="block text-[length:var(--t-cap)] mb-1" style={{ color: 'var(--mute)' }}>Notes</span>
              <textarea
                rows={2}
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="What's worth stealing from this reference."
                className={FIELD + ' border resize-y'}
                style={{ borderColor: 'var(--line)', background: 'rgba(5,6,15,.6)', color: 'var(--ink)' }}
              />
            </label>

            {error ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button" onClick={close}
                className="rounded-lg border px-4 py-2 text-[length:var(--t-label)]"
                style={{ borderColor: 'var(--line)', color: 'var(--mute)' }}
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                className="mono rounded-lg px-4 py-2 text-[length:var(--t-cap)] font-bold disabled:opacity-50"
                style={{ color: '#070811', background: 'linear-gradient(92deg,var(--cyan),#7ce8f7)', boxShadow: '0 0 22px rgba(34,211,238,.35)' }}
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>

          {/* ── live preview of the gallery card ── */}
          <div className="mt-5 md:mt-0 md:pl-6" style={{ background: 'rgba(5,6,15,.4)' }}>
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
                {notes.trim() && <p className="mt-1 text-[10.5px] leading-relaxed line-clamp-3" style={{ color: 'var(--mute)' }}>{notes}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="mono text-[9px] rounded px-1.5 py-0.5 border" style={{ color: '#d8b4fe', borderColor: 'color-mix(in srgb, var(--vio) 30%, transparent)', background: 'color-mix(in srgb, var(--vio) 12%, transparent)' }}>{sourceType}</span>
                  {styleChips.slice(0, 3).map((t) => (
                    <span key={t} className="mono text-[9px] rounded px-1.5 py-0.5 border" style={{ color: 'var(--mute)', borderColor: 'var(--line)' }}>{t}</span>
                  ))}
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
