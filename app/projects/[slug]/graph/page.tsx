// Project graph tab — interactive Feature ↔ Flow ↔ Page ↔ Component viz.

import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { GraphCanvas } from '@/components/graph/GraphCanvas';

export const dynamic = 'force-dynamic';

export default async function GraphTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        <span className="text-violet-300">Flows</span> ·{' '}
        <span className="text-emerald-300">Features</span> ·{' '}
        <span className="text-amber-300">Pages</span> ·{' '}
        <span className="text-zinc-400">Components</span>
      </p>
      <GraphCanvas slug={slug} />
    </div>
  );
}
