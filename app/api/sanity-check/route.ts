// /api/sanity-check — boot-time sanity checks for the tracker itself.
// (Not the per-stage R9 checks — those run from the skill against this API.)

import { NextResponse } from 'next/server';
import { count } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET() {
  const checks: { name: string; ok: boolean; detail?: string }[] = [];
  let db;
  try {
    db = await getDb();
    checks.push({ name: 'db.connected', ok: true });
  } catch (err) {
    checks.push({ name: 'db.connected', ok: false, detail: String(err) });
    return NextResponse.json({ ok: false, checks }, { status: 500 });
  }

  try {
    const [{ n }] = db.select({ n: count() }).from(schema.risks_catalog).all();
    checks.push({
      name: 'risks_catalog.seeded',
      ok: Number(n) >= 50,
      detail: `${n} rows`,
    });
  } catch (err) {
    checks.push({ name: 'risks_catalog.seeded', ok: false, detail: String(err) });
  }

  try {
    const [{ n }] = db.select({ n: count() }).from(schema.master_components).all();
    checks.push({
      name: 'master_components.seeded',
      ok: Number(n) >= 15,
      detail: `${n} rows`,
    });
  } catch (err) {
    checks.push({ name: 'master_components.seeded', ok: false, detail: String(err) });
  }

  // Bearer token presence.
  const tokenConfigured = Boolean(process.env.TRACKER_API_TOKEN_FILE || process.env.TRACKER_API_TOKEN);
  checks.push({ name: 'bearer_token.configured', ok: tokenConfigured });

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json({ ok: allOk, checks }, { status: allOk ? 200 : 503 });
}
