// Tiny client component that pulls the server-injected token into
// sessionStorage on first paint. Runs once. Replaces the manual TokenBar
// UX the user explicitly rejected.

'use client';

import { useEffect } from 'react';

export function TokenInjector({ token }: { token: string }) {
  useEffect(() => {
    if (!token) return;
    if (typeof window === 'undefined') return;
    const existing = window.sessionStorage.getItem('ottomate_token');
    if (existing === token) return;
    window.sessionStorage.setItem('ottomate_token', token);
  }, [token]);
  return null;
}
