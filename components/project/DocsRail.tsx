'use client';

// DocsRail — renders a project's public_docs as cards (type chip · title · summary ·
// read-time, ordered by frontmatter `order`) that open a slide-over markdown reader.
// Doc metadata lives in each doc's YAML frontmatter (parsed here); the stored body is
// the full markdown including that frontmatter. iter-7 (WS-F).

import { useState } from 'react';
import Link from 'next/link';
import { marked } from 'marked';

interface DocRow {
  doc_name: string;
  body: string;
  mirrored_at: number | Date | null;
}

interface ParsedDoc {
  doc_name: string;
  type: string;
  title: string;
  summary: string;
  order: number;
  readMinutes: number;
  content: string;
}

const TYPE_META: Record<string, { label: string; accent: string }> = {
  thesis: { label: 'Thesis', accent: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10' },
  validation: { label: 'Validation', accent: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  retrospective: { label: 'Retrospective', accent: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
  'technical-deep-dive': { label: 'Deep dive', accent: 'text-violet-300 border-violet-500/30 bg-violet-500/10' },
};

function typeMeta(t: string) {
  return TYPE_META[t] ?? { label: t.replace(/-/g, ' '), accent: 'text-zinc-300 border-zinc-700 bg-zinc-800/40' };
}

function parseDoc(d: DocRow): ParsedDoc {
  const meta: Record<string, string> = {};
  let content = d.body;
  const m = d.body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_]+)\s*:\s*(.+?)\s*$/);
      if (kv) meta[kv[1].toLowerCase()] = kv[2].replace(/^["']|["']$/g, '').trim();
    }
    content = d.body.slice(m[0].length);
  }
  const type = (meta.type || d.doc_name).toLowerCase();
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = meta.read_minutes
    ? parseInt(meta.read_minutes, 10) || 1
    : Math.max(1, Math.round(words / 200));
  return {
    doc_name: d.doc_name,
    type,
    title: meta.title || typeMeta(type).label,
    summary: meta.summary || '',
    order: meta.order ? parseInt(meta.order, 10) || 99 : 99,
    readMinutes,
    content,
  };
}

const MD_CLASSES =
  'text-sm text-zinc-300 leading-relaxed ' +
  '[&>h1]:text-lg [&>h1]:font-semibold [&>h1]:text-zinc-100 [&>h1]:mt-5 [&>h1]:mb-2 ' +
  '[&>h2]:text-base [&>h2]:font-semibold [&>h2]:text-zinc-100 [&>h2]:mt-5 [&>h2]:mb-2 ' +
  '[&>h3]:text-sm [&>h3]:font-semibold [&>h3]:text-zinc-200 [&>h3]:mt-4 [&>h3]:mb-1 ' +
  '[&>p]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 ' +
  '[&_li]:my-1 [&_a]:text-cyan-300 [&_a]:underline [&_strong]:text-zinc-100 [&_strong]:font-semibold ' +
  '[&_code]:font-mono [&_code]:text-cyan-200 [&_code]:text-[12px] ' +
  '[&_table]:w-full [&_table]:text-xs [&_table]:my-3 [&_th]:text-left [&_th]:text-zinc-300 [&_th]:border-b [&_th]:border-zinc-800 [&_th]:py-1 [&_th]:pr-3 ' +
  '[&_td]:py-1 [&_td]:pr-3 [&_td]:border-b [&_td]:border-zinc-900 [&_td]:align-top ' +
  '[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_blockquote]:my-3 ' +
  '[&_hr]:border-zinc-800 [&_hr]:my-4';

export function DocsRail({ docs, repoUrl }: { docs: DocRow[]; repoUrl: string | null }) {
  const parsed = docs.map(parseDoc).sort((a, b) => a.order - b.order);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const open = openIdx !== null ? parsed[openIdx] : null;

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">Documentation</h3>
        {repoUrl && (
          <Link
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-cyan-300 hover:text-cyan-100 transition-colors"
          >
            View repo →
          </Link>
        )}
      </div>

      {parsed.length === 0 ? (
        <p className="text-xs text-zinc-600 italic leading-relaxed">
          Add <code className="font-mono text-zinc-500">public_docs/*.md</code> with frontmatter
          (<code className="font-mono text-zinc-500">public: true</code>,{' '}
          <code className="font-mono text-zinc-500">type</code>,{' '}
          <code className="font-mono text-zinc-500">title</code>,{' '}
          <code className="font-mono text-zinc-500">summary</code>,{' '}
          <code className="font-mono text-zinc-500">order</code>) to the repo. Types: thesis · validation ·
          retrospective · technical-deep-dive. The pack-up mirror ingests them on next sync.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {parsed.map((d, i) => {
            const tm = typeMeta(d.type);
            return (
              <button
                key={d.doc_name}
                type="button"
                onClick={() => setOpenIdx(i)}
                className="text-left rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-3 hover:border-zinc-700/80 hover:bg-zinc-900/50 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[10px] font-medium uppercase tracking-wide rounded px-1.5 py-0.5 border ${tm.accent}`}>
                    {tm.label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600">{d.readMinutes} min</span>
                </div>
                <div className="text-sm text-zinc-100 group-hover:text-cyan-100 transition-colors">{d.title}</div>
                {d.summary && <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{d.summary}</div>}
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpenIdx(null)}
            aria-hidden
          />
          <div className="relative w-full max-w-2xl h-full overflow-y-auto bg-zinc-950 border-l border-zinc-800 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur z-10">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 text-[10px] font-medium uppercase tracking-wide rounded px-1.5 py-0.5 border ${typeMeta(open.type).accent}`}>
                  {typeMeta(open.type).label}
                </span>
                <h4 className="text-sm font-semibold text-zinc-100 truncate">{open.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setOpenIdx(null)}
                className="shrink-0 text-zinc-400 hover:text-zinc-100 text-xl leading-none px-1"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <article
              className={`px-6 py-5 ${MD_CLASSES}`}
              dangerouslySetInnerHTML={{ __html: marked.parse(open.content, { async: false }) as string }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
