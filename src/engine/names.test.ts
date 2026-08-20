import { describe, expect, it } from 'vitest';
import { COMPANY_NAME_MAX, Rng, randomCompanyName, randomCompanyNames, randomPlayerName } from '.';

const rng = () => new Rng(0xc0ffee);

describe('placeholder names', () => {
  it('fits the company input limit', () => {
    const r = rng();
    for (let i = 0; i < 2000; i++) {
      const n = randomCompanyName(r);
      expect(n.length).toBeLessThanOrEqual(COMPANY_NAME_MAX);
      expect(n.trim()).toBe(n);
    }
  });

  it('honours a tighter limit', () => {
    const r = rng();
    for (let i = 0; i < 500; i++)
      expect(randomCompanyName(r, { maxLen: 12 }).length).toBeLessThanOrEqual(12);
  });

  it('never repeats a taken name', () => {
    const r = rng();
    const taken = ['Jolt Group', 'Snug Runs'];
    for (let i = 0; i < 500; i++) {
      expect(taken.map((t) => t.toLowerCase())).not.toContain(
        randomCompanyName(r, { taken }).toLowerCase(),
      );
    }
  });

  it('stays unique even when the limit squeezes the pool', () => {
    // maxLen 11 rules out most shapes, so this leans on the clipped/numbered fallback
    const names = randomCompanyNames(rng(), 60, { maxLen: 11 });
    expect(new Set(names).size).toBe(60);
    for (const n of names) expect(n.length).toBeLessThanOrEqual(11);
  });

  it('terminates on a limit too small to be unique', () => {
    const names = randomCompanyNames(rng(), 5, { maxLen: 3 });
    for (const n of names) expect(n.length).toBeLessThanOrEqual(3);
  });

  it('is deterministic for a given seed', () => {
    expect(randomCompanyNames(rng(), 5)).toEqual(randomCompanyNames(rng(), 5));
    expect(randomPlayerName(rng())).toBe(randomPlayerName(rng()));
  });

  it('produces varied output', () => {
    const r = rng();
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(randomCompanyName(r));
    expect(seen.size).toBeGreaterThan(250);
  });

  it('gives a two-part player name that fits the 20-char input', () => {
    const r = rng();
    for (let i = 0; i < 500; i++) {
      const n = randomPlayerName(r);
      expect(n.length).toBeLessThanOrEqual(20);
      expect(n.split(' ')).toHaveLength(2);
    }
  });
});
