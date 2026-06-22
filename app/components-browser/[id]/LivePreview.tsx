'use client';

import { useMemo, useState } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import { ComponentPreview } from '@/components/master-component/ComponentPreview';
import { SANDBOX_SHIM_FILES, SANDBOX_SHIM_DEPS } from './preview-shims';

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

const CODE_EXTS = new Set(['.tsx', '.ts', '.jsx', '.js']);

/** Reduce an import specifier to its installable package name (null for relative/alias). */
function packageName(spec: string): string | null {
  if (!spec || spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/')) return null;
  const parts = spec.split('/');
  if (spec.startsWith('@')) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  return parts[0];
}

const IMPORT_RE = /(?:from\s*|import\s*|require\(\s*)['"]([^'"]+)['"]/g;

function collectSpecifiers(sources: string[]): string[] {
  const out: string[] = [];
  for (const src of sources) {
    let m: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src)) !== null) out.push(m[1]);
  }
  return out;
}

/** `@/x` -> `./x` so shadcn-convention imports resolve against the sandbox root. */
function rewriteAliases(src: string): string {
  return src.replace(/(['"])@\//g, '$1./');
}

/**
 * Derive Sandpack npm dependencies from declared deps + scanned bare-package imports,
 * plus the shims' own deps (clsx / tailwind-merge for the cn() helper).
 */
function deriveDependencies(sources: string[], declared: string[]): Record<string, string> {
  const deps: Record<string, string> = { ...SANDBOX_SHIM_DEPS };
  for (const d of declared) {
    const p = packageName(d);
    if (p && !SANDPACK_BUILTIN.has(p)) deps[p] = 'latest';
  }
  for (const spec of collectSpecifiers(sources)) {
    const p = packageName(spec);
    if (p && !SANDPACK_BUILTIN.has(p) && !(p in deps)) deps[p] = 'latest';
  }
  return deps;
}

function needsAppContext(sources: string[]): boolean {
  for (const spec of collectSpecifiers(sources)) {
    if (NEEDS_CONTEXT_PKG.has(packageName(spec) ?? '')) return true;
  }
  return sources.some((s) => NEEDS_CONTEXT_IMPORT_RE.test(s));
}

/**
 * Can this component bundle in the sandbox? Every relative / `@/` import must resolve
 * to a file we provide (a sibling on disk or a bundled shim). An unresolved alias
 * (e.g. `@/lib/chartUtils`, `@/context/*`) means a hard bundler failure, so we route
 * those to the graceful "renders in context" panel instead of a broken sandbox.
 */
function allImportsResolvable(sources: string[], placedPaths: Set<string>): boolean {
  const candidates = (base: string): string[] => [
    base,
    ...['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'].map((e) => base + e),
    ...['/index.ts', '/index.tsx', '/index.js', '/index.jsx'].map((e) => base + e),
  ];
  for (const spec of collectSpecifiers(sources)) {
    let base: string | null = null;
    if (spec.startsWith('@/')) base = '/' + spec.slice(2);
    else if (spec.startsWith('./')) base = '/' + spec.slice(2);
    else if (spec.startsWith('../')) return false; // escapes sandbox root
    else continue; // bare package — CDN-resolved
    if (!candidates(base).some((c) => placedPaths.has(c))) return false;
  }
  return true;
}

const SHIM_PATHS = Object.keys(SANDBOX_SHIM_FILES);

/**
 * Live preview for a master_component's source files.
 *
 * Preview-pane priority:
 * - curated preview_url (screenshot / live demo / gist link) -> render it.
 * - HTML bundle (index.html + sibling .css/.js) -> iframe with srcdoc.
 * - TSX/JSX whose imports all resolve (siblings + shadcn shims) -> live Sandpack.
 * - TSX/JSX needing app context, or importing an unshimmed alias -> graceful panel.
 * - otherwise: source only.
 *
 * iter-7 #62: `@/lib/utils` (cn) + common `@/components/ui/*` primitives are injected
 * as bundled shims and `@/` is rewritten to `./`, taking live coverage from ~31% to ~80%.
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

  // Build the Sandpack files map for the TSX/JSX preview: the primary component at
  // /App.tsx, every sibling (css / other code) at its own root path, plus the shadcn
  // shims. All `@/` imports rewritten to `./`.
  const { sandpackFiles, placedPaths } = useMemo(() => {
    if (!tsxOrJsx) return { sandpackFiles: null as Record<string, string> | null, placedPaths: new Set<string>() };

    const placed = new Set<string>(['/App.tsx', '/index.tsx', '/styles.css', '/public/index.html', ...SHIM_PATHS]);
    const fileMap: Record<string, string> = { ...SANDBOX_SHIM_FILES };

    // Siblings (everything except the primary) at their own path.
    for (const f of files) {
      if (f === tsxOrJsx) continue;
      const p = '/' + f.name;
      placed.add(p);
      fileMap[p] = CODE_EXTS.has(f.ext) ? rewriteAliases(f.content) : f.content;
    }

    const cssBlob = css.map((f) => f.content).join('\n\n');
    const baseline = ':root{color-scheme:dark}body{margin:0;min-height:100vh;background:#0a0a0f;color:#e4e4e7;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}#root{width:100%}';
    fileMap['/styles.css'] = baseline + '\n' + (cssBlob.trim().length > 0 ? cssBlob : '');

    fileMap['/App.tsx'] = `${rewriteAliases(tsxOrJsx.content)}\n\n// — Sandpack mount —\n`;

    fileMap['/index.tsx'] = [
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
    ].join('\n');

    fileMap['/public/index.html'] = [
      `<!doctype html>`,
      `<html><head>`,
      `  <meta charset="utf-8" />`,
      `  <title>Sandpack preview</title>`,
      `  <script src="https://cdn.tailwindcss.com"></script>`,
      `  <style>body{background:#0a0a0f;color:#e4e4e7;margin:0;padding:1rem;font-family:system-ui,sans-serif;}</style>`,
      `</head><body><div id="root"></div></body></html>`,
    ].join('\n');

    return { sandpackFiles: fileMap, placedPaths: placed };
  }, [tsxOrJsx, files, css]);

  const sources = useMemo(
    () => files.filter((f) => CODE_EXTS.has(f.ext)).map((f) => f.content),
    [files],
  );

  const customSetup = useMemo(() => {
    if (!tsxOrJsx) return undefined;
    const deps = deriveDependencies(sources, dependencies);
    return Object.keys(deps).length > 0 ? { dependencies: deps } : undefined;
  }, [tsxOrJsx, sources, dependencies]);

  const needsContext = useMemo(() => {
    if (!tsxOrJsx) return false;
    return needsAppContext(sources);
  }, [tsxOrJsx, sources]);

  const unresolvable = useMemo(() => {
    if (!tsxOrJsx) return false;
    return !allImportsResolvable(sources, placedPaths);
  }, [tsxOrJsx, sources, placedPaths]);

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
  const canRunLive = previewableTsx && !needsContext && !unresolvable && Boolean(sandpackFiles);
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
    if (previewableTsx && (needsContext || unresolvable)) {
      return (
        <div className="p-10 text-center bg-zinc-950/40">
          <p className="text-sm text-zinc-300">Renders inside the app, not in an isolated sandbox.</p>
          <p className="mt-1 text-xs text-zinc-500">
            {needsContext
              ? 'This component needs app context (providers, server runtime, or auth), so a standalone live preview would fail.'
              : 'This component imports project-internal modules that are not bundled in the sandbox, so a standalone live preview would fail.'}{' '}
            View the full implementation in the Source tab.
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
