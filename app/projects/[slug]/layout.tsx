// Per-project layout: tab navigation across the 7 docs.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

const TABS = [
  { label: 'Overview', href: '' },
  { label: 'Flows', href: '/flows' },
  { label: 'Features', href: '/features' },
  { label: 'Pages', href: '/pages' },
  { label: 'Data', href: '/data' },
  { label: 'Risks', href: '/risks' },
  { label: 'Decisions', href: '/decisions' },
  { label: 'Iterations', href: '/iterations' },
];

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select().from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  return (
    <div className="px-8 py-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← All projects
        </Link>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold truncate">{project.display_name}</h1>
            <p className="mt-0.5 text-xs font-mono text-zinc-500 truncate">{project.slug}</p>
          </div>
          <span className="shrink-0 text-[10px] uppercase tracking-wider rounded-full border border-zinc-800 px-2 py-0.5 text-zinc-400">
            {project.current_status}
          </span>
        </div>
      </header>

      <nav className="border-b border-zinc-800 mb-6 -mx-8 px-8">
        <ul className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <li key={t.href}>
              <Link
                href={`/projects/${slug}${t.href}`}
                className="block px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 border-b-2 border-transparent hover:border-zinc-700 transition-colors"
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </div>
  );
}
