// Serves image assets from the asset-library volume (visual-QA screenshots, etc.).
// Read-only, path-traversal guarded, images only. Mirrors app/api/previews/[...path].
import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ASSET_ROOT = '/asset-library';
const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const rel = (parts ?? []).join('/');
  const root = path.resolve(ASSET_ROOT);
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
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300' },
    });
  } catch {
    return new NextResponse('not found', { status: 404 });
  }
}
