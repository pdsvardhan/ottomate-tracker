// Per-project layout — thin wrapper (ui-overhaul). The old header + route-tabs
// were removed: the Overview page now self-renders the hero + in-page act-tabs
// (Overview / Engineering / Development / Resources), and the Engineering tab
// embeds architecture inline. The /architecture, /capabilities and /iterations
// routes still exist (reachable directly) but are secondary to the showcase page.

import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { DriftBanner } from '@/components/project/DriftBanner';
import { BackButton } from '@/components/ui/BackButton';

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
    <div className="px-6 md:px-10 py-6">
      <BackButton href="/" label="All projects" />
      <div className="mt-3">
        <DriftBanner slug={slug} />
      </div>
      {children}
    </div>
  );
}
