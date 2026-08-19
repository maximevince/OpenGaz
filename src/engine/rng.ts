/**
 * Deterministic PRNG (mulberry32). State is a single uint32 kept inside GameState so that
 * replaying the same actions from the same seed yields the same game on every client.
 */
export type RngState = number;

export function seedFromString(s: string): RngState {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/** Advance the state; returns [nextState, float in [0,1)]. */
export function next(state: RngState): [RngState, number] {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const f = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [a, f];
}

/** Small stateful wrapper used inside the reducer: `const r = rng(state); r.int(1,6); state.rng = r.state`. */
export class Rng {
  constructor(public state: RngState) {}
  float(): number {
    const [s, f] = next(this.state);
    this.state = s;
    return f;
  }
  /** integer in [lo, hi] inclusive */
  int(lo: number, hi: number): number {
    if (hi < lo) [lo, hi] = [hi, lo];
    return lo + Math.floor(this.float() * (hi - lo + 1));
  }
  /**
   * The original's `f_rnd(a,b) = floor(a + random*(b-a+1))` — accepts fractional bounds
   * (e.g. `fint(1, dist/2)` with dist odd) and floors the result.
   */
  fint(lo: number, hi: number): number {
    if (hi < lo) [lo, hi] = [hi, lo];
    return Math.floor(lo + this.float() * (hi - lo + 1));
  }
  chance(p: number): boolean {
    return this.float() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)]!;
  }
  shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }
}
