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

/** Filesystem root of a project's checkout as this process can reach it. */
export function repoRoot(slug: string): string {
  return slug === SELF_SLUG ? process.cwd() : path.join(REPOS_DIR, slug);
}
