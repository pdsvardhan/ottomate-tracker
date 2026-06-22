// /api/inspirations/[id]/thumbnail — serves a self-hosted thumbnail image for an
// inspiration from the asset-library volume (/asset-library/inspirations/<id>.<ext>,
// host: /mnt/storage/ottomate/assets/inspirations/). iter-8 #63: dribbble blocks
// automated fetching, so thumbnails are user-supplied files served from the volume
// rather than hotlinked. Set thumbnail_url = "/api/inspirations/<id>/thumbnail".

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const THUMB_ROOT = '/asset-library/inspirations';
const EXT_TO_TYPE: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
};

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  // Hard guard against path traversal — ids are `insp-<slug>` only.
  if (!/^insp-[a-z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid inspiration id' }, { status: 400 });
  }

  for (const ext of Object.keys(EXT_TO_TYPE)) {
    const filePath = path.join(THUMB_ROOT, id + ext);
    try {
      const buf = await fs.readFile(filePath);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': EXT_TO_TYPE[ext],
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch {
      // try next extension
    }
  }
  return NextResponse.json({ error: `No thumbnail on disk for '${id}'` }, { status: 404 });
}
