'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Badge } from '@/components/ui/Badge';
import { PRIMARY_BUTTON_CLASSES, SECONDARY_BUTTON_CLASSES, FILTER_CONTROL_CLASSES } from '@/components/ui/FilterBar';

interface ComponentSlot {
  id: number;
  name: string;
  category: string | null;
  purpose_on_page: string | null;
  picked: boolean;
  asset_library_ref: string | null;
  skip_reason: string | null;
}

interface MasterOption {
  id: string;
  name: string;
  description: string | null;
  library: string | null;
  quality_grade: 'A' | 'B' | 'C' | null;
  tags: string[] | null;
  source_paths: string[] | null;
  relevance_score: number;
}

interface PickSlotProps {
  slot: ComponentSlot;
  options: MasterOption[];
}

export function PickSlot({ slot, options }: PickSlotProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipMode, setSkipMode] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  async function submit(body: Record<string, unknown>) {
    setError(null);
    setSubmitting(true);
    try {
      const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
      const res = await fetch(`/api/components/${slot.id}/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'request failed' }));
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handlePick(masterId: string) {
    submit({ asset_library_ref: masterId });
  }

  function handleSkip() {
    if (skipReason.trim().length < 10) {
      setError('Skip reason must be at least 10 characters.');
      return;
    }
    submit({ skip_reason: skipReason.trim() });
  }

  function handleReset() {
    // Re-open by clearing pick state (POST with skip → null both, then user picks again).
    // For now: just nudge user via re-pick — backend currently doesn't have an "unpick" path,
    // so a fresh pick (new asset_library_ref) overrides.
  }

  // If already picked or skipped, show resolved state with re-do option.
  if (slot.picked && slot.asset_library_ref) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-baseline gap-2">
              <h4 className="text-sm font-semibold text-zinc-100">{slot.name}</h4>
              {slot.category && <Badge variant="tag">{slot.category}</Badge>}
            </div>
            {slot.purpose_on_page && (
              <p className="text-xs text-zinc-400 mt-1">{slot.purpose_on_page}</p>
            )}
          </div>
          <Badge variant="status" tone="shipped">picked</Badge>
        </div>
        <div className="mt-2 text-xs text-emerald-200 font-mono">
          → {slot.asset_library_ref}
        </div>
      </div>
    );
  }

  if (slot.skip_reason) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-baseline gap-2">
              <h4 className="text-sm font-semibold text-zinc-100">{slot.name}</h4>
              {slot.category && <Badge variant="tag">{slot.category}</Badge>}
            </div>
            {slot.purpose_on_page && (
              <p className="text-xs text-zinc-400 mt-1">{slot.purpose_on_page}</p>
            )}
          </div>
          <Badge variant="status" tone="open">skipped</Badge>
        </div>
        <p className="mt-2 text-xs text-amber-200/80 italic">"{slot.skip_reason}"</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <h4 className="text-sm font-semibold text-zinc-100">{slot.name}</h4>
            {slot.category && <Badge variant="tag">{slot.category}</Badge>}
          </div>
          {slot.purpose_on_page && (
            <p className="text-xs text-zinc-400 mt-1">{slot.purpose_on_page}</p>
          )}
        </div>
        <Badge variant="status" tone="neutral">unpicked</Badge>
      </div>

      {!skipMode ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {options.slice(0, 3).map((opt) => (
              <SpotlightCard
                key={opt.id}
                onClick={() => handlePick(opt.id)}
                className="!p-3"
              >
                <code className="text-[10px] font-mono text-zinc-500 block mb-1.5 truncate">{opt.id}</code>
                <h5 className="text-sm font-semibold text-zinc-100 group-hover:text-cyan-200 transition-colors">
                  {opt.name}
                </h5>
                {opt.description && (
                  <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{opt.description}</p>
                )}
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  {opt.library && <Badge variant="library">{opt.library}</Badge>}
                  {opt.quality_grade && <Badge variant="quality" grade={opt.quality_grade} />}
                </div>
              </SpotlightCard>
            ))}
          </div>

          {options.length > 3 && (
            <p className="mt-3 text-[11px] text-zinc-500">
              showing top 3 of {options.length} matches
            </p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSkipMode(true)}
              disabled={submitting}
              className={SECONDARY_BUTTON_CLASSES + ' text-xs disabled:opacity-50'}
            >
              Skip with reason…
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Why skip this slot?</span>
            <textarea
              rows={2}
              minLength={10}
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="e.g. handled by parent layout component; not needed for v1; etc."
              className={FILTER_CONTROL_CLASSES + ' w-full resize-y text-xs'}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setSkipMode(false); setSkipReason(''); setError(null); }}
              className={SECONDARY_BUTTON_CLASSES + ' text-xs'}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting || skipReason.trim().length < 10}
              className={PRIMARY_BUTTON_CLASSES + ' text-xs disabled:opacity-50'}
            >
              {submitting ? 'Saving…' : 'Save skip reason'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
}
