// /components-browser/[id] — single component detail (iter-15 rebuild).
// Cyber-Den restyle + de-cluttered per owner: dropped the raw id, quality badge,
// free tags, Variants (2/132 populated), and Used-in-projects + the per-project
// "mark this component" feedback widget (owner doesn't track usage). Added a
// single global Rating control (Standout/Solid/Fine) and delete-only admin.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { getPreviewEntry } from '@/lib/previews';
import { getViewer } from '@/lib/viewer-server';
import { LivePreview } from './LivePreview';
import { ComponentAdminBar } from './ComponentAdminBar';
import { RatingControl } from '@/components/master-component/RatingControl';
import { ShaderBackground } from '@/components/project/ShaderBackground';
import { BackButton } from '@/components/ui/BackButton';
import { SpotlightCard } from '@/components/ui/SpotlightCard';

export const dynamic = 'force-dynamic';

const ASSET_ROOT = '/asset-library/components';
const READABLE_EXT = new Set(['.tsx', '.ts', '.jsx', '.js', '.html', '.css', '.scss', '.md', '.json', '.pug']);

// Drop the auto-generated "Name. Sourced from CodePen via gist X." descriptions
// that just repeat the title (owner iter-16). Strip the provenance clause; if
// nothing meaningful remains, show no description at all.
function meaningfulDescription(name: string, description: string | null): string | null {
  if (!description) return null;
  const stripped = description.replace(/\s*Sourced from [^.]*\.?/i, '').trim().replace(/\.$/, '');
  const bare = stripped.toLowerCase();
  const nm = name.trim().toLowerCase().replace(/\.$/, '');
  if (!bare || bare === nm) return null;
  return stripped;
}

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
  // iter-208 #1509: rating + delete are owner controls; the visitor view shows a rating only if set.
  const { owner } = await getViewer();

  const grade = (component.quality_grade ?? null) as 'A' | 'B' | 'C' | null;
  const deps = (component.dependencies ?? []) as string[];
  const frameworks = (component.framework_tags ?? []) as string[];
  // Provenance link (iter-16): upstream lib → source_url; gist/codepen →
  // preview_url; authored in-house → none.
  const sourceLink = component.source_url || component.preview_url || null;
  const sourceLabel = component.source_url ? 'Open upstream' : component.preview_url ? 'View source' : null;
  const desc = meaningfulDescription(component.name, component.description ?? null);

  return (
    <div className="sc">
      <ShaderBackground />
      <div className="sc-veil" aria-hidden />
      <div className="sc-scan" aria-hidden />
      <div className="sc-grain" aria-hidden />
      {/* Responsive width (iter-16): removed the max-w-6xl cap so the page uses
          the full wide desktop, matching the other pages. */}
      <div className="sc-wrap px-6 md:px-10 py-10">
        {/* Header — shared back button inline-left of the title (iter-16).
            Dropped the category eyebrow + library chip; rating moved below the
            preview. */}
        <header className="mb-7 flex items-center gap-4 flex-wrap">
          <BackButton href="/components-browser" label="All components" />
          <h1 className="display pg leading-none">{component.name}</h1>
        </header>

        {desc && (
          <p className="mb-8 text-[length:var(--t-lead)] leading-relaxed max-w-3xl" style={{ color: 'var(--ink)', opacity: 0.85 }}>
            {desc}
          </p>
        )}

        {/* Live preview + source (tabs inside LivePreview) */}
        <section className="mb-5">
          <LivePreview componentId={component.id} files={files} preview={preview} />
        </section>

        {/* Rating — moved below the preview (iter-16) */}
        {(owner || grade) && (
          <section className="mb-8 flex items-center gap-3 flex-wrap">
            <span className="mono text-[length:var(--t-cap)] uppercase tracking-wider" style={{ color: 'var(--dim)' }}>Rating</span>
            <RatingControl id={component.id} initial={grade} />
          </section>
        )}

        {/* Metadata — only the useful, populated bits; Source is now a link */}
        <section className="grid gap-4 md:grid-cols-3">
          <MetaCard label="Frameworks" values={frameworks} />
          {deps.length > 0 && <MetaCard label="Requires" values={deps} />}
          <MetaCard
            label="Source"
            link={sourceLink}
            linkLabel={sourceLabel}
            values={sourceLink ? [] : ['Ottomate original']}
          />
          <MetaCard label="Ingestion" values={[component.ingestion_method ?? '—']} />
        </section>

        {/* Delete-only admin (Edit removed per owner) — owner view only (iter-208 #1509) */}
        {owner && <ComponentAdminBar id={component.id} />}
      </div>
    </div>
  );
}

function MetaCard({
  label,
  values = [],
  fallback,
  link,
  linkLabel,
}: {
  label: string;
  values?: string[];
  fallback?: string | null;
  link?: string | null;
  linkLabel?: string | null;
}) {
  const display = values.length > 0 ? values : fallback ? [fallback] : [];
  // iter-16 (owner d082): meta panels now use our SpotlightCard surface
  // (glass + cursor-following spotlight) instead of a flat box.
  return (
    <SpotlightCard className="!p-5">
      <div className="mono text-[length:var(--t-cap)] uppercase tracking-wider mb-2.5" style={{ color: 'var(--dim)' }}>{label}</div>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mono text-[length:var(--t-label)] rounded-lg px-3 py-1.5 transition-colors"
          style={{ color: 'var(--cyan)', background: 'color-mix(in srgb, var(--cyan) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--cyan) 32%, transparent)' }}
        >
          {linkLabel ?? 'Open'} ↗
        </a>
      ) : display.length === 0 ? (
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
    </SpotlightCard>
  );
}
