import { COMMODITIES, type CommodityId } from './data/commodities';
import { ECON, LEVEL_BY_ID, type Level } from './data/levels';
import { OPPONENTS } from './data/opponents';
import { MAP_SLOTS, PLANETS, type PlanetId } from './data/planets';
import { SHIP_BY_ID } from './data/ships';
import { refreshPlanetPrices, rollAvailability, rollInsuranceCost } from './economy';
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
  /** ignored — the original always trades all 18 commodities (kept for old call sites) */
  commodities?: CommodityId[];
  humans: { name: string; ship: number }[];
  /** number of computer opponents 0..6 (random pick), ignored when `opponents` is given */
  ai: number;
  /** explicit opponent ids (see data/opponents.ts), in seat order */
  opponents?: string[];
  /** override the level's opponent iQ (the original allows 25..200) */
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

  const ruleset = opts.ruleset ?? 'deluxe1997';
  const state: GameState = {
    version: SAVE_VERSION,
    rng: r.state,
    settings: {
      level: level.id,
      ruleset,
      targetNetWorth: initialWinningPoint(ruleset, 1_000_000),
    },
    week: 1,
    commodities: COMMODITIES.map((c) => c.id),
    planets: [],
    companies: [],
    order: [],
    turnIndex: 0,
    phase: 'onPlanet',
    destination: null,
    pending: null,
    travel: null,
    auction: null,
    auctionLast: null,
    arrivalReports: [],
    awaitingHandoff: false,
    sellingProfit: 0,
    log: [],
    winner: null,
    econ: {
      importTariff: ECON.importTariff,
      exportTariff: ECON.exportTariff,
      passTax: ECON.passTax,
      fuelPriceRange: ECON.fuelPriceRange,
    },
    news: r.fint(1, 124),
    newsData: r.fint(1, 100),
    newsPlanet: r.fint(0, 6),
    weather: r.fint(1, 70),
    weatherPlanet: r.fint(0, 6),
    gameEvent: 0,
  };

  state.planets = planetIds.map((id, i) => {
    const slot = slots[i]!;
    const p: PlanetState = {
      id,
      slot,
      supply: {},
      stock: {},
      price: {},
      fuelPrice: r.fint(ECON.fuelPriceRange, ECON.fuelPriceRange * 10),
      advertC: 0,
      exchange: {
        // every exchange opens on a fixed ladder: 1,700 down to 1,100 by map slot
        price: 1700 - 100 * slot,
        history: [],
        trend: 50,
        crashed: false,
      },
      facilities: [],
    };
    for (const c of state.commodities) {
      p.supply[c] = r.fint(0, 100);
      p.stock[c] = rollAvailability(p.supply[c]!, 0, r);
    }
    refreshPlanetPrices(state, p);
    p.exchange.history = [p.exchange.price];
    return p;
  });

  const mkCompany = (
    id: string,
    name: string,
    shipId: number,
    isAI: boolean,
    seat: number,
  ): CompanyState => {
    const def = SHIP_BY_ID(shipId);
    const co: CompanyState = {
      id,
      name,
      isAI,
      aiIq: 0,
      aiIndex: 0,
      aiTag: null,
      aiCargo: 0,
      ship: {
        defId: def.id,
        cargo: def.cargo,
        seats: def.seats,
        fuelCap: def.fuel,
        kuarps: def.kuarps,
        crew: def.crew,
        tons: 400,
        fuel: def.fuel,
      },
      cash: level.startCash,
      bank: 0,
      savingsRate: ECON.savingsRate,
      savingsInterest: 0,
      unionLoan: 0,
      loanRate: ECON.loanRate,
      loanInterest: 0,
      unionLimit: ECON.loanMax,
      zinnLoan: level.zinnDebt,
      zinnRate: ECON.zinnRate,
      zinnInterest: 0,
      zinnLimit: ECON.zinnMax,
      planet: seat % 7,
      planetLast: (seat + 1) % 7,
      lastTravelTime: 0,
      travelDelayed: 1,
      cargo: {},
      warehouse: {},
      warehouseSpace: ECON.warehouseSpace,
      ticketPrice: ECON.ticketDefault,
      paxWaiting: 0,
      paxPrice: ECON.ticketDefault,
      paxPickedUp: false,
      passengers: 0,
      adPassenger: 0,
      adCommodity: 0,
      advertInvestedP: 0,
      advertInvestedC: 0,
      advertP: 0,
      crewSalary: ECON.crewSalary,
      wagesOwed: 0,
      taxOwedPassenger: 0,
      taxOwedTariff: 0,
      insured: false,
      insurancePriceRange: ECON.insurancePriceRange,
      insuranceCost: 0,
      shares: {},
      stockBoughtThisWeek: false,
      eventGood: level.eventGood,
      eventLastGood: true,
      random: r.fint(1, 100),
      sabotageDamage: 0,
      specialUsed: false,
      arrivalPending: false,
      bankrupt: false,
      netWorthHistory: [],
      inbox: [],
      visitProfit: 0,
    };
    co.insuranceCost = rollInsuranceCost(co, r);
    // a first load of passengers is already waiting when you take delivery
    co.paxWaiting = r.fint(1, co.ship.seats);
    return co;
  };

  opts.humans.forEach((h, i) => state.companies.push(mkCompany(`h${i}`, h.name, h.ship, false, i)));
  const opps = opts.opponents
    ? opts.opponents
        .map((id) => OPPONENTS.find((o) => o.id === id))
        .filter((o): o is (typeof OPPONENTS)[number] => !!o)
        .slice(0, 6)
    : r.shuffle(OPPONENTS).slice(0, Math.max(0, Math.min(6, opts.ai)));
  opps.forEach((o) => {
    const co = mkCompany(o.id, o.name, 1, true, OPPONENTS.indexOf(o));
    co.aiStyle = o.style;
    co.aiIndex = OPPONENTS.indexOf(o) + 1;
    co.aiIq = Math.min(200, Math.max(25, opts.aiIq ?? level.opponentIq));
    // rivals are described only by mass and engine; the rest of the ship is irrelevant to them
    co.ship.kuarps = o.engine;
    co.ship.tons = 400;
    state.companies.push(co);
  });

  // rivals start on the same net worth as the first human, staggered slightly
  const humanNw = level.startCash - level.zinnDebt;
  let seat = 0;
  for (const co of state.companies) {
    if (co.isAI) {
      co.cash = humanNw;
      co.zinnLoan = 0;
      co.netWorthHistory.push(Math.floor(humanNw - 0.01 * co.aiIndex * humanNw));
    } else {
      co.netWorthHistory.push(Math.floor(humanNw * (1 + 0.01 * seat++)));
    }
    co.netWorthHistory.push(humanNw);
  }

  state.order = state.companies.map((_, i) => i).filter((i) => !state.companies[i]!.isAI);
  state.rng = r.state;
  return state;
}
