// /components-browser/[id] — single component view + edit.
// Layout: Preview area (top), Source code (collapsible), Edit form (below).

import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { ComponentEditor } from '@/components/master-component/ComponentEditor';
import { ComponentPreview } from '@/components/master-component/ComponentPreview';

export const dynamic = 'force-dynamic';

interface Ctx { params: Promise<{ id: string }>; }

export default async function ComponentDetailPage({ params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const component = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  if (!component) notFound();

  const hasSource = Boolean(component.source_paths?.[0] && component.source_paths?.[0].trim().length > 0);
  const hasPreview = Boolean(component.preview_url && component.preview_url.trim().length > 0);

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <Link href="/components-browser" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        ← All components
      </Link>

      <header className="mt-2 mb-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{component.name}</h1>
          <div className="flex items-center gap-2">
            {component.category && (
              <span className="text-[10px] uppercase tracking-wider rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-400">
                {component.category}
              </span>
            )}
            {(component.tags ?? []).map((t) => (
              <span key={t} className="text-[10px] uppercase tracking-wider rounded-full bg-zinc-800/60 text-zinc-400 px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs font-mono text-zinc-500">{component.id}</p>
        {component.description && (
          <p className="mt-2 text-sm text-zinc-400">{component.description}</p>
        )}
      </header>

      {/* Preview section */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-2">Preview</h2>
        <ComponentPreview previewUrl={component.preview_url ?? null} />
      </section>

      {/* Source code section */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-2">Source code {hasSource ? '' : <span className="text-xs font-normal text-zinc-600">— not yet provided</span>}</h2>
        {hasSource ? (
          <pre className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[480px] overflow-y-auto leading-relaxed">
            {component.source_paths?.[0]}
          </pre>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <p className="text-zinc-500 text-sm">No source code yet. Paste it in the editor below.</p>
          </div>
        )}
      </section>

      {/* Quick metadata grid */}
      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <Stat label="Frameworks" values={component.framework_tags ?? []} />
        <Stat label="Variants" values={component.variants ?? []} />
        <Stat label="Dependencies" values={component.dependencies ?? []} />
      </section>

      {/* Edit form */}
      <section>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-zinc-300 hover:text-zinc-100 mb-3">
            ✎ Edit fields {hasSource || hasPreview ? '' : '(start here — add source code + preview)'}
          </summary>
          <div className="mt-4">
            <ComponentEditor initial={component} />
          </div>
        </details>
      </section>
    </div>
  );
}

function Stat({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      {values.length === 0 ? (
        <span className="text-xs text-zinc-600">— none</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <span key={v} className="text-[11px] font-mono text-zinc-300 bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800">
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
