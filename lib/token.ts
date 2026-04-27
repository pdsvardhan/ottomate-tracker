// Server-side token reader. Used by the root layout to read the bearer token
// from the Docker secret file or env, then inject it into the page so client
// components don't have to ask the user.
//
// This works because the tracker is localhost-bound — the only origin that
// can fetch the page IS the user (after SSH tunnel). XSS would still be a
// concern in a public deployment; for that, switch to HttpOnly cookie via
// Route Handler instead. Codex Round 2 #2 still satisfied because the
// API itself enforces bearer auth on every mutation.

import { readFileSync } from 'node:fs';

let _cached: string | null = null;

export function getServerToken(): string {
  if (_cached !== null) return _cached;
  const file = process.env.TRACKER_API_TOKEN_FILE;
  if (file) {
    try {
      _cached = readFileSync(file, 'utf8').trim();
      return _cached;
    } catch (err) {
      console.warn('[ottomate] could not read TRACKER_API_TOKEN_FILE:', err);
    }
  }
  if (process.env.TRACKER_API_TOKEN) {
    _cached = process.env.TRACKER_API_TOKEN.trim();
    return _cached;
  }
  console.warn('[ottomate] no bearer token available; UI mutations will 401');
  return '';
}
