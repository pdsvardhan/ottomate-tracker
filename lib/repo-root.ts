// lib/repo-root.ts — where a project's checkout is, seen from inside the container (#848, 2026-09-07).
//
// /repos is a read-only bind of /mnt/storage/websites; every project lives there EXCEPT the tracker itself,
// whose "project view" (/mnt/storage/websites/ottomate) is a symlink to /opt/homeserver/ottomate — a path the
// container does not mount, so the link dangles inside and every /repos/ottomate/... read came back empty
// (the showcase listed 0 of 3 architecture diagrams, the YAML-mirror drift check saw no mirror). The image is
// built from that very checkout, so for the self-project the truthful root is the app's own working directory.
import path from 'node:path';

export const REPOS_DIR = process.env.OTTOMATE_REPOS_DIR ?? '/repos';
export const SELF_SLUG = process.env.OTTOMATE_SELF_SLUG ?? 'ottomate';

/**
 * Filesystem root of a project's checkout as this process can reach it. Use it for assets that change only by
 * commit (architecture diagrams): for the self-project those are baked into the image and current until the next
 * rebuild. Do NOT use it for files written on the host at runtime (the YAML mirrors) — the image copy is frozen.
 * A slug that could climb out of /repos is neutralised rather than trusted.
 */
export function repoRoot(slug: string): string {
  const safe = /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : slug.replace(/[^a-z0-9-]/g, '_');
  return safe === SELF_SLUG ? process.cwd() : path.join(REPOS_DIR, safe);
}
