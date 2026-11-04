// Tiny client component that pulls the server-injected token into
// sessionStorage on first paint. Runs once. Replaces the manual TokenBar
// UX the user explicitly rejected.
//
// iter-208 #1509: the layout passes an empty token in the visitor view, and an empty token now
// CLEARS any stored one, so a browser that is in the visitor view never holds a bearer token.

'use client';

import { useEffect } from 'react';

export function TokenInjector({ token }: { token: string }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!token) {
      window.sessionStorage.removeItem('ottomate_token');
      return;
    }
    const existing = window.sessionStorage.getItem('ottomate_token');
    if (existing === token) return;
    window.sessionStorage.setItem('ottomate_token', token);
  }, [token]);
  return null;
}
