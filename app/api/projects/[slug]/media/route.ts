// /api/projects/[slug]/media — list (public) + upload (bearer). #165.

import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db/client';
import { badRequest, notFound } from '@/lib/api';
import { requireBearer } from '@/lib/auth';
import { listProjectMedia, pickReel, safeName, MEDIA_ROOT, MAX_MEDIA_BYTES } from '@/lib/media';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  return NextResponse.json({ files: listProjectMedia(slug), reel: pickReel(slug) });
}

export async function POST(req: Request, { params }: Ctx) {
  const authError = requireBearer(req);
  if (authError) return authError;
  const { slug } = await params;
  const db = await getDb();
  const project = db.select({ slug: schema.projects.slug }).from(schema.projects)
    .where(eq(schema.projects.slug, slug)).get();
  if (!project) return notFound(`Project '${slug}' not found`);

  const fd = await req.formData().catch(() => null);
  const file = fd?.get('file');
  if (!(file instanceof File)) return badRequest('multipart form-data with a "file" field required');
  if (file.size === 0) return badRequest('empty file');
  if (file.size > MAX_MEDIA_BYTES) return badRequest(`file exceeds ${MAX_MEDIA_BYTES / 1024 / 1024}MB cap`);
  const name = safeName((fd!.get('name') as string | null) ?? file.name);
  if (!name) return badRequest('unsupported media type (mp4/webm/gif/png/jpg/webp/avif)');

  const dir = path.join(MEDIA_ROOT, path.basename(slug));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ files: listProjectMedia(slug), reel: pickReel(slug) }, { status: 201 });
}
