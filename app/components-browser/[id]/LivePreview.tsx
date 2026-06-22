'use client';

import { useMemo, useState } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import { ComponentPreview } from '@/components/master-component/ComponentPreview';

interface SourceFile {
  name: string;
  content: string;
  size: number;
  ext: string;
}

interface LivePreviewProps {
  componentId: string;
  files: SourceFile[];
  /** Catalog-declared npm dependencies for this component (master_components.dependencies). */
  dependencies?: string[];
  /** Curated screenshot / live-demo URL (master_components.preview_url). */
  previewUrl?: string | null;
}

// Packages the Sandpack react-ts template already provides — never re-declare these.
const SANDPACK_BUILTIN = new Set(['react', 'react-dom', 'react/jsx-runtime']);

// Packages / module families that need real app context (providers, server runtime,
// API keys) and therefore cannot render standalone in a Sandpack sandbox. Components
// importing these get a graceful "renders in context" panel instead of a hard error.
const NEEDS_CONTEXT_PKG = new Set([
  '@assistant-ui/react', '@ai-sdk/react', 'ai', 'server-only', 'next-auth',
]);
const NEEDS_CONTEXT_IMPORT_RE = /from\s+['"](?:next\/(?:navigation|headers|server|cache)|next-auth|server-only)['"]/;

/** Reduce an import specifier to its installable package name (null for relative imports). */
function packageName(spec: string): string | null {
  if (!spec || spec.startsWith('.') || spec.startsWith('/')) return null;
  const parts = spec.split('/');
  if (spec.startsWith('@')) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  return parts[0];
}

/**
 * Derive the Sandpack dependency map from (a) the catalog's declared dependencies and
 * (b) bare import specifiers scanned from the source. This is the fix for the
 * "Could not find dependency: 'motion'" error — e.g. `import { motion } from 'motion/react'`
 * resolves to the `motion` package. Versions pin to "latest"; Sandpack resolves from the CDN.
 */
function deriveDependencies(sources: string[], declared: string[]): Record<string, string> {
  const deps: Record<string, string> = {};
  for (const d of declared) {
    const p = packageName(d);
    if (p && !SANDPACK_BUILTIN.has(p)) deps[p] = 'latest';
  }
  const importRe = /(?:from\s*|import\s*|require\(\s*)['"]([^'"]+)['"]/g;
  for (const src of sources) {
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(src)) !== null) {
      const p = packageName(m[1]);
      if (p && !SANDPACK_BUILTIN.has(p) && !(p in deps)) deps[p] = 'latest';
    }
  }
  return deps;
}

/** True if the component imports anything that needs real app context (won't render standalone). */
function needsAppContext(deps: Record<string, string>, sources: string[]): boolean {
  for (const p of Object.keys(deps)) if (NEEDS_CONTEXT_PKG.has(p)) return true;
  return sources.some((s) => NEEDS_CONTEXT_IMPORT_RE.test(s));
}

/**
 * Live preview for a master_component's source files.
 *
 * Strategy (preview pane priority):
 * - A curated preview_url (screenshot or live-demo) -> render it (item 258).
 * - HTML bundle (index.html + sibling .css + .js) -> iframe with srcdoc.
 * - TSX/JSX self-contained -> Sandpack provider (react-ts template); the component's npm
 *   dependencies are forwarded to Sandpack customSetup so third-party imports (motion,
 *   framer-motion, etc.) resolve instead of erroring (item 257).
 * - TSX/JSX needing app context (providers / server / auth) -> graceful "renders in
 *   context" panel routing to source + upstream, instead of a hard Sandpack error (item 258).
 * - PUG / unknown: source only.
 * - No source: empty state.
 */
