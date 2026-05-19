// /projects/[slug]/components-pick — Stage 2.4 component picker.
// Iteration #5 item 41. For each unpicked component on every page, surface 3 ranked
// options from master_components and let the user pick or skip-with-reason.

import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PickSlot } from './PickSlot';

export const dynamic = 'force-dynamic';

function tokenise(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}

function scoreMC(
  mc: typeof schema.master_components.$inferSelect,
  queryTokens: string[],
): number {
  const haystack = [
    mc.id,
    mc.name,
    mc.description ?? '',
    ((mc.tags ?? []) as string[]).join(' '),
  ].join(' ').toLowerCase();
  let s = 0;
  for (const tok of queryTokens) {
    if (haystack.includes(tok)) s += 1;
    if (mc.name.toLowerCase().includes(tok)) s += 2;
  }
  if (mc.quality_grade === 'A') s += 2;
  else if (mc.quality_grade === 'B') s += 1;
  return s;
}

export default async function ComponentsPickPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).get();
  if (!project) notFound();

  const pages = db.select().from(schema.pages)
    .where(eq(schema.pages.project_slug, slug))
    .orderBy(asc(schema.pages.id))
    .all();

  const components = db.select().from(schema.components)
    .where(eq(schema.components.project_slug, slug))
    .all();

  // Pre-compute all options server-side for the unpicked components.
  const allMc = db.select().from(schema.master_components).all();

  const total = components.length;
  const picked = components.filter((c) => c.picked).length;
  const skipped = components.filter((c) => c.skip_reason && c.skip_reason.length > 0).length;
  const unresolved = total - picked - skipped;
  const readyForStage3 = unresolved === 0;

  // Group components by page id.
  const byPage = new Map<string, typeof components>();
  for (const c of components) {
    const arr = byPage.get(c.page_id) ?? [];
    arr.push(c);
    byPage.set(c.page_id, arr);
  }

  return (
    <div className="px-8 py-10 max-w-6xl mx-auto">
      <Link
        href={`/projects/${slug}`}
        className="text-xs text-zinc-500 hover:text-cyan-300 transition-colors"
      >
        ← {project.display_name}
      </Link>

      <div className="mt-3">
        <PageHeader
          title="Component picker"
          tagline={`Stage 2.4 · ${project.display_name}`}
          meta={
            <span className="inline-flex items-center gap-3">
              <span><span className="text-zinc-200 font-medium">{picked}</span> picked</span>
              <span className="text-zinc-700">·</span>
              <span><span className="text-zinc-300">{skipped}</span> skipped</span>
              <span className="text-zinc-700">·</span>
              <span><span className="text-amber-200">{unresolved}</span> unresolved</span>
              <span className="text-zinc-700">·</span>
              <span>{total} total</span>
            </span>
          }
          actions={
            readyForStage3 ? (
              <Badge variant="status" tone="shipped">ready for Stage 3</Badge>
            ) : (
              <Badge variant="status" tone="open">{unresolved} remaining</Badge>
            )
          }
        />
      </div>

      {pages.length === 0 ? (
        <EmptyState
          title="No pages spec'd for this project yet"
          body="The component picker activates once Stage 1 pages are defined."
        />
      ) : (
        <div className="space-y-12">
          {pages.map((p) => {
            const pageComponents = byPage.get(p.id) ?? [];
            const pagePicked = pageComponents.filter((c) => c.picked).length;
            const pageSkipped = pageComponents.filter((c) => c.skip_reason).length;
            const pageTotal = pageComponents.length;

            return (
              <section key={p.id} id={`page-${p.id}`} className="scroll-mt-20">
                <header className="mb-4 flex items-baseline justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h2 className="text-xl font-semibold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                        {p.title}
                      </h2>
                      <code className="text-[11px] font-mono text-zinc-500">{p.route}</code>
                      <Badge variant="count">{pagePicked}/{pageTotal} picked</Badge>
                      {pageSkipped > 0 && (
                        <Badge variant="status" tone="open">{pageSkipped} skipped</Badge>
                      )}
                    </div>
                    {p.purpose && (
                      <p className="text-xs text-zinc-500 mt-1 max-w-2xl">{p.purpose}</p>
                    )}
                  </div>
                </header>

                {pageComponents.length === 0 ? (
                  <EmptyState
                    title="No components on this page yet"
                    body="Add them in the Capabilities tab or via API."
                  />
                ) : (
                  <div className="space-y-4">
                    {pageComponents.map((c) => {
                      const queryText = `${c.name} ${c.purpose_on_page ?? ''}`;
                      const queryTokens = tokenise(queryText);
                      let pool = allMc;
                      if (c.category) {
                        const filtered = allMc.filter((mc) => mc.category === c.category);
                        if (filtered.length > 0) pool = filtered;
                      }
                      const scored = pool
                        .map((mc) => ({ component: mc, score: scoreMC(mc, queryTokens) }))
                        .sort((a, b) => b.score - a.score);
                      const top = scored.slice(0, 5).map((s) => ({
                        id: s.component.id,
                        name: s.component.name,
                        description: s.component.description,
                        library: s.component.library,
                        quality_grade: (s.component.quality_grade ?? null) as 'A' | 'B' | 'C' | null,
                        tags: ((s.component.tags ?? []) as string[]),
                        source_paths: ((s.component.source_paths ?? []) as string[]),
                        relevance_score: s.score,
                      }));

                      return (
                        <PickSlot
                          key={c.id}
                          slot={{
                            id: c.id,
                            name: c.name,
                            category: c.category,
                            purpose_on_page: c.purpose_on_page,
                            picked: Boolean(c.picked),
                            asset_library_ref: c.asset_library_ref,
                            skip_reason: c.skip_reason,
                          }}
                          options={top}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
