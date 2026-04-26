import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { DocTable, StatusPill } from '@/components/project/DocTable';

export const dynamic = 'force-dynamic';

export default async function FlowsTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const flows = db.select().from(schema.flows)
    .where(eq(schema.flows.project_slug, slug))
    .orderBy(desc(schema.flows.updated_at)).all();
  return (
    <DocTable
      rows={flows}
      emptyLabel="No flows yet."
      columns={[
        { key: 'id', label: 'ID', render: (f) => <code className="text-zinc-500">{f.id}</code>, className: 'font-mono' },
        { key: 'title', label: 'Title', render: (f) => <span className="text-zinc-100">{f.title}</span> },
        { key: 'type', label: 'Type', render: (f) => <span className="text-zinc-400">{f.type ?? '—'}</span> },
        { key: 'priority', label: 'Priority', render: (f) => <span className="text-zinc-400">{f.priority}</span> },
        { key: 'tests', label: 'Tests', render: (f) => <StatusPill value={f.test_status} scheme="flow" /> },
      ]}
    />
  );
}
