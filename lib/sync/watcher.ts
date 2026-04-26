// chokidar file watcher — runs as a background task inside the Next.js
// node process (boot via Next instrumentation hook). Watches the
// /repos/<slug>/ottomate/ folders for manual edits, computes a hash,
// and persists drift markers so the UI can warn before the next
// DB → YAML sync clobbers manual edits (Codex P0 #2).

import { readFileSync } from 'node:fs';
import path from 'node:path';

let _started = false;

function fnv1a(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export async function startWatcher(): Promise<void> {
  if (_started) return;
  const reposDir = process.env.OTTOMATE_REPOS_DIR ?? '/repos';

  // chokidar imports its native bindings on demand. Using dynamic import
  // so the module is tree-shaken out of edge bundles.
  const chokidar = await import('chokidar');
  const watcher = chokidar.default.watch(`${reposDir}/*/ottomate`, {
    persistent: true,
    ignoreInitial: true,
    depth: 2,
    awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 },
  });

  watcher.on('change', async (file) => {
    await handleEdit(file);
  });
  watcher.on('add', async (file) => {
    await handleEdit(file);
  });

  console.info(`[ottomate] watcher started on ${reposDir}/*/ottomate`);
  _started = true;
}

async function handleEdit(filePath: string) {
  const m = filePath.match(/\/([^/]+)\/ottomate\/(.+\.ya?ml)$/);
  if (!m) return;
  const [, slug, rel] = m;

  // Doc name is derived from filename (overview.yaml → overview, ui.yaml → pages).
  const filename = path.basename(rel);
  const docMap: Record<string, string> = {
    'overview.yaml': 'overview',
    'flows.yaml': 'flows',
    'features.yaml': 'features',
    'ui.yaml': 'pages',
    'data.yaml': 'data',
    'risks.yaml': 'risks',
    'index.yaml': 'decisions',
  };
  const docName = docMap[filename];
  if (!docName) return;

  let content: string;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  const newHash = fnv1a(content);

  // We do a comparison using direct sqlite to keep this lightweight + race-free.
  try {
    const { getRawSqlite } = await import('@/lib/db/client');
    const sqlite = await getRawSqlite();
    const existing = sqlite.prepare(`
      SELECT last_yaml_hash FROM yaml_mirror_state
      WHERE project_slug = ? AND doc_name = ?
    `).get(slug, docName) as { last_yaml_hash: string | null } | undefined;
    if (!existing) return; // No prior sync recorded; not drift, just unsynced.
    if (existing.last_yaml_hash === newHash) return;
    sqlite.prepare(`
      UPDATE yaml_mirror_state
      SET drift_detected_at = unixepoch()
      WHERE project_slug = ? AND doc_name = ?
    `).run(slug, docName);
    console.info(`[ottomate] drift detected: ${slug}/${docName}`);
  } catch (err) {
    console.error('[ottomate] watcher hash compare failed:', err);
  }
}
