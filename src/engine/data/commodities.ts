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
  /** linear index k = 1..18 — price band pMin=(difficulty+1)*5*k .. pMax=40*k */
  rank: number;
  /** category 0 agricultural / 1 manufactured / 2 raw */
  cat: 0 | 1 | 2;
}

const defs: [CommodityId, string][] = [
  ['cantaloupe', 'Cantaloupe'],
  ['jellybeans', 'Jelly Beans'],
  ['moonferns', 'Moon Ferns'],
  ['froglegs', 'Frog Legs'],
  ['whipcream', 'Whip Cream'],
  ['babelseeds', 'Babel Seeds'],
  ['diapers', 'Diapers'],
  ['umbrellas', 'Umbrellas'],
  ['toasters', 'Toasters'],
  ['polyester', 'Polyester'],
  ['hairtonic', 'Hair Tonic'],
  ['lavalamps', 'Lava Lamps'],
  ['oxygen', 'Oxygen'],
  ['ogglesand', 'Oggle Sand'],
  ['kryptoons', 'Kryptoons'],
  ['xfuels', 'X Fuels'],
  ['gems', 'Gems'],
  ['exotic', 'Exotic'],
];

export const COMMODITIES: readonly CommodityDef[] = defs.map(([id, name], i) => ({
  id,
  name,
  rank: i + 1,
  cat: Math.floor(i / 6) as 0 | 1 | 2,
}));

export const COMMODITY_BY_ID: Record<CommodityId, CommodityDef> = Object.fromEntries(
  COMMODITIES.map((c) => [c.id, c]),
) as Record<CommodityId, CommodityDef>;

/** ids in a category, in rank order */
export function commoditiesInCat(cat: 0 | 1 | 2): CommodityId[] {
  return COMMODITIES.filter((c) => c.cat === cat).map((c) => c.id);
}

/** Price band at a difficulty: min=(difficulty+1)*5*k, max=40*k. */
export function priceRange(c: CommodityDef, difficulty: number): { min: number; max: number } {
  return { min: (difficulty + 1) * 5 * c.rank, max: 40 * c.rank };
}
