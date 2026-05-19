// DocsRail — renders the 3 public_docs (architecture-summary / feature-spec-public /
// adr-summary) inline as collapsible sections + a "view full docs in repo" link.

import Link from 'next/link';

interface DocRow {
  doc_name: string;
  body: string;
  mirrored_at: number | Date | null;
}

const TITLE_LABELS: Record<string, string> = {
  'architecture-summary': 'Architecture summary',
  'feature-spec-public': 'Public feature spec',
  'adr-summary': 'ADR summary',
};

function timeAgo(value: number | Date | null): string {
  if (!value) return '';
  const ts = value instanceof Date ? value.getTime() / 1000 : value;
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (diff < 86400) return `synced ${Math.floor(diff / 3600)}h ago`;
  return `synced ${Math.floor(diff / 86400)}d ago`;
}

export function DocsRail({ docs, repoUrl }: { docs: DocRow[]; repoUrl: string | null }) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">Docs</h3>
        {repoUrl && (
          <Link
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-cyan-300 hover:text-cyan-100 transition-colors"
          >
            View full docs in repo →
          </Link>
        )}
      </div>

      {docs.length === 0 ? (
        <p className="text-xs text-zinc-600 italic">
          Author <code className="font-mono text-zinc-500">public_docs/architecture-summary.md</code>,{' '}
          <code className="font-mono text-zinc-500">feature-spec-public.md</code>, and{' '}
          <code className="font-mono text-zinc-500">adr-summary.md</code> in the repo. The pack-up mirror
          ingests them into <code className="font-mono text-zinc-500">project_docs</code> on next sync.
        </p>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <details key={d.doc_name} className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-3 py-2">
              <summary className="cursor-pointer flex items-center justify-between gap-2 list-none">
                <span className="text-sm text-zinc-200">
                  {TITLE_LABELS[d.doc_name] ?? d.doc_name}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">{timeAgo(d.mirrored_at)}</span>
              </summary>
              <div className="mt-3 pt-3 border-t border-zinc-800/40 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {d.body}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
