import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { DocTable, StatusPill } from '@/components/project/DocTable';

export const dynamic = 'force-dynamic';

export default async function FeaturesTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const features = db.select().from(schema.features)
    .where(eq(schema.features.project_slug, slug))
    .orderBy(desc(schema.features.updated_at)).all();
  return (
    <DocTable
      rows={features}
      emptyLabel="No features yet."
      columns={[
        { key: 'id', label: 'ID', render: (f) => <code className="text-zinc-500">{f.id}</code>, className: 'font-mono' },
        { key: 'title', label: 'Title', render: (f) => <span className="text-zinc-100">{f.title}</span> },
        { key: 'priority', label: 'Priority', render: (f) => <span className="text-zinc-400">{f.priority}</span> },
        { key: 'size', label: 'Size', render: (f) => <span className="text-zinc-400">{f.size ?? '—'}</span> },
        { key: 'status', label: 'Status', render: (f) => <StatusPill value={f.status} scheme="feature" /> },
        { key: 'tests', label: 'Tests', render: (f) => <StatusPill value={f.test_status} scheme="feature" /> },
      ]}
    />
  );
}
