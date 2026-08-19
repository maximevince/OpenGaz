import { COMMODITIES, type CommodityId } from './data/commodities';
import { ECON, LEVEL_BY_ID, type Level } from './data/levels';
import { OPPONENTS } from './data/opponents';
import { MAP_SLOTS, PLANETS, type PlanetId } from './data/planets';
import { SHIP_BY_ID } from './data/ships';
import {
  insurancePremium,
  refreshPlanetPrices,
  rollPassengerDemand,
  stockForSupply,
} from './economy';
import { Rng, seedFromString } from './rng';
import { initialWinningPoint } from './rulesets';
import {
  SAVE_VERSION,
  type CompanyState,
  type GameState,
  type PlanetState,
  type Ruleset,
} from './types';

export interface NewGameOptions {
  seed: string;
  level: Level;
  /** exactly 7 planet ids, or omit to randomize */
  planets?: PlanetId[];
  /** commodities in play; omit for a random 9 */
  commodities?: CommodityId[];
  humans: { name: string; ship: number }[];
  /** number of computer opponents 0..6 (random pick), ignored when `opponents` is given */
  ai: number;
  /** explicit opponent ids (see data/opponents.ts), in seat order */
  opponents?: string[];
  aiIq?: number;
  /** Defaults to the 1997 Deluxe rules. */
  ruleset?: Ruleset;
}

export function newGame(opts: NewGameOptions): GameState {
  const r = new Rng(seedFromString(opts.seed));
  const level = LEVEL_BY_ID(opts.level);

  const planetIds = opts.planets ?? r.shuffle(PLANETS.map((p) => p.id)).slice(0, 7);
  if (planetIds.length !== 7) throw new Error('need exactly 7 planets');
  const slots = r.shuffle(MAP_SLOTS.map((_, i) => i));

  const commodities =
    opts.commodities ??
    r
      .shuffle(COMMODITIES.map((c) => c.id))
      .slice(0, 9)
      .sort(
        (a, b) =>
          COMMODITIES.findIndex((c) => c.id === a) - COMMODITIES.findIndex((c) => c.id === b),
      );

  const ruleset = opts.ruleset ?? 'deluxe1997';
  const state: GameState = {
    version: SAVE_VERSION,
    rng: r.state,
    settings: {
      level: level.id,
      ruleset,
      targetNetWorth: initialWinningPoint(ruleset, level.targetNetWorth),
    },
    week: 1,
    commodities,
    planets: [],
    companies: [],
    order: [],
    turnIndex: 0,
    phase: 'onPlanet',
    destination: null,
    pending: null,
    auction: null,
    arrivalReports: [],
    log: [],
    winner: null,
    econ: {
      importTariff: ECON.importTariff,
      exportTariff: ECON.exportTariff,
      passengerTax: ECON.passengerTax,
    },
  };

  state.planets = planetIds.map((id, i) => {
    const p: PlanetState = {
      id,
      slot: slots[i]!,
      supply: {},
      stock: {},
      price: {},
      fuelPrice: r.int(ECON.fuelPriceMin, ECON.fuelPriceMax),
      exchange: {
        price: 1000 + 100 * r.int(0, 7),
        history: [],
        trend: 0.35 + 0.3 * r.float(),
        closedFor: 0,
      },
      facilities: [],
    };
    for (const c of commodities) {
      p.supply[c] = r.int(5, 100);
      p.stock[c] = stockForSupply(c, p.supply[c]!, r);
    }
    refreshPlanetPrices(state, p, r);
    p.exchange.history = [p.exchange.price];
    return p;
  });

  const startPlanet = () => r.int(0, 6);
  const mkCompany = (id: string, name: string, shipId: number, isAI: boolean): CompanyState => {
    const def = SHIP_BY_ID(shipId);
    const co: CompanyState = {
      id,
      name,
      isAI,
      aiIq: opts.aiIq ?? level.aiIq,
      ship: {
        defId: def.id,
        cargo: def.cargo,
        seats: def.seats,
        fuelCap: def.fuel,
        kuarps: def.kuarps,
        crew: def.crew,
        klass: 1,
        fuel: def.fuel,
      },
      cash: level.startCash,
      bank: 0,
      bankRate: ECON.bankRate,
      unionLoan: 0,
      unionRate: ECON.unionRate,
      unionLimit: ECON.unionLimit,
      zinnLoan: level.shipPrice,
      zinnRate: ECON.zinnRate,
      zinnLimit: ECON.zinnLimit,
      planet: startPlanet(),
      lastTravelTime: 0,
      cargo: {},
      warehouse: {},
      warehouseCap: {},
      ticketPrice: ECON.ticketDefault,
      paxBase: 0,
      paxAdBonus: 0,
      passengers: 0,
      adPassenger: 0,
      adCommodity: 0,
      crewSalary: ECON.crewSalary,
      wagesOwed: 0,
      onStrike: false,
      taxOwedPassenger: 0,
      taxOwedTariff: 0,
      weeksTaxUnpaid: 0,
      insured: false,
      insurancePremium: 0,
      shares: {},
      stockBoughtThisWeek: false,
      luck: 0.5,
      blessed: false,
      bankrupt: false,
      netWorthHistory: [],
      inbox: [],
      mods: { insurance: 1, fuelDiscount: 0, blessedWeeks: 0, upgrades: 0, specialWeek: 0 },
      visitProfit: 0,
      visitBought: {},
    };
    for (let i = 0; i < 7; i++) co.warehouseCap[i] = ECON.freeWarehouseTons;
    rollPassengerDemand(co, 0, r);
    co.insurancePremium = insurancePremium(state, co, r);
    return co;
  };

  opts.humans.forEach((h, i) => state.companies.push(mkCompany(`h${i}`, h.name, h.ship, false)));
  const opps = opts.opponents
    ? opts.opponents
        .map((id) => OPPONENTS.find((o) => o.id === id))
        .filter((o): o is (typeof OPPONENTS)[number] => !!o)
        .slice(0, 6)
    : r.shuffle(OPPONENTS).slice(0, Math.max(0, Math.min(6, opts.ai)));
  opps.forEach((o) => {
    const co = mkCompany(o.id, o.name, r.int(1, 12), true);
    co.aiStyle = o.style;
    state.companies.push(co);
  });

  state.order = state.companies.map((_, i) => i);
  state.companies.forEach((co) => co.netWorthHistory.push(level.startCash - level.shipPrice));
  state.rng = r.state;
  return state;
}
