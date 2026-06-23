// Serves prebuilt inline-preview assets (index.html, shot.png) from the
// asset-library previews volume. Read-only, path-traversal guarded. (iter-77)
import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PREVIEWS_DIR } from '@/lib/previews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const rel = (parts ?? []).join('/');
  const root = path.resolve(PREVIEWS_DIR);
  const full = path.resolve(root, rel);
  if (full !== root && !full.startsWith(root + path.sep)) {
    return new NextResponse('bad path', { status: 400 });
  }
  const ext = path.extname(full).toLowerCase();
  const type = TYPES[ext];
  if (!type) return new NextResponse('unsupported type', { status: 415 });
  try {
    const buf = await fs.readFile(full);
    return new NextResponse(buf, {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    return new NextResponse('not found', { status: 404 });
  }
}