export function LivePreview({ componentId, files, dependencies = [], previewUrl = null }: LivePreviewProps) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [forceLive, setForceLive] = useState(false);
  const [activeFile, setActiveFile] = useState<string>(files[0]?.name ?? '');

  const html = useMemo(() => files.find((f) => f.ext === '.html'), [files]);
  const css = useMemo(() => files.filter((f) => f.ext === '.css' || f.ext === '.scss'), [files]);
  const js = useMemo(() => files.filter((f) => f.ext === '.js' && !files.find((g) => g.ext === '.tsx' || g.ext === '.jsx')), [files]);
  const tsxOrJsx = useMemo(
    () => files.find((f) => f.ext === '.tsx' || f.ext === '.jsx' || f.ext === '.ts'),
    [files],
  );

  const previewableHtml = Boolean(html);
  const previewableTsx = Boolean(tsxOrJsx);

  const srcdoc = useMemo(() => {
    if (!html) return null;
    let bundled = html.content;
    const cssBlocks = css
      .filter((f) => !bundled.includes(`href="${f.name}"`))
      .map((f) => `<style>\n${f.content}\n</style>`);
    const jsBlocks = js
      .filter((f) => !bundled.includes(`src="${f.name}"`))
      .map((f) => `<script>\n${f.content}\n</script>`);
    if (cssBlocks.length > 0) {
      const headClose = bundled.indexOf('</head>');
      if (headClose !== -1) {
        bundled = bundled.slice(0, headClose) + cssBlocks.join('\n') + bundled.slice(headClose);
      } else {
        bundled = cssBlocks.join('\n') + bundled;
      }
    }
    if (jsBlocks.length > 0) {
      const bodyClose = bundled.indexOf('</body>');
      if (bodyClose !== -1) {
        bundled = bundled.slice(0, bodyClose) + jsBlocks.join('\n') + bundled.slice(bodyClose);
      } else {
        bundled = bundled + jsBlocks.join('\n');
      }
    }
    return bundled;
  }, [html, css, js]);

  // Build Sandpack files map for the TSX/JSX preview.
  const sandpackFiles = useMemo(() => {
    if (!tsxOrJsx) return null;
    const cssBlob = css.map((f) => f.content).join('\n\n');
    // Baseline so component content is visible (dark bg, centered) even when the
    // component ships no CSS of its own; component CSS (if any) follows and can override.
    const baseline = ':root{color-scheme:dark}body{margin:0;min-height:100vh;background:#0a0a0f;color:#e4e4e7;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}#root{width:100%}';
    const cssFile = baseline + '\n' + (cssBlob.trim().length > 0 ? cssBlob : '');
    // Wrap component source in a minimal App that imports it via default export.
    // If the source already exports a default React component, we just mount it.
    // Otherwise we render a placeholder.
    const wrapped = `${tsxOrJsx.content}\n\n// - Sandpack mount -\n// (Default export is rendered automatically when /App.tsx exports it.)\n`;
    return {
      '/App.tsx': wrapped,
      '/styles.css': cssFile,
      '/index.tsx': [
        `import React from 'react';`,
        `import { createRoot } from 'react-dom/client';`,
        `import './styles.css';`,
        `import * as Mod from './App';`,
        ``,
        `// Mount the default export, or the first exported React component (named`,
        `// exports are common in the catalog, e.g. \`export const Sparkline\`).`,
        `const Cmp = (Mod as any).default ?? Object.values(Mod).find((v) => typeof v === 'function');`,
        `const root = createRoot(document.getElementById('root')!);`,
        `root.render(Cmp ? React.createElement(Cmp as any) : React.createElement('pre', { style: { color: '#e4e4e7', padding: 16 } }, 'No default or named React component export found — see the Source tab.'));`,
      ].join('\n'),
      '/public/index.html': [
        `<!doctype html>`,
        `<html><head>`,
        `  <meta charset="utf-8" />`,
        `  <title>Sandpack preview</title>`,
        `  <script src="https://cdn.tailwindcss.com"></script>`,
        `  <style>body{background:#0a0a0f;color:#e4e4e7;margin:0;padding:1rem;font-family:system-ui,sans-serif;}</style>`,
        `</head><body><div id="root"></div></body></html>`,
      ].join('\n'),
    };
  }, [tsxOrJsx, css]);

  // Iteration #6 item 257: forward declared + scanned dependencies to Sandpack.
  const customSetup = useMemo(() => {
    if (!tsxOrJsx) return undefined;
    const sources = files
      .filter((f) => f.ext === '.tsx' || f.ext === '.ts' || f.ext === '.jsx' || f.ext === '.js')
      .map((f) => f.content);
    const deps = deriveDependencies(sources, dependencies);
    return Object.keys(deps).length > 0 ? { dependencies: deps } : undefined;
  }, [tsxOrJsx, files, dependencies]);

  // Iteration #6 item 258: components that need app context won't render in Sandpack.
  const needsContext = useMemo(() => {
    if (!tsxOrJsx) return false;
    const sources = files
      .filter((f) => f.ext === '.tsx' || f.ext === '.ts' || f.ext === '.jsx' || f.ext === '.js')
      .map((f) => f.content);
    const deps = deriveDependencies(sources, dependencies);
    return needsAppContext(deps, sources);
  }, [tsxOrJsx, files, dependencies]);

  if (files.length === 0 && !previewUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-900/60 bg-zinc-950/30 backdrop-blur p-12 text-center">
        <p className="text-sm text-zinc-400">No source files on disk yet for this component.</p>
        <p className="mt-1 text-xs text-zinc-600">
          Add source via the catalog editor or upload to <code className="font-mono">/asset-library/components/{componentId}/</code>.
        </p>
      </div>
    );
  }

  // Decide what the preview pane shows. A curated preview_url wins unless the user
  // explicitly asks to run the live sandbox (forceLive) on a self-contained component.
  const canRunLive = previewableTsx && !needsContext && Boolean(sandpackFiles);
  const showImage = Boolean(previewUrl) && !(forceLive && canRunLive);

  function renderPreview() {
    if (showImage) {
      return (
        <div className="p-3 bg-zinc-950/40">
          <ComponentPreview previewUrl={previewUrl ?? null} />
          {canRunLive && (
            <button
              type="button"
              onClick={() => setForceLive(true)}
              className="mt-2 text-[11px] text-cyan-300 hover:text-cyan-100 transition-colors"
            >
              ▷ Run live preview instead
            </button>
          )}
        </div>
      );
    }
    if (previewableHtml && srcdoc) {
      return (
        <iframe
          srcDoc={srcdoc}
          title={`${componentId} live preview`}
          className="w-full h-[520px] bg-white"
          sandbox="allow-scripts"
        />
      );
    }
    if (canRunLive && sandpackFiles) {
      return (
        <div className="bg-zinc-950/80">
          <Sandpack
            template="react-ts"
            files={sandpackFiles}
            customSetup={customSetup}
            theme="dark"
            options={{
              showNavigator: false,
              showTabs: false,
              showLineNumbers: false,
              showInlineErrors: true,
              editorHeight: 520,
              editorWidthPercentage: 0,
              wrapContent: false,
            }}
          />
        </div>
      );
    }
    if (previewableTsx && needsContext) {
      return (
        <div className="p-10 text-center bg-zinc-950/40">
          <p className="text-sm text-zinc-300">Renders inside the app, not in an isolated sandbox.</p>
          <p className="mt-1 text-xs text-zinc-500">
            This component needs app context (providers, server runtime, or auth), so a standalone
            live preview would fail. View the full implementation in the Source tab.
          </p>
          <button
            type="button"
            onClick={() => setTab('code')}
            className="mt-3 text-xs text-cyan-300 hover:text-cyan-100 transition-colors"
          >
            View source →
          </button>
        </div>
      );
    }
    return (
      <div className="p-10 text-center bg-zinc-950/40">
        <p className="text-sm text-zinc-300">Live preview not available for this file type.</p>
        <p className="mt-1 text-xs text-zinc-500">
          {files.map((f) => f.ext).filter((v, i, a) => a.indexOf(v) === i).join(', ')} — only .html or .tsx/.jsx bundles render live.
        </p>
        <p className="mt-3 text-xs text-zinc-600">Use the Source tab.</p>
      </div>
    );
  }

  const previewableAtAll = showImage || previewableHtml || previewableTsx;

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl overflow-hidden">
      {/* Tab switcher */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={
              'rounded-lg px-3 py-1.5 text-xs transition-colors ' +
              (tab === 'preview'
                ? 'bg-cyan-500/10 text-cyan-200 border border-cyan-500/30'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent')
            }
          >
            Preview{' '}
            {!previewableAtAll && (
              <span className="ml-1 text-[10px] text-zinc-600">(deferred)</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('code')}
            className={
              'rounded-lg px-3 py-1.5 text-xs transition-colors ' +
              (tab === 'code'
                ? 'bg-cyan-500/10 text-cyan-200 border border-cyan-500/30'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent')
            }
          >
            Source ({files.length})
          </button>
        </div>
        {tab === 'code' && (
          <div className="flex items-center gap-1">
            {files.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setActiveFile(f.name)}
                className={
                  'rounded-md px-2 py-1 text-[10px] font-mono transition-colors ' +
                  (activeFile === f.name
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300')
                }
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content area */}
      {tab === 'preview' ? (
        renderPreview()
      ) : (
        <pre className="p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[520px] overflow-y-auto leading-relaxed bg-zinc-950/60">
          {files.find((f) => f.name === activeFile)?.content ?? files[0]?.content ?? ''}
        </pre>
      )}
    </div>
  );
}
