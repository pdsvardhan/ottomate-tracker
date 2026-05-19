// Trace report viewer — the gaslighting-prevention payoff (R8.5).
// Shows: raw text → locked items → verifier verdicts per item → integrate timestamp.
// Spotlight Glass redesign — iteration #6 item 50.

import type { schema } from '@/lib/db/client';
import { Badge } from '@/components/ui/Badge';

type Iteration = typeof schema.iterations.$inferSelect;
type Item = typeof schema.iteration_items.$inferSelect;
type Report = typeof schema.reports.$inferSelect;

type LockAudit = {
  locked_at?: string;
  item_count?: number;
  rejected_count?: number;
  notes?: string | null;
};

const RECO_TONE: Record<string, 'shipped' | 'open' | 'blocked'> = {
  APPROVE: 'shipped',
  ITERATE: 'open',
  BLOCK: 'blocked',
};

export function TraceReport({
  iteration,
  items,
  report,
}: {
  iteration: Iteration;
  items: Item[];
  report: Report | null;
}) {
  const audit = (iteration.lock_in_audit as LockAudit | null) ?? null;
  const verifiedCount = items.filter((i) => i.status === 'verified' || i.status === 'integrated').length;
  const rejectedCount = items.filter((i) => i.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Integrate banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-xl p-4 flex items-center gap-3">
        <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
        <p className="text-sm text-emerald-200">
          Integrated{' '}
          {iteration.integrated_at && (
            <span className="font-mono text-xs text-emerald-300">
              {new Date(iteration.integrated_at).toLocaleString()}
            </span>
          )}
          <span className="ml-3 text-xs text-emerald-300/70">
            {verifiedCount} verified · {rejectedCount} rejected · {items.length} total
          </span>
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-7rem)] overflow-auto">
          <h2 className="text-sm font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent mb-3">
            What you asked for
          </h2>
          {report?.raw_text ? (
            <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{report.raw_text}</p>
          ) : (
            <p className="text-xs text-zinc-600 italic">— no raw text linked</p>
          )}
          {audit?.locked_at && (
            <div className="mt-4 pt-4 border-t border-zinc-800/40 text-[11px] text-zinc-500 space-y-1">
              <div>
                <span className="text-zinc-600">locked:</span>{' '}
                <span className="font-mono">{new Date(audit.locked_at).toLocaleString()}</span>
              </div>
              {audit.item_count != null && (
                <div>
                  <span className="text-zinc-600">items at lock:</span>{' '}
                  <span className="text-zinc-400">{audit.item_count}</span>
                  {audit.rejected_count != null && audit.rejected_count > 0 && (
                    <span className="text-rose-400/80"> · {audit.rejected_count} rejected pre-lock</span>
                  )}
                </div>
              )}
              {audit.notes && (
                <p className="mt-2 text-zinc-400 italic line-clamp-3">"{audit.notes}"</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            What actually got built
          </h2>
          {items.map((item) => {
            const verifierResult = item.verifier_result as {
              recommendation?: string;
              reason?: string;
              mandatory_user_review?: boolean;
            } | null;
            const reco = verifierResult?.recommendation;
            const recoTone = reco ? RECO_TONE[reco] : undefined;
            const isRejected = item.status === 'rejected';
            const isVerified = item.status === 'verified' || item.status === 'integrated';

            const surface = isRejected
              ? 'border-zinc-800/40 bg-zinc-950/40 opacity-70'
              : 'border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl';

            return (
              <div key={item.id} className={'rounded-2xl border p-4 ' + surface}>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.item_type && <Badge variant="tag">{item.item_type}</Badge>}
                    {item.target_kind && (
                      <Badge variant="tag">{item.target_kind}{item.target_id ? `:${item.target_id}` : ''}</Badge>
                    )}
                    {reco && recoTone ? (
                      <Badge variant="status" tone={recoTone}>{reco}</Badge>
                    ) : isVerified ? (
                      <Badge variant="status" tone="shipped">{item.status}</Badge>
                    ) : (
                      <Badge variant="status" tone={isRejected ? 'blocked' : 'neutral'}>{item.status}</Badge>
                    )}
                    {verifierResult?.mandatory_user_review && (
                      <Badge variant="status" tone="open">⚠ user review</Badge>
                    )}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{item.title}</h3>
                {item.description && (
                  <p className="mt-1.5 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed">
                    {item.description}
                  </p>
                )}
                {verifierResult?.reason && (
                  <div className="mt-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">verifier</span>
                    <p className="text-[11px] text-zinc-300 italic mt-0.5">{verifierResult.reason}</p>
                  </div>
                )}
                {item.notes && (
                  <details className="mt-2 text-[11px] text-zinc-500">
                    <summary className="cursor-pointer hover:text-zinc-300 transition-colors">
                      notes
                    </summary>
                    <p className="mt-1 whitespace-pre-wrap text-zinc-400">{item.notes}</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
