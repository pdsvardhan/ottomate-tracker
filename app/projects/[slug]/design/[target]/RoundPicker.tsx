'use client';

// The per-sub-decision pick UI. One row per axis; the owner picks a VALUE, not a
// panel — a mix across variants is the normal outcome (doctrine 38), so every row
// records which variant its winning value came from (`mixed_from`).
//
// Every write goes through the existing ledger API, which owns the state machine:
// a lock needs confirmed:true (422 lock_not_earned otherwise, G3 rule 12) and an
// unlock needs a reason (422 unlock_requires_reason, G3 rule 13). This component
// deliberately surfaces those 422 details verbatim rather than swallowing them.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import {
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
  FILTER_CONTROL_CLASSES,
} from '@/components/ui/FilterBar';

export interface LedgerDecision {
  id: number;
  axis: string;
  status: string;
  rung: number | null;
  round: number;
  variants_shown: Record<string, unknown> | null;
  chosen_value: string | null;
  mixed_from: { variant?: string } | null;
  rejected: Array<{ value?: unknown; from?: string; why_rejected?: string }> | null;
  rationale: string | null;
  confirmed: boolean;
}

const FRAME_HEIGHTS = [700, 1000, 1400, 2000];

function offeredEntries(d: LedgerDecision): Array<[string, string]> {
  const vs = d.variants_shown;
  if (!vs || typeof vs !== 'object') return [];
  return Object.entries(vs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([slot, v]) => [slot, String(v)] as [string, string]);
}

