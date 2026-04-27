// /iterations/[id]/items/[itemId]/pick-component — Stage 4 component-pick page.
// Fetches /component-options and renders 2-3+ option cards side-by-side.

import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb, schema } from '@/lib/db/client';
import { PickComponentClient } from '@/components/iteration/PickComponentClient';

export const dynamic = 'force-dynamic';

interface Ctx { params: Promise<{ id: string; itemId: string }>; }

export default async function PickComponentPage({ params }: Ctx) {
  const { id, itemId } = await params;
  const itrId = Number(id);
  const itmId = Number(itemId);
  if (!Number.isInteger(itrId) || !Number.isInteger(itmId)) notFound();

  const db = await getDb();
  const item = db.select().from(schema.iteration_items)
    .where(and(
      eq(schema.iteration_items.id, itmId),
      eq(schema.iteration_items.iteration_id, itrId),
    )).get();
  if (!item) notFound();

  const iteration = db.select().from(schema.iterations)
    .where(eq(schema.iterations.id, itrId)).get();
  if (!iteration) notFound();

  const proposed = (item.proposed_change ?? {}) as Record<string, unknown>;
  const previousPick = proposed.picked_component as
    | { component_id: string; component_name: string; picked_at: string }
    | undefined;

  return (
    <div className="px-8 py-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <Link
          href={`/iterations/${itrId}`}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Iteration {iteration.iteration_number}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Pick a component</h1>
        <p className="mt-1 text-sm text-zinc-400">
          for <span className="text-zinc-100 font-medium">{item.title}</span>
          {item.target_kind && (
            <span className="ml-2 text-[10px] uppercase tracking-wider rounded-full border border-zinc-800 px-2 py-0.5 text-zinc-500">
              {item.target_kind}{item.target_id ? `:${item.target_id}` : ''}
            </span>
          )}
        </p>
        {item.description && (
          <p className="mt-2 text-xs text-zinc-500 whitespace-pre-wrap">{item.description}</p>
        )}
      </header>

      {previousPick && (
        <div className="mb-4 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs text-emerald-300">
          ✓ Already picked: <strong>{previousPick.component_name}</strong> ({previousPick.component_id}) at{' '}
          {new Date(previousPick.picked_at).toLocaleString()}. Picking again will replace the previous choice.
        </div>
      )}

      <PickComponentClient
        iterationId={itrId}
        itemId={itmId}
        itemTitle={item.title}
      />
    </div>
  );
}
