'use client';

// Owner rating for a master_component (iter-15). Replaces the per-project
// "mark this component" feedback widget — the owner wanted ONE global taste
// rating, not per-project usage tracking. Stored in the existing quality_grade
// column (A/B/C → Standout/Solid/Fine) so no schema migration is needed; writes
// via PATCH /api/master-components/[id] with the sessionStorage bearer.

import { useState } from 'react';
import { useViewer } from '@/components/auth/ViewerContext';

export const RATING_TIERS = [
  { grade: 'A', label: 'Standout', dots: 3, hue: 'var(--cyan)' },
  { grade: 'B', label: 'Solid', dots: 2, hue: 'var(--vio)' },
  { grade: 'C', label: 'Fine', dots: 1, hue: 'var(--amber)' },
] as const;

export const RATING_LABEL: Record<string, string> = { A: 'Standout', B: 'Solid', C: 'Fine' };

type Grade = 'A' | 'B' | 'C';

export function RatingControl({ id, initial }: { id: string; initial: Grade | null }) {
  const { owner } = useViewer();
  const [grade, setGrade] = useState<Grade | null>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // iter-208 #1509: rating is an owner control. The visitor view shows the current rating as a
  // read-only pill (nothing when unrated); the PATCH would 401 without the owner's token anyway.
  if (!owner) {
    const tier = RATING_TIERS.find((t) => t.grade === grade);
    if (!tier) return null;
    return (
      <span
        className="mono text-[length:var(--t-cap)] font-semibold rounded-lg px-3 py-1.5"
        style={{ color: '#070811', background: tier.hue }}
      >
        <span aria-hidden style={{ letterSpacing: '1px', marginRight: 6 }}>{'●'.repeat(tier.dots)}</span>
        {tier.label}
      </span>
    );
  }

  async function set(g: Grade) {
    const next = grade === g ? null : g; // click active tier again to clear
    const prev = grade;
    setGrade(next);
    setSaving(true);
    setErr(null);
    try {
      const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('ottomate_token') : null;
      const res = await fetch(`/api/master-components/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ quality_grade: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ? String(j.error) : `HTTP ${res.status}`);
        setGrade(prev);
      }
    } catch (e) {
      setErr(String(e));
      setGrade(prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="mono text-[length:var(--t-cap)] tracking-wide" style={{ color: 'var(--dim)' }}>rating</span>
      <div className="inline-flex rounded-xl border p-1 gap-1" style={{ borderColor: 'var(--line)', background: 'rgba(12,11,28,.5)' }}>
        {RATING_TIERS.map((t) => {
          const active = grade === t.grade;
          return (
            <button
              key={t.grade}
              type="button"
              disabled={saving}
              onClick={() => set(t.grade as Grade)}
              className="rounded-lg px-3 py-1.5 mono text-[length:var(--t-cap)] font-semibold transition-all disabled:opacity-60"
              style={active
                ? { color: '#070811', background: t.hue, boxShadow: `0 0 18px color-mix(in srgb, ${t.hue} 45%, transparent)` }
                : { color: 'var(--mute)', background: 'transparent' }}
              title={`Mark as ${t.label}`}
            >
              <span aria-hidden style={{ letterSpacing: '1px', marginRight: 6, opacity: active ? 1 : 0.6 }}>
                {'●'.repeat(t.dots)}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>
      {err && <span className="text-[length:var(--t-cap)]" style={{ color: 'var(--color-rose)' }}>{err}</span>}
    </div>
  );
}
