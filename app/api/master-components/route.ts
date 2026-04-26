// /api/master-components — central asset library catalog.
// Powers the Master Components Browser (R10.5 #6). Read-only for now.

import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase().trim();
  const db = await getDb();
  const all = db.select().from(schema.master_components)
    .orderBy(asc(schema.master_components.id)).all();
  const filtered = q
    ? all.filter((c) => {
        return (
          c.id?.toLowerCase().includes(q) ||
          (c.name as string)?.toLowerCase().includes(q) ||
          ((c as Record<string, unknown>).description as string | undefined)?.toLowerCase().includes(q)
        );
      })
    : all;
  return NextResponse.json({ count: filtered.length, components: filtered });
}
