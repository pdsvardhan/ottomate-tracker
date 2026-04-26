import { eq, asc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function DataTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const concepts = db.select().from(schema.project_data_concepts)
    .where(eq(schema.project_data_concepts.project_slug, slug)).get();
  const sources = db.select().from(schema.data_sources)
    .where(eq(schema.data_sources.project_slug, slug))
    .orderBy(asc(schema.data_sources.id)).all();
  const contracts = db.select().from(schema.project_data_contracts)
    .where(eq(schema.project_data_contracts.project_slug, slug)).get();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Stage 1 — Conceptual</h3>
        {concepts ? (
          <dl className="space-y-2 text-sm">
            <Row label="Has data layer">{concepts.has_data_layer ? 'yes' : 'no'}</Row>
            <Row label="Retention policy">{concepts.retention_policy_type ?? '—'}</Row>
            <Row label="Retention duration">{concepts.retention_duration ?? '—'}</Row>
            <Row label="Freshness threshold (h)">{concepts.freshness_threshold_hours ?? '—'}</Row>
          </dl>
        ) : (
          <p className="text-xs text-zinc-600">— not configured</p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Stage 2 — Contract</h3>
        {contracts ? (
          <dl className="space-y-2 text-sm">
            <Row label="Database">{contracts.database_engine ?? '—'}</Row>
            <Row label="Storage">{contracts.storage_location ?? '—'}</Row>
            <Row label="Migration tool">{contracts.migration_tooling ?? '—'}</Row>
          </dl>
        ) : (
          <p className="text-xs text-zinc-600">— not configured</p>
        )}
      </section>

      <section className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Data sources ({sources.length})</h3>
        {sources.length === 0 ? (
          <p className="text-xs text-zinc-600">— none yet</p>
        ) : (
          <ul className="space-y-2">
            {sources.map((s) => (
              <li key={s.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="text-zinc-100">{s.name}</strong>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">{s.source_type}</span>
                </div>
                {s.url_or_path && <p className="mt-1 text-xs text-zinc-400 truncate font-mono">{s.url_or_path}</p>}
                <p className="mt-1 text-[11px] text-zinc-500">
                  {s.ingestion_method ?? 'ingestion: —'} · {s.refresh_strategy ?? 'refresh: —'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="text-zinc-300">{children}</dd>
    </div>
  );
}
