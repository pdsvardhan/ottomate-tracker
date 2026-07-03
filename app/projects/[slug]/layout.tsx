// Per-project layout — thin wrapper (ui-overhaul). The old header + route-tabs
// were removed: the Overview page now self-renders the hero + in-page act-tabs
// (Overview / Engineering / Development / Resources), and the Engineering tab
// embeds architecture inline. The /architecture, /capabilities and /iterations
// routes still exist (reachable directly) but are secondary to the showcase page.

import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { DriftBanner } from '@/components/project/DriftBanner';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  return (
    <div className="px-6 md:px-10 py-6 max-w-[1200px] mx-auto">
      <a href="/" className="mono text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">← all projects</a>
      <div className="mt-3">
        <DriftBanner slug={slug} />
      </div>
      {children}
    </div>
  );
}
