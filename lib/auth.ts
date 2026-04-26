// Bearer-token auth — Codex Round 2 #2 (mutating endpoints require token)
// Reads from TRACKER_API_TOKEN_FILE (Docker secret) or TRACKER_API_TOKEN env.

import { readFileSync } from 'node:fs';
import { NextResponse } from 'next/server';

let _cachedToken: string | null = null;

function loadToken(): string | null {
  if (_cachedToken !== null) return _cachedToken;
  const file = process.env.TRACKER_API_TOKEN_FILE;
  if (file) {
    try {
      _cachedToken = readFileSync(file, 'utf8').trim();
      return _cachedToken;
    } catch (err) {
      console.error('[ottomate] Cannot read TRACKER_API_TOKEN_FILE:', err);
    }
  }
  if (process.env.TRACKER_API_TOKEN) {
    _cachedToken = process.env.TRACKER_API_TOKEN.trim();
    return _cachedToken;
  }
  console.error('[ottomate] No bearer token configured (TRACKER_API_TOKEN_FILE or TRACKER_API_TOKEN)');
  return null;
}

/**
 * Returns null if request is authorized; otherwise returns NextResponse to be returned by caller.
 * Use: `const auth = requireBearer(req); if (auth) return auth;`
 */
export function requireBearer(req: Request): NextResponse | null {
  const expected = loadToken();
  if (!expected) {
    return NextResponse.json(
      { error: 'Server misconfigured: no bearer token available' },
      { status: 500 },
    );
  }
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const provided = header.slice('Bearer '.length).trim();
  if (provided !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
