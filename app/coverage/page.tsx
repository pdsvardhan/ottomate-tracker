// Test Coverage Dashboard — flows + features pass-rates per project.

import Link from 'next/link';
import { count, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function CoveragePage() {
  const db = await getDb();
  const projects = db.select().from(schema.projects).all();

  const summaries = projects.map((p) => {
    const flowCounts = db.select({
      total: count(),
      status: schema.flows.test_status,
    }).from(schema.flows)
      .where(eq(schema.flows.project_slug, p.slug))
      .groupBy(schema.flows.test_status).all();
    const featCounts = db.select({
      total: count(),
      status: schema.features.test_status,
    }).from(schema.features)
      .where(eq(schema.features.project_slug, p.slug))
      .groupBy(schema.features.test_status).all();
    const total_flows = flowCounts.reduce((s, r) => s + Number(r.total), 0);
    const passing_flows = Number(flowCounts.find((r) => r.status === 'passing')?.total ?? 0);
    const total_features = featCounts.reduce((s, r) => s + Number(r.total), 0);
    const passing_features = Number(featCounts.find((r) => r.status === 'passing')?.total ?? 0);
    return {
      slug: p.slug,
      display_name: p.display_name,
      total_flows,
      passing_flows,
      total_features,
      passing_features,
    };
  });

  function pct(num: number, denom: number) {
    if (denom === 0) return null;
    return Math.round((num / denom) * 100);
  }

  function bar(num: number, denom: number) {
    const value = pct(num, denom);
    if (value === null) return null;
    const colour = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    return (
      <div className="w-full bg-zinc-800/60 rounded-full h-1 overflow-hidden">
        <div className={`h-full ${colour}`} style={{ width: `${value}%` }} />
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Coverage</h1>
        <p className="mt-1 text-sm text-zinc-500">Test pass-rate roll-up across projects.</p>
      </header>

      {summaries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
          <p className="text-zinc-500">No projects yet.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Project</th>
              <th className="text-right px-4 py-3 font-medium">Flows</th>
              <th className="text-right px-4 py-3 font-medium">Features</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                <td className="px-4 py-3">
                  <Link href={`/projects/${s.slug}`} className="text-cyan-400 hover:underline">
                    {s.display_name}
                  </Link>
                  <p className="text-[11px] text-zinc-500 font-mono">{s.slug}</p>
                </td>
                <td className="px-4 py-3 align-top w-1/3">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-zinc-400">{s.passing_flows} / {s.total_flows}</span>
                    <span className="text-zinc-600">{pct(s.passing_flows, s.total_flows) ?? '—'}%</span>
                  </div>
                  <div className="mt-1.5">{bar(s.passing_flows, s.total_flows)}</div>
                </td>
                <td className="px-4 py-3 align-top w-1/3">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-zinc-400">{s.passing_features} / {s.total_features}</span>
                    <span className="text-zinc-600">{pct(s.passing_features, s.total_features) ?? '—'}%</span>
                  </div>
                  <div className="mt-1.5">{bar(s.passing_features, s.total_features)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
