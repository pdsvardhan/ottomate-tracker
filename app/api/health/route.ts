import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb, scanDeletedDbFds } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = await getDb();
    db.run(sql`SELECT 1`);
    // adr-018: surface the deleted-fd tripwire here so monitors catch a
    // mid-session split without waiting for the next mutation to 503.
    const deletedFds = scanDeletedDbFds();
    const healthy = deletedFds.length === 0;
    return NextResponse.json({
      status: healthy ? 'ok' : 'degraded',
      version: process.env.npm_package_version || '0.1.0',
      port: process.env.PORT || '3000',
      db: 'connected',
      db_fds: healthy ? 'clean' : deletedFds,
      timestamp: new Date().toISOString(),
    }, { status: healthy ? 200 : 503 });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', error: String(err) },
      { status: 500 }
    );
  }
}
