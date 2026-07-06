// /api/projects/[slug]/media/[file] — serve (public) + delete (bearer). #165.

import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { notFound } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { MEDIA_MIME, MEDIA_ROOT, safeName } from '@/lib/media';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; file: string }>; }

function resolveFile(slug: string, file: string): { abs: string; mime: string } | null {
  const name = safeName(decodeURIComponent(file));
  if (!name) return null;
  const abs = path.join(MEDIA_ROOT, path.basename(slug), name);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  return { abs, mime: MEDIA_MIME[path.extname(name).toLowerCase()]! };
}

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, file } = await params;
  const hit = resolveFile(slug, file);
  if (!hit) return notFound('media not found');
  const body = fs.readFileSync(hit.abs);
  return new NextResponse(body, {
    headers: {
      'Content-Type': hit.mime,
      'Content-Length': String(body.byteLength),
      // Replaceable media — cache briefly, never immutable.
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug, file } = await params;
  const hit = resolveFile(slug, file);
  if (!hit) return notFound('media not found');
  fs.unlinkSync(hit.abs);
  return NextResponse.json({ deleted: path.basename(hit.abs) });
}
