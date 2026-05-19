'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import {
  FILTER_CONTROL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from '@/components/ui/FilterBar';

interface AddComponentModalProps {
  /** All known category IDs (passed from server page). */
  categories: string[];
  /** All known library names (passed from server page; "" or '__new__' lets user type). */
  libraries: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  input: 'Inputs',
  selection: 'Selection',
  'button-action': 'Buttons & Actions',
  display: 'Display',
  navigation: 'Navigation',
  feedback: 'Feedback',
  overlay: 'Overlay',
  layout: 'Layout',
  animation: 'Animation primitives',
  transition: 'Transitions',
  dataviz: 'Data visualisation',
  media: 'Media',
  'modern-specialty': 'Modern / Specialty',
  interactive: 'Interactive Behaviours',
  'forms-validation': 'Forms & Validation',
  'auth-screens': 'Auth screens',
  'dashboard-shells': 'Dashboard shells',
  'ai-blocks': 'AI blocks',
};

export function AddComponentModal({ categories, libraries }: AddComponentModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get('action') === 'new';

  // Form state
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [library, setLibrary] = useState('');
  const [newLibrary, setNewLibrary] = useState('');
  const [quality, setQuality] = useState('B');
  const [sourceUrl, setSourceUrl] = useState('');
  const [description, setDescription] = useState('');
  const [primaryFile, setPrimaryFile] = useState('index.tsx');
  const [sourceCode, setSourceCode] = useState('');
  const [frameworkTags, setFrameworkTags] = useState('');
  const [tags, setTags] = useState('');
  const [dependencies, setDependencies] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setId(''); setName(''); setCategory(''); setLibrary(''); setNewLibrary('');
      setQuality('B'); setSourceUrl(''); setDescription(''); setPrimaryFile('index.tsx');
      setSourceCode(''); setFrameworkTags(''); setTags(''); setDependencies('');
      setError(null);
    }
  }, [open]);

  function close() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('action');
    router.replace('/components-browser' + (next.toString() ? '?' + next.toString() : ''));
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
        name,
      };
      if (category) body.category = category;
      const lib = library === '__new__' ? newLibrary.trim() : library;
      if (lib) body.library = lib;
      if (quality) body.quality_grade = quality;
      if (sourceUrl) body.source_url = sourceUrl;
      if (description) body.description = description;
      if (primaryFile) body.primary_file = primaryFile;
      if (sourceCode.trim()) body.source_code = sourceCode;
      const ft = parseChips(frameworkTags); if (ft) body.framework_tags = ft;
      const tg = parseChips(tags); if (tg) body.tags = tg;
      const dp = parseChips(dependencies); if (dp) body.dependencies = dp;
      body.ingestion_method = 'manual';

      const res = await fetch('/api/master-components', {
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
      title="Add component to catalog"
      description="Creates a master_components row. If source code is provided, the file is written to /asset-library/<id>/<primary_file>."
      widthClass="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">ID *</span>
            <input
              required
              pattern="mc-[a-z0-9-]+"
              minLength={4}
              maxLength={80}
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="mc-glass-card"
              className={FILTER_CONTROL_CLASSES + ' w-full font-mono'}
            />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Name *</span>
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Glass Card"
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={FILTER_CONTROL_CLASSES + ' w-full'}>
              <option value="">—</option>
              {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Library</span>
            <select value={library} onChange={(e) => setLibrary(e.target.value)} className={FILTER_CONTROL_CLASSES + ' w-full'}>
              <option value="">—</option>
              {libraries.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value="__new__">+ new…</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Quality</span>
            <select value={quality} onChange={(e) => setQuality(e.target.value)} className={FILTER_CONTROL_CLASSES + ' w-full'}>
              <option value="A">A — hand-curated</option>
              <option value="B">B — usable</option>
              <option value="C">C — orphan / placeholder</option>
            </select>
          </label>
        </div>

        {library === '__new__' && (
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">New library name</span>
            <input
              value={newLibrary}
              onChange={(e) => setNewLibrary(e.target.value)}
              placeholder="e.g. my-custom-kit"
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            />
          </label>
        )}

        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Source URL</span>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://github.com/.../some-component.tsx"
            className={FILTER_CONTROL_CLASSES + ' w-full'}
          />
        </label>

        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Description</span>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One-sentence summary of what this component does."
            className={FILTER_CONTROL_CLASSES + ' w-full resize-y'}
          />
        </label>

        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Primary file</span>
            <input
              value={primaryFile}
              onChange={(e) => setPrimaryFile(e.target.value)}
              placeholder="index.tsx"
              className={FILTER_CONTROL_CLASSES + ' w-full font-mono'}
            />
          </label>
          <div className="text-xs text-zinc-500 self-end pb-2">
            Written to <code className="font-mono text-zinc-400">/asset-library/{id || '&lt;id&gt;'}/{primaryFile || 'index.tsx'}</code>
          </div>
        </div>

        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Source code <span className="text-zinc-600">(optional — leave blank for metadata-only entry)</span></span>
          <textarea
            rows={10}
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            placeholder="Paste the component source here…"
            className={FILTER_CONTROL_CLASSES + ' w-full font-mono text-xs resize-y'}
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Framework tags</span>
            <input
              value={frameworkTags}
              onChange={(e) => setFrameworkTags(e.target.value)}
              placeholder="react, tailwind"
              className={FILTER_CONTROL_CLASSES + ' w-full text-xs'}
            />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Tags</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="animated, modern, hover"
              className={FILTER_CONTROL_CLASSES + ' w-full text-xs'}
            />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Dependencies</span>
            <input
              value={dependencies}
              onChange={(e) => setDependencies(e.target.value)}
              placeholder="motion, clsx"
              className={FILTER_CONTROL_CLASSES + ' w-full text-xs'}
            />
          </label>
        </div>

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
            {submitting ? 'Saving…' : 'Save component'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
