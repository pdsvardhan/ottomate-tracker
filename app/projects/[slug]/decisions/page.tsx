import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { DocTable } from '@/components/project/DocTable';

export const dynamic = 'force-dynamic';

export default async function DecisionsTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const decisions = db.select().from(schema.adr_index)
    .where(eq(schema.adr_index.project_slug, slug))
    .orderBy(desc(schema.adr_index.date)).all();
  return (
    <DocTable
      rows={decisions}
      emptyLabel="No decisions yet."
      columns={[
        { key: 'id', label: 'ID', render: (d) => <code className="text-zinc-500">{d.id}</code>, className: 'font-mono' },
        { key: 'title', label: 'Title', render: (d) => <span className="text-zinc-100">{d.title}</span> },
        { key: 'status', label: 'Status', render: (d) => <span className="text-zinc-400">{d.status ?? '—'}</span> },
        { key: 'date', label: 'Date', render: (d) => <span className="text-zinc-400">{d.date && new Date(d.date).toLocaleDateString()}</span> },
        {
          key: 'tags',
          label: 'Tags',
          render: (d) => (
            <div className="flex flex-wrap gap-1">
              {(d.tags ?? []).map((t) => (
                <span key={t} className="text-[10px] rounded-full bg-zinc-800/80 text-zinc-300 px-1.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}
