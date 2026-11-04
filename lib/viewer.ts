// Owner view vs visitor view (iter-208 #1509, adr-026). ONE rule, used by every page that
// shows the public something different from the owner:
//
//   owner view   = the request carries an Authentik identity (x-authentik-username is set by the
//                  NPM forward-auth block after a real sign-in), OR it did not come through the
//                  Cloudflare tunnel at all (no cf-connecting-ip: the LAN path, NPM straight to
//                  the app, or localhost)
//   visitor view = everything else: it came through the tunnel and nobody signed in
//
// Pure and header-shape-agnostic so it is unit-testable without a Next request; the server
// wrapper that reads the live request headers is lib/viewer-server.ts.

export interface HeaderReader {
  get(name: string): string | null;
}

export interface Viewer {
  owner: boolean;
}

function present(value: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isOwnerView(headers: HeaderReader): boolean {
  if (present(headers.get('x-authentik-username'))) return true;
  return !present(headers.get('cf-connecting-ip'));
}

export function viewerFrom(headers: HeaderReader): Viewer {
  return { owner: isOwnerView(headers) };
}
