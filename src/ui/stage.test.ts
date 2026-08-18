import { describe, expect, it } from 'vitest';
import { STAGE_H, STAGE_W, fitScale, rotationHelps } from './stage';

/** Viewports we care about, in CSS pixels (portrait first, landscape second). */
const PHONE = [390, 844] as const;
const TABLET = [768, 1024] as const;

function fits(vw: number, vh: number, rotated: boolean) {
  const s = fitScale(vw, vh, rotated);
  const w = (rotated ? STAGE_H : STAGE_W) * s;
  const h = (rotated ? STAGE_W : STAGE_H) * s;
  // a hair of tolerance for binary floating point
  return w <= vw + 1e-9 && h <= vh + 1e-9;
}

describe('fitScale', () => {
  it('fills the limiting axis exactly', () => {
    expect(fitScale(1280, 960)).toBe(2); // both axes at once
    expect(fitScale(640, 960)).toBe(1); // width-limited
    expect(fitScale(1280, 480)).toBe(1); // height-limited
  });

  it('never crops the stage, in either orientation', () => {
    const cases: Array<readonly [number, number]> = [
      PHONE,
      [PHONE[1], PHONE[0]],
      TABLET,
      [TABLET[1], TABLET[0]],
      [320, 568],
      [1920, 1080],
      [100, 100],
    ];
    for (const [vw, vh] of cases) {
      expect(fits(vw, vh, false)).toBe(true);
      expect(fits(vw, vh, true)).toBe(true);
    }
  });

  it('falls back to 1:1 on a viewport that has not been measured yet', () => {
    expect(fitScale(0, 0)).toBe(1);
    expect(fitScale(Number.NaN, 480)).toBe(1);
  });
});

describe('rotationHelps', () => {
  it('is offered on portrait phones and tablets', () => {
    expect(rotationHelps(...PHONE)).toBe(true);
    expect(rotationHelps(...TABLET)).toBe(true);
  });

  it('is never offered in landscape', () => {
    expect(rotationHelps(PHONE[1], PHONE[0])).toBe(false);
    expect(rotationHelps(TABLET[1], TABLET[0])).toBe(false);
    expect(rotationHelps(1920, 1080)).toBe(false);
  });

  it('is not offered when it would barely help', () => {
    expect(rotationHelps(600, 620)).toBe(false); // near-square
    expect(rotationHelps(0, 0)).toBe(false);
  });

  it('only claims to help when it really does', () => {
    for (const [vw, vh] of [PHONE, TABLET] as const) {
      expect(fitScale(vw, vh, true)).toBeGreaterThan(fitScale(vw, vh, false));
    }
  });
});
