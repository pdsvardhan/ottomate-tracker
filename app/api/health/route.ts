import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = await getDb();
    // Sanity: query schema_version
    const result = await db.run('SELECT 1 as ok');
    return NextResponse.json({
      status: 'ok',
      version: process.env.npm_package_version || '0.1.0',
      port: process.env.PORT || '3000',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', error: String(err) },
      { status: 500 }
    );
  }
}
