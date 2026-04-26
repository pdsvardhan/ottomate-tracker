// /api/external-task-completed — POST: tasks-dashboard webhook target.
// Fires when a tasks-dashboard task it received marks done. We then propagate
// status back into the source iteration_item.user_test_completed_at field.
// Codex Round 2 #5: webhook fires inside patchTask() (tasks-dashboard side).

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';

export const runtime = 'nodejs';

const PayloadSchema = z.object({
  external_system: z.literal('tasks-dashboard'),
  external_id: z.string().min(1),
  status: z.enum(['done', 'cancelled']),
  completed_at: z.coerce.date().optional(),
  // The originating iteration_item id we passed when creating the task.
  iteration_item_id: z.number().int().optional(),
});

export async function POST(req: Request) {
  const result = await readAuthBody(req, PayloadSchema);
  if (!result.ok) return result.res;
  const db = await getDb();

  if (!result.data.iteration_item_id) {
    // Disconnected webhook (rare); log and acknowledge so the sender stops retrying.
    console.warn('[ottomate] external-task-completed without iteration_item_id', result.data);
    return NextResponse.json({ ok: true, note: 'No iteration_item linkage' });
  }
  const item = db.select().from(schema.iteration_items)
    .where(eq(schema.iteration_items.id, result.data.iteration_item_id)).get();
  if (!item) return notFound(`iteration_item ${result.data.iteration_item_id} not found`);

  const completedAt = result.data.completed_at ?? new Date();
  db.update(schema.iteration_items).set({
    user_test_completed_at: completedAt,
    notes: result.data.status === 'cancelled'
      ? `[tasks-dashboard cancelled at ${completedAt.toISOString()}] ${item.notes ?? ''}`
      : item.notes,
  }).where(eq(schema.iteration_items.id, result.data.iteration_item_id)).run();
  return NextResponse.json({ ok: true });
}
