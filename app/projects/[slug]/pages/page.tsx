import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { DocTable } from '@/components/project/DocTable';

export const dynamic = 'force-dynamic';

export default async function PagesTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const pages = db.select().from(schema.pages)
    .where(eq(schema.pages.project_slug, slug))
    .orderBy(asc(schema.pages.title)).all();
  return (
    <DocTable
      rows={pages}
      emptyLabel="No pages yet."
      columns={[
        { key: 'id', label: 'ID', render: (p) => <code className="text-zinc-500">{p.id}</code>, className: 'font-mono' },
        { key: 'title', label: 'Title', render: (p) => <span className="text-zinc-100">{p.title}</span> },
        { key: 'route', label: 'Route', render: (p) => <code className="text-cyan-400">{p.route}</code>, className: 'font-mono' },
        { key: 'layout', label: 'Layout', render: (p) => <span className="text-zinc-400">{p.layout_type ?? '—'}</span> },
        { key: 'permissions', label: 'Perms', render: (p) => <span className="text-zinc-400">{p.permissions}</span> },
      ]}
    />
  );
}
