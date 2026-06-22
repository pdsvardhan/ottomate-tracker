// /components-browser/[id] — single component detail.
// Spotlight Glass redesign (iteration #5 item 38). Reads source files from disk
// at /asset-library/components/<id>/, passes them to <LivePreview> which renders
// either an iframe (HTML bundle) or a code-only view (TSX/JSX, sandpack TBD).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { asc, desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { LivePreview } from './LivePreview';
import { EditComponentModal } from './EditComponentModal';
import { ComponentAdminBar } from './ComponentAdminBar';
import { FeedbackWidget } from '@/components/master-component/FeedbackWidget';

export const dynamic = 'force-dynamic';

const ASSET_ROOT = '/asset-library/components';
const READABLE_EXT = new Set(['.tsx', '.ts', '.jsx', '.js', '.html', '.css', '.scss', '.md', '.json', '.pug']);

// Mirrors the category enum in lib/validation/master-components.ts (18 categories).
const CATEGORY_IDS = [
  'input', 'selection', 'button-action', 'display', 'navigation', 'feedback',
  'overlay', 'layout', 'animation', 'transition', 'dataviz', 'media',
  'modern-specialty', 'interactive', 'forms-validation', 'auth-screens',
  'dashboard-shells', 'ai-blocks',
];

interface SourceFile {
  name: string;
  content: string;
  size: number;
  ext: string;
}

async function readComponentFiles(componentId: string, primaryFile: string | null): Promise<SourceFile[]> {
  const dir = path.join(ASSET_ROOT, componentId);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const result: SourceFile[] = [];
    for (const e of entries) {
      if (!e.isFile()) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (!READABLE_EXT.has(ext)) continue;
      const full = path.join(dir, e.name);
      const stat = await fs.stat(full);
      if (stat.size > 500_000) continue;
      const content = await fs.readFile(full, 'utf8');
      result.push({ name: e.name, content, size: stat.size, ext });
    }
    result.sort((a, b) => {
      if (a.name === primaryFile) return -1;
      if (b.name === primaryFile) return 1;
      const indexFiles = ['index.html', 'index.tsx', 'index.ts', 'index.jsx', 'index.js'];
      const aIdx = indexFiles.indexOf(a.name);
      const bIdx = indexFiles.indexOf(b.name);
      if (aIdx !== -1 || bIdx !== -1) {
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      }
      return a.name.localeCompare(b.name);
    });
    return result;
  } catch {
    return [];
  }
}

interface Ctx { params: Promise<{ id: string }>; }

export default async function ComponentDetailPage({ params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const component = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  if (!component) notFound();

  const files = await readComponentFiles(id, component.primary_file);

  const projects = db
    .select({ slug: schema.projects.slug, display_name: schema.projects.display_name })
    .from(schema.projects)
    .orderBy(asc(schema.projects.display_name))
    .all();

  const feedback = db
    .select()
    .from(schema.component_feedback)
    .where(eq(schema.component_feedback.mc_id, id))
    .orderBy(desc(schema.component_feedback.created_at))
    .all();

  const libraries = (
    db
      .selectDistinct({ library: schema.master_components.library })
      .from(schema.master_components)
      .all()
      .map((r) => r.library)
      .filter(Boolean) as string[]
  ).sort();

  const quality = (component.quality_grade ?? '') as 'A' | 'B' | 'C' | '';

  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">
      <Link href="/components-browser" className="text-xs text-zinc-500 hover:text-cyan-300 transition-colors">
        ← all components
      </Link>

      <div className="mt-3">
        <PageHeader
          title={component.name}
          tagline={component.id}
          meta={
            <span className="inline-flex items-center gap-2 flex-wrap">
              {component.category && <Badge variant="tag">{component.category}</Badge>}
              {component.library && <Badge variant="library">{component.library}</Badge>}
              {quality && <Badge variant="quality" grade={quality} />}
              {((component.tags ?? []) as string[]).slice(0, 5).map((t) => (
                <Badge key={t} variant="tag">{t}</Badge>
              ))}
            </span>
          }
          actions={
            component.source_url ? (
              <a
                href={component.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cyan-300 hover:text-cyan-100 transition-colors"
              >
                Open upstream →
              </a>
            ) : null
          }
        />
      </div>

      {component.description && (
        <p className="mb-8 text-sm text-zinc-400 leading-relaxed max-w-3xl">{component.description}</p>
      )}

      {/* Live preview pane */}
      <section className="mb-8">
        <LivePreview componentId={component.id} files={files} dependencies={(component.dependencies ?? []) as string[]} previewUrl={component.preview_url} />
      </section>

      {/* Metadata grid */}
      <section className="grid gap-4 md:grid-cols-3">
        <MetaCard label="Frameworks" values={((component.framework_tags ?? []) as string[])} />
        <MetaCard label="Variants" values={((component.variants ?? []) as string[])} />
        <MetaCard label="Dependencies" values={((component.dependencies ?? []) as string[])} />
        <MetaCard label="Used in projects" values={((component.used_in_projects ?? []) as string[])} />
        <MetaCard
          label="File on disk"
          values={component.primary_file ? [component.primary_file] : []}
          fallback={files[0]?.name ?? null}
        />
        <MetaCard
          label="Ingestion"
          values={[component.ingestion_method ?? '—']}
        />
      </section>

      {/* Per-project feedback (iteration #5 item 39) */}
      <section className="mt-10">
        <FeedbackWidget
          mcId={component.id}
          projects={projects}
          initialFeedback={feedback.map((f) => ({
            id: f.id,
            project_slug: f.project_slug,
            verdict: f.verdict as 'good' | 'bad' | 'needs-fix' | 'classification-wrong',
            note: f.note,
            created_at: f.created_at instanceof Date ? f.created_at.getTime() / 1000 : (f.created_at ?? 0),
          }))}
        />
      </section>

      {/* Edit + Delete (iter-7 #55) */}
      <ComponentAdminBar id={component.id} />

      <EditComponentModal
        component={{
          id: component.id,
          name: component.name,
          category: component.category,
          library: component.library,
          quality_grade: component.quality_grade,
          source_url: component.source_url,
          preview_url: component.preview_url,
          description: component.description,
          primary_file: component.primary_file,
          framework_tags: (component.framework_tags ?? []) as string[],
          tags: (component.tags ?? []) as string[],
          dependencies: (component.dependencies ?? []) as string[],
        }}
        categories={CATEGORY_IDS}
        libraries={libraries}
      />
    </div>
  );
}

function MetaCard({ label, values, fallback }: { label: string; values: string[]; fallback?: string | null }) {
  const display = values.length > 0 ? values : fallback ? [fallback] : [];
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">{label}</div>
      {display.length === 0 ? (
        <span className="text-xs text-zinc-600">— none</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {display.map((v) => (
            <span
              key={v}
              className="text-[11px] font-mono text-zinc-300 bg-zinc-900/60 rounded px-1.5 py-0.5 border border-zinc-800"
            >
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