async function patchDecision(id: number, body: Record<string, unknown>) {
  const token =
    typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
  const res = await fetch(`/api/design-decisions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json?.detail ? ` — ${json.detail}` : '';
    throw new Error(`${json?.error ?? `HTTP ${res.status}`}${detail}`);
  }
  return json;
}

export function RoundPicker({
  target,
  round,
  previewUrl,
  decisions,
}: {
  target: string;
  round: number;
  previewUrl: string | null;
  decisions: LedgerDecision[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [frameH, setFrameH] = useState(FRAME_HEIGHTS[1]);

  // decisionId → chosen slot key
  const initialSel = useMemo(() => {
    const m: Record<number, string> = {};
    for (const d of decisions) {
      const fromVariant = d.mixed_from?.variant;
      if (fromVariant) m[d.id] = fromVariant;
      else if (d.chosen_value != null) {
        const hit = offeredEntries(d).find(([, v]) => v === d.chosen_value);
        if (hit) m[d.id] = hit[0];
      }
    }
    return m;
  }, [decisions]);

  const [sel, setSel] = useState<Record<number, string>>(initialSel);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | 'all' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [unlockFor, setUnlockFor] = useState<number | null>(null);
  const [unlockReason, setUnlockReason] = useState('');

  const dirty = decisions.filter(
    (d) => d.status !== 'locked' && sel[d.id] && sel[d.id] !== initialSel[d.id],
  );

  function setErr(key: string, msg: string | null) {
    setErrors((e) => {
      const next = { ...e };
      if (msg) next[key] = msg;
      else delete next[key];
      return next;
    });
  }

  function pickBody(d: LedgerDecision, slot: string) {
    const offered = offeredEntries(d);
    const chosen = offered.find(([s]) => s === slot);
    if (!chosen) return null;
    const rejected = offered
      .filter(([s, v]) => s !== slot && v !== chosen[1])
      .map(([s, v]) => ({ value: v, from: s, why_rejected: 'not selected in the per-item pick' }));
    const note = notes[d.id]?.trim();
    return {
      chosen_value: chosen[1],
      mixed_from: { variant: slot },
      rejected,
      status: 'in-review',
      rationale: note
        ? `${note}\n[picked in-app ${new Date().toISOString()}] ${chosen[1]} from ${slot}`
        : `Selected ${chosen[1]} for ${d.axis} (from variant ${slot}), picked in-app on round ${round}.`,
    };
  }

  async function saveAll() {
    if (dirty.length === 0) return;
    setBusy('all');
    setErr('all', null);
    try {
      for (const d of dirty) {
        const body = pickBody(d, sel[d.id]);
        if (body) await patchDecision(d.id, body);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setErr('all', String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  async function lockOne(d: LedgerDecision) {
    const value = d.chosen_value;
    if (!value) return;
    const confirmationText =
      `Lock ${d.axis} = ${value}? A locked axis becomes a frozen control: later rounds will not ` +
      `re-offer it, and any rebuild that silently changes it is blocked by the regression gate ` +
      `until you unlock with a reason.`;
    if (!window.confirm(confirmationText)) return;
    setBusy(d.id);
    setErr(String(d.id), null);
    try {
      await patchDecision(d.id, {
        status: 'locked',
        confirmed: true,
        confirmation_text_shown: confirmationText,
      });
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(String(d.id), String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  async function unlockOne(d: LedgerDecision) {
    if (unlockReason.trim().length < 10) {
      setErr(String(d.id), 'An unlock reason of at least 10 characters is required (G3 rule 13).');
      return;
    }
    setBusy(d.id);
    setErr(String(d.id), null);
    try {
      await patchDecision(d.id, { status: 'in-review', unlock_reason: unlockReason.trim() });
      setUnlockFor(null);
      setUnlockReason('');
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(String(d.id), String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── the round, rendered ───────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800/60">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-zinc-300">Round preview</span>
            {previewUrl ? (
              <code className="text-[10px] font-mono text-zinc-600 truncate">{previewUrl}</code>
            ) : null}
          </div>
          <div className="shrink-0 flex items-center gap-1">
            {FRAME_HEIGHTS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setFrameH(h)}
                className={
                  'rounded-md border px-2 py-1 text-[11px] transition-colors ' +
                  (h === frameH
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-300')
                }
              >
                {h}px
              </button>
            ))}
            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
              >
                Open standalone ↗
              </a>
            ) : null}
          </div>
        </div>
        {previewUrl ? (
          <iframe
            src={previewUrl}
            title={`${target} round ${round}`}
            style={{ height: frameH }}
            className="w-full block bg-white"
          />
        ) : (
          <p className="px-4 py-8 text-center text-xs text-zinc-500">
            No preview_url on this round&apos;s rows — the decisions were recorded without a
            published render.
          </p>
        )}
      </section>

      {/* ── the picks ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-200">
            Pick a value per sub-decision
            <span className="ml-2 font-normal text-xs text-zinc-500">
              a mix across variants is the normal outcome
            </span>
          </h2>
          <button
            type="button"
            onClick={saveAll}
            disabled={dirty.length === 0 || busy !== null}
            className={PRIMARY_BUTTON_CLASSES + ' text-xs disabled:opacity-40'}
          >
            {busy === 'all' ? 'Saving…' : `Save ${dirty.length || ''} pick${dirty.length === 1 ? '' : 's'}`}
          </button>
        </div>

        {errors.all ? (
          <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {errors.all}
          </div>
        ) : null}

        <div className="space-y-3">
          {decisions.map((d) => {
            const offered = offeredEntries(d);
            const locked = d.status === 'locked';
            const chosenSlot = sel[d.id];
            return (
              <div
                key={d.id}
                className={
                  'rounded-2xl border p-4 backdrop-blur-xl ' +
                  (locked
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : d.status === 'in-review'
                      ? 'border-amber-500/20 bg-amber-500/[0.04]'
                      : 'border-zinc-800/60 bg-zinc-900/30')
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <code className="text-xs font-mono text-zinc-200">{d.axis}</code>
                    {d.chosen_value ? (
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        current: <span className="text-zinc-300 font-mono">{d.chosen_value}</span>
                        {d.mixed_from?.variant ? ` · from ${d.mixed_from.variant}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {d.rung != null ? <Badge variant="tag">rung {d.rung}</Badge> : null}
                    <Badge
                      variant="status"
                      tone={
                        locked ? 'done' : d.status === 'in-review' ? 'open' : d.status === 'rejected' ? 'deprecated' : 'neutral'
                      }
                    >
                      {d.status}
                    </Badge>
                  </div>
                </div>

                {offered.length === 0 ? (
                  <p className="mt-3 text-[11px] text-zinc-500 italic">
                    No variants_shown recorded for this axis — nothing to pick from.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {offered.map(([slot, value]) => {
                      const active = chosenSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={locked || busy !== null}
                          onClick={() => setSel((s) => ({ ...s, [d.id]: slot }))}
                          className={
                            'rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed ' +
                            (active
                              ? 'border-cyan-500/50 bg-cyan-500/10'
                              : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700')
                          }
                        >
                          <span className="block text-[10px] uppercase tracking-wider text-zinc-500">
                            {slot}
                          </span>
                          <span
                            className={
                              'block text-xs font-mono ' + (active ? 'text-cyan-100' : 'text-zinc-300')
                            }
                          >
                            {value}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {d.rejected && d.rejected.length > 0 ? (
                  <p className="mt-2 text-[11px] text-zinc-600">
                    previously rejected:{' '}
                    {d.rejected.map((r, i) => (
                      <span key={i} className="font-mono line-through mr-2">
                        {String(r.value)}
                      </span>
                    ))}
                  </p>
                ) : null}

                {!locked ? (
                  <div className="mt-3 flex items-end gap-2">
                    <label className="flex-1 min-w-0">
                      <span className="block text-[11px] text-zinc-500 mb-1">
                        Why this one? (optional — appended to the uncapped rationale)
                      </span>
                      <input
                        type="text"
                        value={notes[d.id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                        placeholder="the reaction, not the adjective"
                        className={FILTER_CONTROL_CLASSES + ' w-full text-xs'}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => lockOne(d)}
                      disabled={!d.chosen_value || busy !== null}
                      title={d.chosen_value ? 'Lock this axis' : 'Save a pick before locking'}
                      className={SECONDARY_BUTTON_CLASSES + ' text-xs disabled:opacity-40'}
                    >
                      {busy === d.id ? 'Working…' : 'Lock'}
                    </button>
                  </div>
                ) : unlockFor === d.id ? (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={unlockReason}
                      onChange={(e) => setUnlockReason(e.target.value)}
                      placeholder="Why reopen a locked decision? (≥10 chars, stored on the row)"
                      className={FILTER_CONTROL_CLASSES + ' w-full text-xs'}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setUnlockFor(null); setUnlockReason(''); }}
                        className={SECONDARY_BUTTON_CLASSES + ' text-xs'}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => unlockOne(d)}
                        disabled={busy !== null || unlockReason.trim().length < 10}
                        className={PRIMARY_BUTTON_CLASSES + ' text-xs disabled:opacity-40'}
                      >
                        Unlock
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setUnlockFor(d.id)}
                      className={SECONDARY_BUTTON_CLASSES + ' text-xs'}
                    >
                      Unlock…
                    </button>
                  </div>
                )}

                {errors[String(d.id)] ? (
                  <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                    {errors[String(d.id)]}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
