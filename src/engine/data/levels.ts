export type Level = 'tutorial' | 'novice' | 'beginner' | 'intermediate' | 'expert' | 'master';

/** Difficulty presets. Levels 1..6. */
export interface LevelDef {
  id: Level;
  name: string;
  /** price-band difficulty 0..4 (levels 1-2 share 0) — raises the price floor */
  difficulty: number;
  startCash: number;
  /** starting debt to Mr. Zinn = the ship's financed price */
  zinnDebt: number;
  /** starting good-event probability */
  eventGood: number;
  /** per-trip floor applied to eventGood (levels 1-2 only) */
  eventGoodFloor: number;
  /** opponent iQ % — cargo-quantity factor */
  opponentIq: number;
  tutor: boolean;
}

export const LEVELS: readonly LevelDef[] = [
  // level:            diff cash    zinn     eG  floor iq
  mk('tutorial', 'Tutorial', 0, 50000, 100000, 85, 45, 50, true),
  mk('novice', 'Novice', 0, 25000, 110000, 75, 35, 75, false),
  mk('beginner', 'Beginner', 1, 0, 120000, 65, 0, 100, false),
  mk('intermediate', 'Intermediate', 2, 0, 130000, 55, 0, 125, false),
  mk('expert', 'Expert', 3, 0, 140000, 50, 0, 150, false),
  mk('master', 'Master', 4, 0, 150000, 50, 0, 175, false),
];

function mk(
  id: Level,
  name: string,
  difficulty: number,
  startCash: number,
  zinnDebt: number,
  eventGood: number,
  eventGoodFloor: number,
  opponentIq: number,
  tutor: boolean,
): LevelDef {
  return {
    id,
    name,
    difficulty,
    startCash,
    zinnDebt,
    eventGood,
    eventGoodFloor,
    opponentIq,
    tutor,
  };
}

export const LEVEL_BY_ID = (id: Level): LevelDef => LEVELS.find((l) => l.id === id)!;
export const LEVEL_INDEX = (id: Level): number => LEVELS.findIndex((l) => l.id === id);

/** Global economy constants. Rates are integer percent per week. */
export const ECON = {
  savingsRate: 1, // bank interest %/wk (1..3)
  loanRate: 5, // Trader's Union %/wk
  loanMax: 100000,
  zinnRate: 4, // %/wk
  zinnMax: 200000,
  importTariff: 3, // % (bounds 1..15)
  exportTariff: 2, // % (bounds 1..15)
  passTax: 15, // % (bounds 0..50)
  crewSalary: 1500,
  ticketMin: 100,
  ticketDefault: 1000,
  fuelPriceRange: 200, // planet fuel price = fint(range, range*10)
  insurancePriceRange: 15, // premium = fint(range, range*1000)
  warehouseSpace: 50, // tons, one scalar for every planet
  brokerFee: 1, // % on stock trades
  /** ad level base costs; actual cost = floor(base * shipTons / 400) */
  adTiers: [0, 1000, 2000, 3000, 4000, 5000, 10000] as const,
  adTierNames: ['None', 'Fliers', 'Newspaper', 'Magazine', 'Radio', 'TV', 'Everything'] as const,
} as const;
