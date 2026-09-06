// /api/projects/[slug]/reports/import-visual-qa — Task 1 visual-QA intake.
// The skill unpacks a DOM-commenter v2 zip locally and POSTs the comments here. This creates ONE
// report(source='visual-qa') + one report_comments row per comment, writing each screenshot to the
// /asset-library volume. Classification (4.2) runs separately via /api/reports/[id]/classify.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { notFound, readAuthBody } from '@/lib/api';
import { VisualQaImportSchema } from '@/lib/validation/iterations';

export const runtime = 'nodejs';

// Screenshots live under the writable asset-library volume (host: /mnt/storage/ottomate/assets).
const ASSET_ROOT = '/asset-library/visual-qa';

interface Ctx { params: Promise<{ slug: string }>; }

export async function POST(req: Request, { params }: Ctx) {
  const result = await readAuthBody(req, VisualQaImportSchema);
  // #333: log EVERY push attempt, refused ones included - "zero import-visual-qa hits" must mean no
  // request arrived, not that one was silently turned away.
  const { slug: slugForLog } = await params;
  console.log(`[import-visual-qa] slug=${slugForLog} outcome=${result.ok ? 'ok' : result.res.status}`);
  if (!result.ok) return result.res;
  const { slug } = await params;
  const { imported_by_session, comments } = result.data;

  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  // raw_text keeps each comment verbatim so the 4.2 classifier's source-substring rule works.
  const raw_text = comments
    .map((c, i) => `#${i + 1} [${c.category || 'note'}] ${c.url || c.page || ''}\n${c.text}`)
    .join('\n\n---\n\n');

  const report = db.insert(schema.reports)
    .values({ project_slug: slug, raw_text, source: 'visual-qa', status: 'pending' })
    .returning().get();

  const dir = path.join(ASSET_ROOT, String(report.id));
  let screenshots_written = 0;
  const insertedComments = [];

  for (const c of comments) {
    let screenshot_path: string | null = null;
    if (c.screenshot_b64) {
      try {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, `${c.id}.jpg`), Buffer.from(c.screenshot_b64, 'base64'));
        screenshot_path = `visual-qa/${report.id}/${c.id}.jpg`;
        screenshots_written++;
      } catch (err) {
        console.error('[visual-qa] screenshot write failed for', c.id, err);
      }
    }
    const row = db.insert(schema.report_comments).values({
      report_id: report.id,
      comment_uid: c.id,
      project_slug: slug,
      page: c.page ?? null,
      url: c.url ?? null,
      title: c.title ?? null,
      target: c.target ?? null,
      locator: (c.locator ?? null) as Record<string, unknown> | null,
      provenance: (c.provenance ?? null) as Record<string, unknown> | null,
      category: c.category ?? null,
      screenshot_path,
      selection: c.selection ?? null,
      text: c.text,
      ts: c.ts ?? null,
    }).returning().get();
    insertedComments.push(row);
  }

  return NextResponse.json({
    report,
    comments: insertedComments,
    count: insertedComments.length,
    screenshots_written,
    classify_next: `/api/reports/${report.id}/classify`,
    imported_by_session,
  }, { status: 201 });
}
