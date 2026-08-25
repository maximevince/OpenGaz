/**
 * The numbers behind the company charts, shared by the Money screen and the flight interlude
 * so both draw the same line from the same figures.
 */
import type { CompanyState, GameState } from '../engine';

/** one colour per company, in seating order — every chart and legend uses it */
export const COMPANY_COLORS = [
  '#ff0000',
  '#00c000',
  '#0000ff',
  '#ff00ff',
  '#00c0c0',
  '#c0c000',
  '#ff8000',
];
export const colorOf = (i: number): string => COMPANY_COLORS[i % COMPANY_COLORS.length]!;

/** net worth as recorded at the week rollover — what the charts are drawn from */
export const atWeekStart = (c: CompanyState): number =>
  c.netWorthHistory[c.netWorthHistory.length - 1] ?? 0;

/**
 * Setup seeds the ring with a cosmetic opening value at index 0 so the bars have something
 * to show in week 1. It is never plotted: until the ring wraps past week 20 the line starts
 * at the first real weekly recording.
 */
export const histSeries = (s: GameState): number[][] =>
  s.companies.map((c) => (s.week <= 20 ? c.netWorthHistory.slice(1) : c.netWorthHistory));

/** week 1 has a single real recording, so there is no line to draw yet */
export const canPlotHistory = (s: GameState): boolean => (histSeries(s)[0]?.length ?? 0) > 1;
