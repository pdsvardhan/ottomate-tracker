// tests/viewer.test.ts — the owner/visitor rule (iter-208 #1509, adr-026).
// owner view = x-authentik-username present OR cf-connecting-ip absent; else visitor view.
import { describe, expect, it } from 'vitest';
import { isOwnerView, viewerFrom } from '../lib/viewer';

const h = (init: Record<string, string>) => new Headers(init);

describe('isOwnerView', () => {
  it('signed in through the tunnel (Authentik identity + Cloudflare IP) is the owner', () => {
    expect(isOwnerView(h({ 'x-authentik-username': 'pdsv', 'cf-connecting-ip': '203.0.113.7' }))).toBe(true);
  });
  it('the LAN path (NPM straight to the app, no Cloudflare header) is the owner', () => {
    expect(isOwnerView(h({}))).toBe(true);
    expect(isOwnerView(h({ 'x-forwarded-for': '192.0.2.20' }))).toBe(true);
  });
  it('an anonymous request through the tunnel is a visitor', () => {
    expect(isOwnerView(h({ 'cf-connecting-ip': '203.0.113.7' }))).toBe(false);
  });
  it('blank header values count as absent', () => {
    expect(isOwnerView(h({ 'x-authentik-username': '  ', 'cf-connecting-ip': '203.0.113.7' }))).toBe(false);
    expect(isOwnerView(h({ 'cf-connecting-ip': '   ' }))).toBe(true);
  });
  it('header names are case-insensitive (Headers semantics)', () => {
    expect(isOwnerView(h({ 'X-Authentik-Username': 'pdsv', 'CF-Connecting-IP': '203.0.113.7' }))).toBe(true);
    expect(isOwnerView(h({ 'CF-Connecting-IP': '203.0.113.7' }))).toBe(false);
  });
  it('works with any get()-shaped reader, not only Headers', () => {
    const map = new Map([['cf-connecting-ip', '198.51.100.1']]);
    expect(isOwnerView({ get: (n) => map.get(n) ?? null })).toBe(false);
  });
  it('viewerFrom wraps the rule', () => {
    expect(viewerFrom(h({ 'cf-connecting-ip': '203.0.113.7' }))).toEqual({ owner: false });
    expect(viewerFrom(h({}))).toEqual({ owner: true });
  });
});
