'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import {
  FILTER_CONTROL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from '@/components/ui/FilterBar';

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

export interface EditableComponent {
  id: string;
  name: string;
  category: string | null;
  library: string | null;
  quality_grade: string | null;
  source_url: string | null;
  preview_url: string | null;
  description: string | null;
  primary_file: string | null;
  framework_tags: string[] | null;
  tags: string[] | null;
  dependencies: string[] | null;
}

interface EditComponentModalProps {
  component: EditableComponent;
  categories: string[];
  libraries: string[];
}

export function EditComponentModal({ component, categories, libraries }: EditComponentModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get('action') === 'edit';

  const [name, setName] = useState(component.name);
  const [category, setCategory] = useState(component.category ?? '');
  const [library, setLibrary] = useState(component.library ?? '');
  const [newLibrary, setNewLibrary] = useState('');
  const [quality, setQuality] = useState(component.quality_grade ?? 'B');
  const [sourceUrl, setSourceUrl] = useState(component.source_url ?? '');
  const [previewUrl, setPreviewUrl] = useState(component.preview_url ?? '');
  const [description, setDescription] = useState(component.description ?? '');
  const [primaryFile, setPrimaryFile] = useState(component.primary_file ?? '');
  const [sourceCode, setSourceCode] = useState('');
  const [frameworkTags, setFrameworkTags] = useState((component.framework_tags ?? []).join(', '));
  const [tags, setTags] = useState((component.tags ?? []).join(', '));
  const [dependencies, setDependencies] = useState((component.dependencies ?? []).join(', '));

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  // Re-sync from props whenever the modal (re)opens — props are the source of truth.
  useEffect(() => {
    if (open) {
      setName(component.name);
      setCategory(component.category ?? '');
      setLibrary(component.library ?? '');
      setNewLibrary('');
      setQuality(component.quality_grade ?? 'B');
      setSourceUrl(component.source_url ?? '');
      setPreviewUrl(component.preview_url ?? '');
      setDescription(component.description ?? '');
      setPrimaryFile(component.primary_file ?? '');
      setSourceCode('');
      setFrameworkTags((component.framework_tags ?? []).join(', '));
      setTags((component.tags ?? []).join(', '));
      setDependencies((component.dependencies ?? []).join(', '));
      setError(null);
    }
  }, [open, component]);

  function close() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('action');
    router.replace(pathname + (next.toString() ? '?' + next.toString() : ''));
  }

  function parseChips(s: string): string[] | null {
    const arr = s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    return arr.length > 0 ? arr : [];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
      const body: Record<string, unknown> = { name };
      body.category = category || null;
      const lib = library === '__new__' ? newLibrary.trim() : library;
      body.library = lib || null;
      body.quality_grade = quality || null;
      body.source_url = sourceUrl || null;
      body.preview_url = previewUrl || null;
      body.description = description || null;
      if (primaryFile) body.primary_file = primaryFile;
      if (sourceCode.trim()) body.source_code = sourceCode;
      body.framework_tags = parseChips(frameworkTags);
      body.tags = parseChips(tags);
      body.dependencies = parseChips(dependencies);

      const res = await fetch(`/api/master-components/${component.id}`, {
        method: 'PATCH',
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
      title={`Edit ${component.id}`}
      description="Updates the master_components row. Leave source code blank to keep the file on disk unchanged."
      widthClass="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Name *</span>
          <input
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={FILTER_CONTROL_CLASSES + ' w-full'}
          />
        </label>

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

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Source URL</span>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://github.com/.../component.tsx"
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Preview URL <span className="text-zinc-600">(screenshot / demo / gist)</span></span>
            <input
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="https://…/preview.png"
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Description</span>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            Source code below is written to <code className="font-mono text-zinc-400">/asset-library/{component.id}/{primaryFile || 'index.tsx'}</code> only if non-empty.
          </div>
        </div>

        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Source code <span className="text-zinc-600">(leave blank to keep the existing file)</span></span>
          <textarea
            rows={8}
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            placeholder="Paste replacement source here to overwrite the file on disk…"
            className={FILTER_CONTROL_CLASSES + ' w-full font-mono text-xs resize-y'}
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Framework tags</span>
            <input value={frameworkTags} onChange={(e) => setFrameworkTags(e.target.value)} placeholder="react, tailwind" className={FILTER_CONTROL_CLASSES + ' w-full text-xs'} />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Tags</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="animated, modern" className={FILTER_CONTROL_CLASSES + ' w-full text-xs'} />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Dependencies</span>
            <input value={dependencies} onChange={(e) => setDependencies(e.target.value)} placeholder="motion, clsx" className={FILTER_CONTROL_CLASSES + ' w-full text-xs'} />
          </label>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={close} className={SECONDARY_BUTTON_CLASSES}>Cancel</button>
          <button type="submit" disabled={submitting} className={PRIMARY_BUTTON_CLASSES + ' disabled:opacity-50'}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
