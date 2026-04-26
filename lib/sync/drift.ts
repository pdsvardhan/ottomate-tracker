// Drift detection — compares the on-disk YAML mirrors against the
// hashes recorded by the last pack-up. If they differ, a manual edit
// or external git pull happened and the user should reconcile before
// the next DB→YAML sync overwrites their changes (Codex P0 #2).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

const REPOS_DIR = process.env.OTTOMATE_REPOS_DIR ?? '/repos';

function fnv1a(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

const TRACKED_DOCS = ['overview', 'flows', 'features', 'pages', 'data', 'risks', 'decisions'] as const;

function pathFor(slug: string, doc: string): string | null {
  const base = path.join(REPOS_DIR, slug, 'ottomate');
  switch (doc) {
    case 'overview': return path.join(base, 'overview.yaml');
    case 'flows': return path.join(base, 'flows.yaml');
    case 'features': return path.join(base, 'features.yaml');
    case 'pages': return path.join(base, 'ui.yaml');
    case 'data': return path.join(base, 'data.yaml');
    case 'risks': return path.join(base, 'risks.yaml');
    case 'decisions': return path.join(base, 'decisions/index.yaml');
    default: return null;
  }
}

export interface DriftEntry {
  project_slug: string;
  doc_name: string;
  state: 'in-sync' | 'drifted' | 'missing-on-disk' | 'no-mirror-recorded';
  recorded_hash: string | null;
  current_hash: string | null;
  recorded_at: string | null;
  on_disk_mtime: string | null;
  filename: string;
}

export async function scanDrift(slugFilter?: string): Promise<DriftEntry[]> {
  const db = await getDb();
  const projects = db.select({ slug: schema.projects.slug }).from(schema.projects).all();
  const out: DriftEntry[] = [];

  for (const p of projects) {
    if (slugFilter && p.slug !== slugFilter) continue;
    const mirrors = db.select().from(schema.yaml_mirror_state)
      .where(eq(schema.yaml_mirror_state.project_slug, p.slug)).all();
    const byDoc = new Map(mirrors.map((m) => [m.doc_name, m]));

    for (const doc of TRACKED_DOCS) {
      const filename = pathFor(p.slug, doc) ?? '';
      let on_disk_mtime: string | null = null;
      let current_hash: string | null = null;
      try {
        const stat = statSync(filename);
        on_disk_mtime = stat.mtime.toISOString();
        const content = readFileSync(filename, 'utf8');
        current_hash = fnv1a(content);
      } catch {
        on_disk_mtime = null;
      }

      const rec = byDoc.get(doc);
      if (!rec) {
        out.push({
          project_slug: p.slug,
          doc_name: doc,
          state: 'no-mirror-recorded',
          recorded_hash: null,
          current_hash,
          recorded_at: null,
          on_disk_mtime,
          filename,
        });
        continue;
      }
      if (current_hash === null) {
        out.push({
          project_slug: p.slug,
          doc_name: doc,
          state: 'missing-on-disk',
          recorded_hash: rec.last_yaml_hash,
          current_hash: null,
          recorded_at: rec.last_synced_at ? new Date(rec.last_synced_at).toISOString() : null,
          on_disk_mtime,
          filename,
        });
        continue;
      }
      const drifted = current_hash !== rec.last_yaml_hash;
      out.push({
        project_slug: p.slug,
        doc_name: doc,
        state: drifted ? 'drifted' : 'in-sync',
        recorded_hash: rec.last_yaml_hash,
        current_hash,
        recorded_at: rec.last_synced_at ? new Date(rec.last_synced_at).toISOString() : null,
        on_disk_mtime,
        filename,
      });
    }
  }
  return out;
}

export async function markDrift(projectSlug: string, docName: string): Promise<void> {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  await db.update(schema.yaml_mirror_state)
    .set({ drift_detected_at: new Date(now * 1000) })
    .where(eq(schema.yaml_mirror_state.project_slug, projectSlug))
    .run();
  // Note: doc-level update needs both columns matched; simpler to refresh all
  // — drift_detected_at on a project's row is a coarse signal; precise per-doc
  // status lives in scanDrift().
  void docName;
}
