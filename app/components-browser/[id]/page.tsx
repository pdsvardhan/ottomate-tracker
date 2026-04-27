// /components-browser/[id] — single component detail + edit form.
// Lets the user fill in source_code, tags, framework_tags, preview_url, etc.
// for any of the 200+ taxonomy entries.

import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { ComponentEditor } from '@/components/master-component/ComponentEditor';

export const dynamic = 'force-dynamic';

interface Ctx { params: Promise<{ id: string }>; }

export default async function ComponentDetailPage({ params }: Ctx) {
  const { id } = await params;
  const db = await getDb();
  const component = db.select().from(schema.master_components)
    .where(eq(schema.master_components.id, id)).get();
  if (!component) notFound();
  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <Link href="/components-browser" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        ← All components
      </Link>
      <header className="mt-2 mb-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold">{component.name}</h1>
          <span className="text-[10px] uppercase tracking-wider rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-zinc-400">
            {component.category ?? '—'}
          </span>
        </div>
        <p className="mt-1 text-xs font-mono text-zinc-500">{component.id}</p>
      </header>
      <ComponentEditor initial={component} />
    </div>
  );
}
