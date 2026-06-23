'use client';

import { useMemo, useState } from 'react';

interface SourceFile {
  name: string;
  content: string;
  size: number;
  ext: string;
}

interface PreviewInfo {
  status: string;
  reason: string | null;
  iframe: boolean;
  shot: boolean;
}

interface LivePreviewProps {
  componentId: string;
  files: SourceFile[];
  /** Manifest entry from `npm run build:previews` (iter-77). Null = not built. */
  preview: PreviewInfo | null;
}

/**
 * Manifest-driven preview pane (iter-77, replaces the Sandpack CDN bundler).
 *
 * - `iframe` components → serve the prebuilt esbuild bundle from /api/previews.
 * - HTML-bundle components → render an srcdoc iframe from their source files.
 * - everything else → a graceful reason-panel explaining why it can't render
 *   standalone. The preview pane never shows a github/upstream link.
 */
export function LivePreview({ componentId, files, preview }: LivePreviewProps) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [activeFile, setActiveFile] = useState<string>(files[0]?.name ?? '');

  const html = useMemo(() => files.find((f) => f.ext === '.html'), [files]);
  const css = useMemo(() => files.filter((f) => f.ext === '.css' || f.ext === '.scss'), [files]);
  const js = useMemo(
    () => files.filter((f) => f.ext === '.js' && !files.find((g) => g.ext === '.tsx' || g.ext === '.jsx')),
    [files],
  );

  const isHtml = (preview?.status === 'html') || (!preview && Boolean(html));

  const srcdoc = useMemo(() => {
    if (!html) return null;
    let bundled = html.content;
    const cssBlocks = css.filter((f) => !bundled.includes(`href="${f.name}"`)).map((f) => `<style>\n${f.content}\n</style>`);
    const jsBlocks = js.filter((f) => !bundled.includes(`src="${f.name}"`)).map((f) => `<script>\n${f.content}\n</script>`);
    if (cssBlocks.length > 0) {
      const head = bundled.indexOf('</head>');
      bundled = head !== -1 ? bundled.slice(0, head) + cssBlocks.join('\n') + bundled.slice(head) : cssBlocks.join('\n') + bundled;
    }
    if (jsBlocks.length > 0) {
      const body = bundled.indexOf('</body>');
      bundled = body !== -1 ? bundled.slice(0, body) + jsBlocks.join('\n') + bundled.slice(body) : bundled + jsBlocks.join('\n');
    }
    return bundled;
  }, [html, css, js]);

  const live = Boolean(preview?.iframe);
  const previewable = live || (isHtml && srcdoc);

  if (files.length === 0 && !preview) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-900/60 bg-zinc-950/30 backdrop-blur p-12 text-center">
        <p className="text-sm text-zinc-400">No source files on disk yet for this component.</p>
      </div>
    );
  }

  function renderPane() {
    if (live) {
      return (
        <iframe
          src={`/api/previews/${componentId}/index.html`}
          title={`${componentId} preview`}
          className="w-full h-[520px] bg-[#0a0a0f]"
          sandbox="allow-scripts"
          loading="lazy"
        />
      );
    }
    if (isHtml && srcdoc) {
      return (
        <iframe
          srcDoc={srcdoc}
          title={`${componentId} preview`}
          className="w-full h-[520px] bg-white"
          sandbox="allow-scripts"
        />
      );
    }
    return <ReasonPanel preview={preview} onSource={() => setTab('code')} />;
  }

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={'rounded-lg px-3 py-1.5 text-xs transition-colors ' + (tab === 'preview' ? 'bg-cyan-500/10 text-cyan-200 border border-cyan-500/30' : 'text-zinc-400 hover:text-zinc-200 border border-transparent')}
          >
            Preview{!previewable && <span className="ml-1 text-[10px] text-zinc-600">(deferred)</span>}
          </button>
          <button
            type="button"
            onClick={() => setTab('code')}
            className={'rounded-lg px-3 py-1.5 text-xs transition-colors ' + (tab === 'code' ? 'bg-cyan-500/10 text-cyan-200 border border-cyan-500/30' : 'text-zinc-400 hover:text-zinc-200 border border-transparent')}
          >
            Source ({files.length})
          </button>
        </div>
        {tab === 'code' && (
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {files.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setActiveFile(f.name)}
                className={'rounded-md px-2 py-1 text-[10px] font-mono transition-colors ' + (activeFile === f.name ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300')}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'preview' ? (
        renderPane()
      ) : (
        <pre className="p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[520px] overflow-y-auto leading-relaxed bg-zinc-950/60">
          {files.find((f) => f.name === activeFile)?.content ?? files[0]?.content ?? ''}
        </pre>
      )}
    </div>
  );
}

function ReasonPanel({ preview, onSource }: { preview: PreviewInfo | null; onSource: () => void }) {
  const reason =
    preview?.reason ??
    (preview ? 'This component does not render standalone in the preview sandbox.' : 'Preview not built yet — run `npm run build:previews`.');
  return (
    <div className="p-10 text-center bg-zinc-950/40">
      <p className="text-sm text-zinc-300">Renders inside the app, not in an isolated sandbox.</p>
      <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">{reason}</p>
      {preview?.status && (
        <span className="mt-3 inline-block rounded-full border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-0.5 text-[10px] font-mono text-zinc-400">
          {preview.status}
        </span>
      )}
      <div>
        <button type="button" onClick={onSource} className="mt-3 text-xs text-cyan-300 hover:text-cyan-100 transition-colors">
          View source →
        </button>
      </div>
    </div>
  );
}
