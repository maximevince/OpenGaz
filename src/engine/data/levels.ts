export type Level = 'tutorial' | 'novice' | 'beginner' | 'intermediate' | 'expert' | 'master';

export interface LevelDef {
  id: Level;
  name: string;
  startCash: number;
  shipPrice: number; // financed by Mr. Zinn
  targetNetWorth: number;
  /** trade margin squeeze 0..1 (higher = narrower spreads) */
  squeeze: number;
  aiIq: number; // 0..1 default opponent intelligence
}

export const LEVELS: readonly LevelDef[] = [
  {
    id: 'tutorial',
    name: 'Tutorial',
    startCash: 50000,
    shipPrice: 100000,
    targetNetWorth: 1000000,
    squeeze: 0.0,
    aiIq: 0.2,
  },
  {
    id: 'novice',
    name: 'Novice',
    startCash: 50000,
    shipPrice: 110000,
    targetNetWorth: 2000000,
    squeeze: 0.1,
    aiIq: 0.35,
  },
  {
    id: 'beginner',
    name: 'Beginner',
    startCash: 50000,
    shipPrice: 120000,
    targetNetWorth: 3000000,
    squeeze: 0.2,
    aiIq: 0.5,
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    startCash: 50000,
    shipPrice: 130000,
    targetNetWorth: 4000000,
    squeeze: 0.3,
    aiIq: 0.65,
  },
  {
    id: 'expert',
    name: 'Expert',
    startCash: 50000,
    shipPrice: 140000,
    targetNetWorth: 5000000,
    squeeze: 0.4,
    aiIq: 0.8,
  },
  {
    id: 'master',
    name: 'Master',
    startCash: 50000,
    shipPrice: 150000,
    targetNetWorth: 7500000,
    squeeze: 0.5,
    aiIq: 1.0,
  },
];

export const LEVEL_BY_ID = (id: Level): LevelDef => LEVELS.find((l) => l.id === id)!;

/** Global economy constants (Novice baseline; some are modified by news/specials at runtime). */
export const ECON = {
  bankRate: 0.01,
  unionRate: 0.05,
  unionLimit: 100000,
  zinnRate: 0.04,
  zinnLimit: 200000,
  importTariff: 0.03,
  exportTariff: 0.02,
  passengerTax: 0.15,
  crewSalary: 1500,
  ticketMin: 100,
  ticketMax: 10000,
  ticketDefault: 1000,
  fuelPriceMin: 100,
  fuelPriceMax: 1000,
  brokerFee: 0.01,
  stockWeeklyCashCap: 0.5,
  freeWarehouseTons: 50,
  facilityAuctionsFromWeek: 11,
  adTiers: [0, 1000, 2000, 3000, 4000, 5000, 10000] as const,
  adTierNames: ['None', 'Fliers', 'Newspaper', 'Magazine', 'Radio', 'TV', 'Everything'] as const,
} as const;
