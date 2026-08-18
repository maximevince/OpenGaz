export const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');
export const pct = (x: number): string => `${Math.round(x * 100)}%`;
export const plural = (n: number, one: string, many = one + 's'): string =>
  `${fmt(n)} ${n === 1 ? one : many}`;
