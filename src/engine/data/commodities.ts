export type CommodityId =
  | 'cantaloupe'
  | 'jellybeans'
  | 'moonferns'
  | 'froglegs'
  | 'whipcream'
  | 'babelseeds'
  | 'diapers'
  | 'umbrellas'
  | 'toasters'
  | 'polyester'
  | 'hairtonic'
  | 'lavalamps'
  | 'oxygen'
  | 'ogglesand'
  | 'kryptoons'
  | 'xfuels'
  | 'gems'
  | 'exotic';

export interface CommodityDef {
  id: CommodityId;
  name: string;
  /** rank 1..18 — min price = 5*rank, max = 8*min */
  rank: number;
  /** is it perishable/agricultural (affected by harvest news)? */
  agri: boolean;
}

const defs: [CommodityId, string, boolean][] = [
  ['cantaloupe', 'Cantaloupe', true],
  ['jellybeans', 'Jelly Beans', false],
  ['moonferns', 'Moon Ferns', true],
  ['froglegs', 'Frog Legs', true],
  ['whipcream', 'Whip Cream', true],
  ['babelseeds', 'Babel Seeds', true],
  ['diapers', 'Diapers', false],
  ['umbrellas', 'Umbrellas', false],
  ['toasters', 'Toasters', false],
  ['polyester', 'Polyester', false],
  ['hairtonic', 'Hair Tonic', false],
  ['lavalamps', 'Lava Lamps', false],
  ['oxygen', 'Oxygen', false],
  ['ogglesand', 'Oggle Sand', false],
  ['kryptoons', 'Kryptoons', false],
  ['xfuels', 'X Fuels', false],
  ['gems', 'Gems', false],
  ['exotic', 'Exotic', false],
];

export const COMMODITIES: readonly CommodityDef[] = defs.map(([id, name, agri], i) => ({
  id,
  name,
  rank: i + 1,
  agri,
}));

export const COMMODITY_BY_ID: Record<CommodityId, CommodityDef> = Object.fromEntries(
  COMMODITIES.map((c) => [c.id, c]),
) as Record<CommodityId, CommodityDef>;

export function priceRange(c: CommodityDef): { min: number; max: number } {
  const min = 5 * c.rank;
  return { min, max: 8 * min };
}

/** Typical tons available on a planet at 100 % supply: cheap goods plentiful, exotic scarce. */
export function baseAvailability(c: CommodityDef): number {
  return Math.round(150 - (140 * (c.rank - 1)) / 17); // 150 .. 10
}
