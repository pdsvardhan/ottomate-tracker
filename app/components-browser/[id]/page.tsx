// /components-browser/[id] — single component detail (iter-15 rebuild).
// Cyber-Den restyle + de-cluttered per owner: dropped the raw id, quality badge,
// free tags, Variants (2/132 populated), and Used-in-projects + the per-project
// "mark this component" feedback widget (owner doesn't track usage). Added a
// single global Rating control (Standout/Solid/Fine) and delete-only admin.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { getPreviewEntry } from '@/lib/previews';
import { COMPONENT_CATEGORIES } from '@/lib/categories';
import { LivePreview } from './LivePreview';
import { ComponentAdminBar } from './ComponentAdminBar';
import { RatingControl } from '@/components/master-component/RatingControl';
import { ShaderBackground } from '@/components/project/ShaderBackground';

export const dynamic = 'force-dynamic';

const ASSET_ROOT = '/asset-library/components';
const READABLE_EXT = new Set(['.tsx', '.ts', '.jsx', '.js', '.html', '.css', '.scss', '.md', '.json', '.pug']);

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  COMPONENT_CATEGORIES.map((c) => [c.id, c.label]),
);

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
  const preview = await getPreviewEntry(id);

  const grade = (component.quality_grade ?? null) as 'A' | 'B' | 'C' | null;
  const deps = (component.dependencies ?? []) as string[];
  const frameworks = (component.framework_tags ?? []) as string[];
  const catLabel = component.category ? (CATEGORY_LABEL[component.category] ?? component.category) : null;

  return (
    <div className="sc">
      <ShaderBackground />
      <div className="sc-veil" aria-hidden />
      <div className="sc-scan" aria-hidden />
      <div className="sc-grain" aria-hidden />
      <div className="sc-wrap px-6 md:px-10 py-10 max-w-6xl mx-auto">
        <Link href="/components-browser" className="mono text-[length:var(--t-cap)]" style={{ color: 'var(--mute)' }}>
          ← all components
        </Link>

        {/* Header — name + category eyebrow + library; no raw id / quality / free tags */}
        <header className="mt-4 mb-7">
          {catLabel && <div className="eyebrow" style={{ color: 'var(--cyan)' }}>{catLabel}</div>}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="display pg">{component.name}</h1>
            {component.source_url && (
              <a href={component.source_url} target="_blank" rel="noopener noreferrer"
                className="mono text-[length:var(--t-label)] pb-2" style={{ color: 'var(--cyan)' }}>
                open upstream ↗
              </a>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            {component.library && (
              <span className="mono text-[length:var(--t-cap)] rounded-lg px-2.5 py-1" style={{ color: 'var(--ink)', background: 'rgba(12,11,28,.6)', border: '1px solid var(--line)' }}>
                {component.library}
              </span>
            )}
            <RatingControl id={component.id} initial={grade} />
          </div>
        </header>

        {component.description && (
          <p className="mb-8 text-[length:var(--t-lead)] leading-relaxed max-w-3xl" style={{ color: 'var(--ink)', opacity: 0.85 }}>
            {component.description}
          </p>
        )}

        {/* Live preview + source (tabs inside LivePreview) */}
        <section className="mb-8">
          <LivePreview componentId={component.id} files={files} preview={preview} />
        </section>

        {/* Metadata — only the useful, populated bits */}
        <section className="grid gap-4 md:grid-cols-3">
          <MetaCard label="Frameworks" values={frameworks} />
          {deps.length > 0 && <MetaCard label="Requires" values={deps} />}
          <MetaCard
            label="Source file"
            values={component.primary_file ? [component.primary_file] : []}
            fallback={files[0]?.name ?? null}
          />
          <MetaCard label="Ingestion" values={[component.ingestion_method ?? '—']} />
        </section>

        {/* Delete-only admin (Edit removed per owner) */}
        <ComponentAdminBar id={component.id} />
      </div>
    </div>
  );
}

function MetaCard({ label, values, fallback }: { label: string; values: string[]; fallback?: string | null }) {
  const display = values.length > 0 ? values : fallback ? [fallback] : [];
  return (
    <div className="card flat">
      <div className="mono text-[length:var(--t-cap)] uppercase tracking-wider mb-2" style={{ color: 'var(--dim)' }}>{label}</div>
      {display.length === 0 ? (
        <span className="text-[length:var(--t-cap)]" style={{ color: 'var(--dim)' }}>— none</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {display.map((v) => (
            <span key={v} className="mono text-[length:var(--t-cap)] rounded px-2 py-0.5" style={{ color: 'var(--ink)', background: 'rgba(12,11,28,.6)', border: '1px solid var(--line)' }}>
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
