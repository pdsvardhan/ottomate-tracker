// #319 — audience-profile inference + resolution. run: npx vitest --run tests/audience-profile.test.ts
import { describe, it, expect } from 'vitest';
import { suggestProfile, resolveProjectProfile } from '@/lib/audience-profile';

describe('suggestProfile', () => {
  it('a shipped / public project yields a P3 suggestion with the signal named', () => {
    const s = suggestProfile({ current_status: 'shipped', lifecycle_phase: 'shipped', hosting_target: 'public-server' });
    expect(s.profile).toBe('P3');
    expect(s.evidence.join(' ')).toMatch(/shipped|public/);
  });

  it('a maintained project reads P3', () => {
    expect(suggestProfile({ lifecycle_phase: 'maintained', current_status: 'building' }).profile).toBe('P3');
  });

  it('an ideating project yields P1', () => {
    expect(suggestProfile({ lifecycle_phase: 'ideating', current_status: 'building' }).profile).toBe('P1');
  });

  it('a still-building home-hosted project yields P1 (vault7a-docker is not external)', () => {
    expect(suggestProfile({ current_status: 'building', lifecycle_phase: 'building', hosting_target: 'vault7a-docker', public_url: 'https://x' }).profile).toBe('P1');
  });
});

describe('resolveProjectProfile', () => {
  it('NEVER overwrites an owner-set profile — the set value wins over a divergent suggestion', () => {
    const r = resolveProjectProfile({ lifecycle_phase: 'shipped', hosting_target: 'public-server' }, 'P1');
    expect(r.profile).toBe('P1'); // signals suggest P3, but the owner said P1
    expect(r.source).toBe('set');
  });

  it('suggests when unset, marked suggested not set', () => {
    const r = resolveProjectProfile({ lifecycle_phase: 'shipped' });
    expect(r.source).toBe('suggested');
    expect(r.profile).toBe('P3');
  });

  it('ignores a garbage stored profile and falls back to a suggestion', () => {
    const r = resolveProjectProfile({ lifecycle_phase: 'ideating' }, 'nonsense');
    expect(r.source).toBe('suggested');
    expect(r.profile).toBe('P1');
  });
});
