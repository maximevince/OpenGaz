export type PlanetId =
  | 'vexx'
  | 'zile'
  | 'stye'
  | 'frac'
  | 'bass'
  | 'hork'
  | 'xeen'
  | 'pyke'
  | 'nosh'
  | 'loro'
  | 'mira'
  | 'ooom'
  | 'tilo'
  | 'queg';

export type SpecialKind =
  | 'magistrate'
  | 'zinn'
  | 'union'
  | 'insurance'
  | 'broker'
  | 'media'
  | 'mechanic'
  | 'engines'
  | 'fuel'
  | 'shoreleave'
  | 'blessing'
  | 'fortune'
  | 'casino'
  | 'smuggler';

export interface PlanetDef {
  id: PlanetId;
  name: string;
  tagline: string;
  special: SpecialKind;
  /** exchange name shown on the stock screen */
  exchange: string;
}

export const PLANETS: readonly PlanetDef[] = [
  {
    id: 'vexx',
    name: 'Vexx',
    tagline: 'Capital of Kukubia, seat of the Imperial Magistrate',
    special: 'magistrate',
    exchange: 'The Vexx Exchange',
  },
  {
    id: 'zile',
    name: 'Zile',
    tagline: "Wealthy merchants' planet, home of Mr. Zinn",
    special: 'zinn',
    exchange: 'The Zile Exchange',
  },
  {
    id: 'stye',
    name: 'Stye',
    tagline: "Financial hub, headquarters of the Trader's Union",
    special: 'union',
    exchange: 'The Stye Exchange',
  },
  {
    id: 'frac',
    name: 'Frac',
    tagline: "Headquarters of the Voyager's Insurance Company",
    special: 'insurance',
    exchange: 'The Frac Exchange',
  },
  {
    id: 'bass',
    name: 'Bass',
    tagline: 'A playground for stock market analysts',
    special: 'broker',
    exchange: 'The Bass Exchange',
  },
  {
    id: 'hork',
    name: 'Hork',
    tagline: 'Media capital of Kukubia',
    special: 'media',
    exchange: 'The Hork Exchange',
  },
  {
    id: 'xeen',
    name: 'Xeen',
    tagline: 'One giant junkyard of spare parts and brilliant mechanics',
    special: 'mechanic',
    exchange: 'The Xeen Exchange',
  },
  {
    id: 'pyke',
    name: 'Pyke',
    tagline: 'Industrial heartland, home of L-Tech engines',
    special: 'engines',
    exchange: 'The Pyke Exchange',
  },
  {
    id: 'nosh',
    name: 'Nosh',
    tagline: 'Fuel depot of the colonies',
    special: 'fuel',
    exchange: 'The Nosh Exchange',
  },
  {
    id: 'loro',
    name: 'Loro',
    tagline: 'Pleasure planet — every crew’s favourite stop',
    special: 'shoreleave',
    exchange: 'The Loro Exchange',
  },
  {
    id: 'mira',
    name: 'Mira',
    tagline: 'Home of the Grand Sages and the silent Quaso Mutta',
    special: 'blessing',
    exchange: 'The Mira Exchange',
  },
  {
    id: 'ooom',
    name: 'Ooom',
    tagline: 'Fortune tellers and soothsayers on every corner',
    special: 'fortune',
    exchange: 'The Ooom Exchange',
  },
  {
    id: 'tilo',
    name: 'Tilo',
    tagline: 'Casinos as far as the eye can see',
    special: 'casino',
    exchange: 'The Tilo Exchange',
  },
  {
    id: 'queg',
    name: 'Queg',
    tagline: 'Smugglers’ den of Lady Cornucopia',
    special: 'smuggler',
    exchange: 'The Queg Exchange',
  },
];

export const PLANET_BY_ID: Record<PlanetId, PlanetDef> = Object.fromEntries(
  PLANETS.map((p) => [p.id, p]),
) as Record<PlanetId, PlanetDef>;

/** The seven map slots (grid units). Chosen planets are shuffled into these. */
export const MAP_SLOTS: readonly { x: number; y: number }[] = [
  { x: 20, y: 0 },
  { x: 14, y: 6 },
  { x: 11, y: 13 },
  { x: 8, y: 3 },
  { x: 3, y: 10 },
  { x: 21, y: 11 },
  { x: 0, y: 1 },
];

/** Distance between two slots in "million kuters" (rounded Euclidean, min 1). */
export function slotDistance(a: number, b: number): number {
  if (a === b) return 0;
  const p = MAP_SLOTS[a]!;
  const q = MAP_SLOTS[b]!;
  return Math.max(1, Math.round(Math.hypot(p.x - q.x, p.y - q.y)));
}
