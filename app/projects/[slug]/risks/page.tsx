import { desc, eq, ne } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { DocTable, StatusPill } from '@/components/project/DocTable';

export const dynamic = 'force-dynamic';

export default async function RisksTab({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const open = db.select().from(schema.risk_instances)
    .where(eq(schema.risk_instances.project_slug, slug))
    .orderBy(desc(schema.risk_instances.created_at)).all()
    .filter((r) => r.status !== 'resolved');
  const policy = db.select().from(schema.policies)
    .where(eq(schema.policies.project_slug, slug)).get();
  const auth = db.select().from(schema.auth_config)
    .where(eq(schema.auth_config.project_slug, slug)).get();
  const services = db.select().from(schema.third_party_services)
    .where(eq(schema.third_party_services.project_slug, slug)).all();
  const secrets = db.select().from(schema.project_secrets)
    .where(eq(schema.project_secrets.project_slug, slug)).all();

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Open risks ({open.length})</h3>
        <DocTable
          rows={open}
          emptyLabel="No open risks. Resolved hidden by default."
          columns={[
            { key: 'type', label: 'Type', render: (r) => <code className="text-zinc-400">{r.risk_type_id}</code>, className: 'font-mono' },
            { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} scheme="risk" /> },
            { key: 'severity', label: 'Severity override', render: (r) => <span className="text-zinc-400">{r.severity_override ?? '—'}</span> },
            { key: 'notes', label: 'Notes', render: (r) => <span className="text-zinc-400 line-clamp-1">{r.notes}</span> },
          ]}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Policy</h3>
          {policy ? (
            <dl className="space-y-2 text-sm">
              <Row label="Exposure">{policy.exposure}</Row>
              <Row label="Access control">{policy.access_control}</Row>
              <Row label="Data sensitivity">{policy.data_sensitivity_tier}</Row>
              <Row label="Encryption (rest)">{String(policy.encryption_at_rest ?? '—')}</Row>
              <Row label="Encryption (transit)">{String(policy.encryption_in_transit ?? '—')}</Row>
              <Row label="Rate limit (rpm)">{policy.rate_limit_rpm ?? '—'}</Row>
            </dl>
          ) : <p className="text-xs text-zinc-600">— not configured</p>}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Auth</h3>
          {auth ? (
            <dl className="space-y-2 text-sm">
              <Row label="Strategy">{auth.strategy}</Row>
              <Row label="Library">{auth.auth_library ?? '—'}</Row>
              <Row label="Session">{auth.session_management ?? '—'}</Row>
              <Row label="MFA">{auth.mfa_supported ? 'yes' : 'no'}</Row>
            </dl>
          ) : <p className="text-xs text-zinc-600">— not configured</p>}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Third-party services ({services.length})</h3>
          {services.length === 0 ? (
            <p className="text-xs text-zinc-600">— none</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {services.map((s) => (
                <li key={s.id} className="text-zinc-300">
                  <strong>{s.name}</strong>
                  {s.purpose && <span className="text-zinc-500"> · {s.purpose}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Secrets ({secrets.length})</h3>
          {secrets.length === 0 ? (
            <p className="text-xs text-zinc-600">— none recorded</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {secrets.map((s) => (
                <li key={s.id} className="text-zinc-300 font-mono">
                  {s.name}
                  {s.where_stored && <span className="text-zinc-500"> · {s.where_stored}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
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
