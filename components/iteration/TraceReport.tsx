// Trace report viewer — the gaslighting-prevention payoff (R8.5).
// Shows: raw text → locked items → verifier verdicts per item → integrate timestamp.

import type { schema } from '@/lib/db/client';

type Iteration = typeof schema.iterations.$inferSelect;
type Item = typeof schema.iteration_items.$inferSelect;
type Report = typeof schema.reports.$inferSelect;

type LockAudit = {
  locked_at?: string;
  item_count?: number;
  rejected_count?: number;
  notes?: string | null;
};

const RECO_COLOURS: Record<string, string> = {
  APPROVE: 'text-emerald-400 border-emerald-900/60 bg-emerald-950/30',
  ITERATE: 'text-amber-400 border-amber-900/60 bg-amber-950/30',
  BLOCK: 'text-rose-400 border-rose-900/60 bg-rose-950/30',
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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-sm text-emerald-300">
        ✓ Integrated at {iteration.integrated_at && new Date(iteration.integrated_at).toLocaleString()}.
      </div>

      <section className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">What you asked for</h2>
          {report?.raw_text ? (
            <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{report.raw_text}</p>
          ) : (
            <p className="text-xs text-zinc-600">— no raw text linked</p>
          )}
          {audit?.locked_at && (
            <p className="mt-3 pt-3 border-t border-zinc-800 text-[11px] text-zinc-500">
              Locked {new Date(audit.locked_at).toLocaleString()}
              {audit.item_count != null && <> · {audit.item_count} item{audit.item_count === 1 ? '' : 's'}</>}
              {audit.rejected_count != null && audit.rejected_count > 0 && <> · {audit.rejected_count} rejected pre-lock</>}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">What actually got built</h2>
          {items.map((item) => {
            const verifierResult = item.verifier_result as { recommendation?: string; reason?: string; mandatory_user_review?: boolean } | null;
            const reco = verifierResult?.recommendation;
            const recoClass = reco ? RECO_COLOURS[reco] : 'text-zinc-500 border-zinc-800';
            const isRejected = item.status === 'rejected';
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${isRejected ? 'border-zinc-900 bg-zinc-950/40' : 'border-zinc-800 bg-zinc-900/40'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-400">
                        {item.item_type}
                      </span>
                      {item.target_kind && (
                        <span className="text-[10px] text-zinc-500">→ {item.target_kind}{item.target_id ? `:${item.target_id}` : ''}</span>
                      )}
                      <span className={`text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 ${isRejected ? 'border-zinc-800 text-zinc-500' : reco ? recoClass : 'border-zinc-800 text-zinc-500'}`}>
                        {reco ?? item.status}
                      </span>
                      {verifierResult?.mandatory_user_review && (
                        <span className="text-[10px] text-amber-400">⚠ user review</span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-zinc-100">{item.title}</h3>
                    {item.description && (
                      <p className="mt-1 text-xs text-zinc-400 whitespace-pre-wrap">{item.description}</p>
                    )}
                    {verifierResult?.reason && (
                      <p className="mt-2 text-[11px] text-zinc-500 italic">verifier: {verifierResult.reason}</p>
                    )}
                    {item.notes && (
                      <p className="mt-2 text-[11px] text-zinc-600">{item.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
