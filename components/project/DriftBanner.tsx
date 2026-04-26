// Banner: shown above project detail when any of the project's YAML
// mirrors have drifted from the recorded hash. Codex P0 #2 — give the
// user a chance to reconcile before the next DB → YAML pack-up
// overwrites their manual edits.

import { scanDrift } from '@/lib/sync/drift';

export async function DriftBanner({ slug }: { slug: string }) {
  let entries: Awaited<ReturnType<typeof scanDrift>> = [];
  try {
    entries = await scanDrift(slug);
  } catch (err) {
    console.warn('[ottomate] DriftBanner scan failed:', err);
    return null;
  }
  const drifted = entries.filter((e) => e.state === 'drifted');
  if (drifted.length === 0) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-200">
      <div className="flex items-start gap-3">
        <span className="mt-0.5">⚠️</span>
        <div className="flex-1">
          <strong className="block">Drift detected</strong>
          <p className="mt-1 text-xs text-amber-300/80">
            {drifted.length} YAML mirror{drifted.length === 1 ? '' : 's'} on disk no longer match
            the last pack-up. Edits made manually (or via <code className="font-mono">git pull</code>)
            will be overwritten on the next DB → YAML sync. Reconcile before packing up.
          </p>
          <ul className="mt-2 space-y-0.5 text-[11px] font-mono text-amber-300/70">
            {drifted.map((d) => (
              <li key={d.doc_name}>
                · {d.doc_name} — {d.current_hash} (was {d.recorded_hash})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
