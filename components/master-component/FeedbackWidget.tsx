'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import {
  FILTER_CONTROL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from '@/components/ui/FilterBar';

interface FeedbackRow {
  id: number;
  project_slug: string;
  verdict: 'good' | 'bad' | 'needs-fix' | 'classification-wrong';
  note: string | null;
  created_at: number;
}

interface ProjectOption {
  slug: string;
  display_name: string;
}

interface FeedbackWidgetProps {
  mcId: string;
  projects: ProjectOption[];
  initialFeedback: FeedbackRow[];
}

const VERDICT_OPTIONS: Array<{ value: FeedbackRow['verdict']; label: string; icon: string; tone: 'shipped' | 'blocked' | 'open' | 'neutral' }> = [
  { value: 'good', label: 'good', icon: '👍', tone: 'shipped' },
  { value: 'bad', label: 'bad', icon: '👎', tone: 'blocked' },
  { value: 'needs-fix', label: 'needs-fix', icon: '🔧', tone: 'open' },
  { value: 'classification-wrong', label: 'classification wrong', icon: '✏', tone: 'neutral' },
];

export function FeedbackWidget({ mcId, projects, initialFeedback }: FeedbackWidgetProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedProject, setSelectedProject] = useState(projects[0]?.slug ?? '');
  const [verdict, setVerdict] = useState<FeedbackRow['verdict']>('good');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>(initialFeedback);

  // Keep feedback in sync if parent passes new rows (e.g. after router.refresh()).
  useEffect(() => {
    setFeedback(initialFeedback);
  }, [initialFeedback]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
      const res = await fetch('/api/component-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mc_id: mcId,
          project_slug: selectedProject,
          verdict,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'request failed' }));
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      const { feedback: newRow } = await res.json();
      setFeedback((prev) => [newRow, ...prev]);
      setNote('');
      startTransition(() => router.refresh());
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Feedback</h3>
        <p className="text-xs text-zinc-500">No projects yet — feedback opens once a project is registered.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Mark this component</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">From project</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            >
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Verdict</span>
            <select
              value={verdict}
              onChange={(e) => setVerdict(e.target.value as FeedbackRow['verdict'])}
              className={FILTER_CONTROL_CLASSES + ' w-full'}
            >
              {VERDICT_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.icon} {v.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 'use for project landing pages' or 'misclassified — should be Display'"
            className={FILTER_CONTROL_CLASSES + ' w-full text-xs'}
            maxLength={500}
          />
        </label>
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={submitting || !selectedProject} className={PRIMARY_BUTTON_CLASSES + ' text-xs disabled:opacity-50'}>
            {submitting ? 'Saving…' : 'Record'}
          </button>
        </div>
      </form>

      {feedback.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800/60">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">history ({feedback.length})</div>
          <ul className="space-y-2">
            {feedback.slice(0, 5).map((f) => {
              const meta = VERDICT_OPTIONS.find((v) => v.value === f.verdict);
              return (
                <li key={f.id} className="flex items-start gap-3 text-xs">
                  <Badge variant="status" tone={meta?.tone ?? 'neutral'}>
                    {meta?.icon} {meta?.label ?? f.verdict}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <code className="font-mono text-[10px] text-zinc-500">{f.project_slug}</code>
                    {f.note && <p className="text-zinc-300 mt-0.5">{f.note}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
