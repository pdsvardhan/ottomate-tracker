// lib/media.ts — per-project reel/media pipeline (#165, owner un-parked 2026-07-07).
//
// Filesystem-as-truth: media lives under data/media/<slug>/ (the writable data
// volume — /app/data in the container). No DB table: GET lists the directory,
// the "reel" is reel.<ext> when present, else the first file by name. Upload
// and delete are bearer-gated API routes; serving is public (the showcase is).

import fs from 'node:fs';
import path from 'node:path';

export const MEDIA_ROOT = path.join(process.cwd(), 'data', 'media');

export const MEDIA_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};
export const VIDEO_EXT = new Set(['.mp4', '.webm']);
export const MAX_MEDIA_BYTES = 60 * 1024 * 1024; // 60MB — short screen captures

export interface MediaFile {
  name: string;
  url: string;
  mime: string;
  kind: 'video' | 'image';
  size: number;
}

/** Slug + filename hygiene — media paths never traverse. */
export function safeName(name: string): string | null {
  const base = path.basename(name).replace(/[^A-Za-z0-9._-]/g, '-');
  const ext = path.extname(base).toLowerCase();
  if (!MEDIA_MIME[ext] || base.startsWith('.')) return null;
  return base;
}

export function listProjectMedia(slug: string): MediaFile[] {
  const dir = path.join(MEDIA_ROOT, path.basename(slug));
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const out: MediaFile[] = [];
  for (const name of entries.sort()) {
    const ext = path.extname(name).toLowerCase();
    const mime = MEDIA_MIME[ext];
    if (!mime) continue;
    const st = fs.statSync(path.join(dir, name));
    if (!st.isFile()) continue;
    out.push({
      name,
      url: `/api/projects/${slug}/media/${encodeURIComponent(name)}`,
      mime,
      kind: VIDEO_EXT.has(ext) ? 'video' : 'image',
      size: st.size,
    });
  }
  return out;
}

/** The hero/home reel: reel.<ext> wins, else the first media file. */
export function pickReel(slug: string): MediaFile | null {
  const files = listProjectMedia(slug);
  if (files.length === 0) return null;
  return files.find((f) => f.name.replace(/\.[^.]+$/, '') === 'reel') ?? files[0]!;
}
