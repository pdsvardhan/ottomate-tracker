'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import {
  FILTER_CONTROL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from '@/components/ui/FilterBar';

interface ProjectOption {
  slug: string;
  display_name: string;
}

interface FlowOption {
  id: string;
  title: string;
  project_slug: string;
}

interface SubmitBugModalProps {
  projects: ProjectOption[];
  flows: FlowOption[];
}

export function SubmitBugModal({ projects, flows }: SubmitBugModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get('action') === 'new';

  const [projectSlug, setProjectSlug] = useState(projects[0]?.slug ?? '');
  const [flowId, setFlowId] = useState('');
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setFlowId('');
      setRawText('');
      setError(null);
    }
  }, [open]);

  function close() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('action');
    router.replace('/inbox' + (next.toString() ? '?' + next.toString() : ''));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rawText.trim().length < 10) {
      setError('Bug description must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
      const body: Record<string, unknown> = {
        raw_text: rawText.trim(),
        source: 'tracker-flow-bug',
      };
      if (flowId) body.flow_id = flowId;

      const res = await fetch(`/api/projects/${projectSlug}/reports`, {
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

  const projectFlows = flows.filter((f) => f.project_slug === projectSlug);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (!o) close(); }}
      title="Submit a bug"
      description="Routes to Stage 4 intake — the report sits in this inbox until you classify it from a project session."
      widthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Project *</span>
          <select
            required
            value={projectSlug}
            onChange={(e) => { setProjectSlug(e.target.value); setFlowId(''); }}
            className={FILTER_CONTROL_CLASSES + ' w-full'}
          >
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.display_name}
              </option>
            ))}
          </select>
        </label>

        {projectFlows.length > 0 && (
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Flow (optional)</span>
            <select
              value={flowId}
              onChange={(e) => setFlowId(e.target.value)}
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            >
              <option value="">— project-level (no specific flow) —</option>
              {projectFlows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">What's broken? *</span>
          <textarea
            required
            minLength={10}
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Describe what you tested, what happened, and what you expected. Be specific — Claude will classify this into structured items at /iterations/<n>."
            className={FILTER_CONTROL_CLASSES + ' w-full resize-y'}
          />
          <span className="block mt-1 text-[10px] text-zinc-600">
            {rawText.length} chars · minimum 10
          </span>
        </label>

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={close} className={SECONDARY_BUTTON_CLASSES}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || rawText.trim().length < 10}
            className={PRIMARY_BUTTON_CLASSES + ' disabled:opacity-50'}
          >
            {submitting ? 'Submitting…' : 'Submit bug'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
