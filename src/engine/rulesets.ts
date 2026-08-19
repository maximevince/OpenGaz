import type { Ruleset } from './types';

export const DELUXE_INITIAL_WINNING_POINT = 1_000_000;

export function initialWinningPoint(ruleset: Ruleset, legacyTarget: number): number {
  return ruleset === 'deluxe1997' ? DELUXE_INITIAL_WINNING_POINT : legacyTarget;
}

/** The Deluxe ladder is 1M, 2M, 5M, 10M, then +10M through 100M and +100M afterwards. */
export function nextWinningPoint(ruleset: Ruleset, current: number): number {
  if (ruleset === 'steam') return current;
  if (current < 2_000_000) return 2_000_000;
  if (current < 5_000_000) return 5_000_000;
  if (current < 10_000_000) return 10_000_000;
  return current < 100_000_000 ? current + 10_000_000 : current + 100_000_000;
}
