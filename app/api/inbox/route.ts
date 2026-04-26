// /api/inbox — cross-project pending reports.
// Powers the Bug Inbox view (R10.5 #1).

import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest } from '@/lib/api';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = ['pending', 'classified', 'failed', 'ignored'] as const;
type ReportStatus = (typeof ALLOWED_STATUSES)[number];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('status') ?? 'pending';
  if (!ALLOWED_STATUSES.includes(raw as ReportStatus)) {
    return badRequest(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`);
  }
  const status = raw as ReportStatus;
  const db = await getDb();
  const rows = db.select({
    id: schema.reports.id,
    project_slug: schema.reports.project_slug,
    raw_text: schema.reports.raw_text,
    source: schema.reports.source,
    status: schema.reports.status,
    flow_id: schema.reports.flow_id,
    submitted_at: schema.reports.submitted_at,
    classified_at: schema.reports.classified_at,
  }).from(schema.reports)
    .where(eq(schema.reports.status, status))
    .orderBy(desc(schema.reports.submitted_at)).all();
  return NextResponse.json({ count: rows.length, reports: rows });
}
