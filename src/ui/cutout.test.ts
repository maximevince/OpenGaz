import { describe, expect, it } from 'vitest';
import { keyOutSky } from './cutout';

/** a tiny scene: black sky, one bright star, one lit blob with dark paint inside it */
function scene(w: number, h: number) {
  const d = new Uint8ClampedArray(w * h * 4);
  const set = (x: number, y: number, v: number) => {
    const i = (y * w + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, 0);
  for (let y = 2; y <= 7; y++) for (let x = 2; x <= 7; x++) set(x, y, 200);
  for (let y = 4; y <= 5; y++) for (let x = 3; x <= 6; x++) set(x, y, 5);
  set(9, 1, 255);
  return d;
}

const alphaAt = (d: Uint8ClampedArray, w: number, x: number, y: number) => d[(y * w + x) * 4 + 3];

describe('keyOutSky', () => {
  const W = 12,
    H = 10;

  it('clears the sky around the sprite', () => {
    const d = scene(W, H);
    keyOutSky(d, W, H);
    expect(alphaAt(d, W, 0, 0)).toBe(0);
    expect(alphaAt(d, W, 10, 8)).toBe(0);
  });

  it('keeps dark paint enclosed by the sprite', () => {
    const d = scene(W, H);
    keyOutSky(d, W, H);
    expect(alphaAt(d, W, 4, 4)).toBe(255);
  });

  it('drops a baked star, which is its own little island', () => {
    const d = scene(W, H);
    keyOutSky(d, W, H);
    expect(alphaAt(d, W, 9, 1)).toBe(0);
  });

  it('erodes the outer ring rather than leaving a black seam', () => {
    const d = scene(W, H);
    keyOutSky(d, W, H);
    expect(alphaAt(d, W, 2, 2)).toBe(0);
    expect(alphaAt(d, W, 4, 3)).toBe(255);
  });
});
