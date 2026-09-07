// /api/projects/[slug]/architecture/[file] — return .mmd source content

import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { badRequest, notFound } from '@/lib/api';
import { repoRoot } from '@/lib/repo-root';

export const runtime = 'nodejs';

interface Ctx { params: Promise<{ slug: string; file: string }>; }

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, file } = await params;
  if (!file.endsWith('.mmd')) return badRequest('Only .mmd files supported');
  if (file.includes('..') || file.includes('/')) return badRequest('Invalid file');
  const full = path.join(repoRoot(slug), 'architecture', file);
  let body: string;
  try {
    body = readFileSync(full, 'utf8');
  } catch {
    return notFound(`File '${file}' not found in ${slug}/architecture`);
  }
  return NextResponse.json({ name: file, body });
}
