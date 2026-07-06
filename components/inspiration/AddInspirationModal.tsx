'use client';

// Add-inspiration modal (owner ask 2026-07-06). Mirrors AddComponentModal:
// toggled by ?action=new on /inspirations, POSTs to the existing /api/inspirations
// write endpoint (bearer token from sessionStorage), then refreshes the gallery.

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import {
  FILTER_CONTROL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from '@/components/ui/FilterBar';

const SOURCE_TYPES = ['dribbble', 'figma-community', 'behance', 'mobbin', 'other'] as const;

export function AddInspirationModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get('action') === 'new';

  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState<string>('dribbble');
  const [domain, setDomain] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [styleTags, setStyleTags] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setId(''); setTitle(''); setSourceUrl(''); setSourceType('dribbble');
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

  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (!o) close(); }}
      title="Add inspiration"
      description="Creates an inspirations row (Dribbble, Figma community, Behance, Mobbin, …)."
      widthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">ID *</span>
            <input
              required
              pattern="insp-[a-z0-9-]+"
              minLength={5}
              maxLength={80}
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="insp-glass-dashboard"
              className={FILTER_CONTROL_CLASSES + ' w-full font-mono'}
            />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Title *</span>
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Glassy analytics dashboard"
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            />
          </label>
        </div>

        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Source URL *</span>
            <input
              required
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://dribbble.com/shots/…"
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Source type *</span>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={FILTER_CONTROL_CLASSES + ' w-full'}>
              {SOURCE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Domain</span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="fintech, saas, portfolio…"
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Thumbnail URL</span>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://…/preview.png"
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Style tags</span>
          <input
            value={styleTags}
            onChange={(e) => setStyleTags(e.target.value)}
            placeholder="glassmorphism, dark, bold-type"
            className={FILTER_CONTROL_CLASSES + ' w-full text-xs'}
          />
        </label>

        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Notes</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What's worth stealing from this reference."
            className={FILTER_CONTROL_CLASSES + ' w-full resize-y'}
          />
        </label>

        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={close} className={SECONDARY_BUTTON_CLASSES}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={PRIMARY_BUTTON_CLASSES + ' disabled:opacity-50'}>
            {submitting ? 'Saving…' : 'Save inspiration'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
