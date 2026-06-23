// Reads the inline-preview manifest produced by `npm run build:previews`
// (iter-77). The manifest + per-component index.html/shot.png live on the
// asset-library volume at /asset-library/previews and are served to the browser
// via /api/previews/<id>/<file>.
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const PREVIEWS_DIR = process.env.PREVIEWS_DIR || '/asset-library/previews';

export interface PreviewEntry {
  status: string;       // live | html | needs-props | empty | needs-context | unresolvable-alias | missing-dep | no-export | bundle-error | no-source | error
  reason: string | null;
  iframe: boolean;      // true → serve the prebuilt esbuild iframe
  shot: boolean;        // true → a screenshot exists
  detail: string | null;
}
export interface PreviewManifest {
  built_at: string;
  live: number;
  total: number;
  components: Record<string, PreviewEntry>;
}

let cache: { mtime: number; data: PreviewManifest } | null = null;

export async function getPreviewManifest(): Promise<PreviewManifest | null> {
  try {
    const fp = path.join(PREVIEWS_DIR, 'previews-manifest.json');
    const stat = await fs.stat(fp);
    if (cache && cache.mtime === stat.mtimeMs) return cache.data;
    const data = JSON.parse(await fs.readFile(fp, 'utf8')) as PreviewManifest;
    cache = { mtime: stat.mtimeMs, data };
    return data;
  } catch {
    return null;
  }
}

export async function getPreviewEntry(id: string): Promise<PreviewEntry | null> {
  const m = await getPreviewManifest();
  return m?.components?.[id] ?? null;
}
