/**
 * In-flight events. A trip enters a good or a bad *chain*: every event id is walked
 * in order with its own per-id roll, so several events can fire on one trip. Good ids 2..47,
 * bad ids -2..-19. The streak rule moves `eventGood` at the end of the chain.
 * All amounts scale with the ship's mass class `T = ship.tons` (400, 600, ...).
 */
import { COMMODITIES, type CommodityId } from './data/commodities';
import { HOSTILES, WEATHER_HAZARDS } from './data/hazards';
import { LEVEL_BY_ID } from './data/levels';
import { PLANET_BY_ID } from './data/planets';
import { SHIP_BY_ID } from './data/ships';
import {
  cargoTons,
  cargoValue,
  computePassengers,
  fmt,
  subtractCash,
  warehouseTons,
} from './economy';
import type { Rng } from './rng';
import type { CompanyState, GameState, LogEntry, PendingEvent, TravelCtx } from './types';

/* ------------------------------------------------------------------ context */

export interface EventCtx {
  state: GameState;
  co: CompanyState;
  ci: number;
  tc: TravelCtx;
  r: Rng;
  /** data attached to the pending dialog being resolved */
  data: Record<string, unknown>;
  /** ship mass class */
  T: number;
  report: (kind: LogEntry['kind'], text: string) => void;
  /** post the pending dialog for event `id` */
  ask: (id: number, ev: Omit<PendingEvent, 'context' | 'id'>) => void;
  /** subtract_cash + a text suffix describing where the money came from */
  pay: (amount: number) => string;
  /** a random other planet (not the destination, not the origin) */
  reroute: () => number;
  destName: () => string;
}

function makeCtx(
  state: GameState,
  co: CompanyState,
  ci: number,
  r: Rng,
  data: Record<string, unknown> = {},
): EventCtx {
  const tc = state.travel!;
  return {
    state,
    co,
    ci,
    tc,
    r,
    data,
    T: co.ship.tons,
    report: (kind, text) => {
      const e: LogEntry = { week: state.week, company: ci, kind, text };
      state.log.push(e);
      state.arrivalReports.push(e);
    },
    ask: (id, ev) => {
      state.pending = { ...ev, id: `ev:${id}`, context: 'travel' };
      state.phase = 'event';
    },
    pay: (amount) => {
      const short = amount - co.cash - co.bank;
      subtractCash(co, amount);
      return short > 0
        ? ` The Trader's Union lent you the ${fmt(short)} kubars you were short.`
        : '';
    },
    reroute: () => {
      let d = r.fint(0, 6);
      let guard = 0;
      while ((d === state.destination || d === co.planet) && guard++ < 20) d = r.fint(0, 6);
      return d;
    },
    destName: () => PLANET_BY_ID[state.planets[state.destination!]!.id].name,
  };
}

/* ------------------------------------------------------------- helpers */

function clearCargo(co: CompanyState): number {
  const tons = cargoTons(co);
  co.cargo = {};
  return tons;
}

/** last (highest-rank) commodity with cargo on board */
function lastLot(co: CompanyState): CommodityId | null {
  let found: CommodityId | null = null;
  for (const c of COMMODITIES) {
    if ((co.cargo[c.id]?.tons ?? 0) > 0) found = c.id;
  }
  return found;
}

function backfire(co: CompanyState): void {
  co.eventGood = 45;
}

/** +200 t ship upgrade: per-model additive increments; stacks indefinitely. */
export function applyShipUpgrade(co: CompanyState): void {
  const up = SHIP_BY_ID(co.ship.defId).up;
  co.ship.kuarps += up.engine;
  co.ship.fuelCap += up.fuelCap;
  co.ship.cargo += up.cargo;
  co.ship.seats += up.seats;
  co.ship.crew += up.crew;
  co.insurancePriceRange += up.insurance;
  co.ship.tons += 200;
}

/** Sabotage run: cash damage on every rival, scaled by their tonnage. Compute and apply sabotage damage with the game rng */
export function runSabotage(state: GameState, saboteur: number, X: number, r: Rng): string[] {
  const me = state.companies[saboteur]!;
  const hit: string[] = [];
  const apply = (v: CompanyState) => {
    const x = Math.floor((v.ship.tons * X) / me.ship.tons);
    const D = Math.floor(1.5 * r.fint(2 * x, 3 * x));
    if (D <= 0) return;
    if (v.isAI) {
      v.cash -= D;
    } else {
      if (D > v.cash + v.bank) {
        if (v.sabotageDamage > 0) v.sabotageDamage = -v.sabotageDamage;
        v.sabotageDamage -= D;
      } else {
        v.sabotageDamage += D;
      }
      subtractCash(v, D);
    }
    hit.push(`${v.name} (${fmt(D)})`);
  };
  for (const v of state.companies) if (v.isAI && !v.bankrupt) apply(v);
  for (const v of state.companies) if (!v.isAI && !v.bankrupt && v !== me) apply(v);
  return hit;
}

/* ------------------------------------------------------------ event defs */

interface TravelEventDef {
  /** roll that decides whether this id fires (default: chain-standard rolls) */
  trigger?: (c: EventCtx) => boolean;
  /** state gate checked before the roll */
  pre?: (c: EventCtx) => boolean;
  /** present the dialog (OK-only events apply their effect here) */
  fire: (c: EventCtx) => void;
  /** answer a yes/no dialog */
  resolve?: (c: EventCtx, choice: string) => void;
}

const money = (c: EventCtx, lo: number, hi: number) => c.r.fint(lo, hi) * c.T;

const GOOD: Record<number, TravelEventDef> = {
  2: {
    fire: (c) => {
      const price = c.r.fint(25000, 100000);
      c.ask(2, {
        title: 'New Ship For Sale',
        text: `A dealer hails you mid-flight: a bigger, 200-ton-heavier version of your ${SHIP_BY_ID(c.co.ship.defId).name} is available right now for ${fmt(price)} kubars. Your credit limit would rise by 25,000. Buy it?`,
        choices: yn(),
        portrait: 'dealer',
        mood: 'good',
        data: { price },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const price = (c.data.price as number) ?? 0;
      const suffix = c.pay(price);
      c.co.unionLimit += 25000;
      applyShipUpgrade(c.co);
      computePassengers(c.co, c.r);
      c.report(
        'good',
        `You bought the bigger ship for ${fmt(price)} kubars — cargo ${c.co.ship.cargo} t, ${c.co.ship.seats} seats, ${c.co.ship.fuelCap} t tank, crew ${c.co.ship.crew}.${suffix}`,
      );
    },
  },
  3: {
    fire: (c) => {
      const price = c.r.fint(15000, 50000);
      c.ask(3, {
        title: 'Warehouse Space For Sale',
        text: `The Trader's Union offers you an extra 50 tons of warehouse space on every planet for ${fmt(price)} kubars (your credit limit rises 25,000). Buy?`,
        choices: yn(),
        portrait: 'warehouse',
        mood: 'good',
        data: { price },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const price = (c.data.price as number) ?? 0;
      const suffix = c.pay(price);
      c.co.warehouseSpace += 50;
      c.co.insurancePriceRange += 5;
      c.co.unionLimit += 25000;
      c.report(
        'good',
        `You now have ${c.co.warehouseSpace} tons of warehouse space on every planet.${suffix}`,
      );
    },
  },
  4: {
    pre: (c) => c.co.wagesOwed > 0,
    fire: (c) => {
      const owed = c.co.wagesOwed;
      c.co.wagesOwed = 0;
      note(
        c,
        4,
        'No Need To Pay!',
        'good',
        'crew',
        `Your crew, moved by an attack of team spirit, forgives the ${fmt(owed)} kubars of wages you owed them.`,
      );
    },
  },
  5: {
    pre: (c) => c.co.taxOwedPassenger + c.co.taxOwedTariff > 0,
    fire: (c) => {
      const owed = c.co.taxOwedPassenger + c.co.taxOwedTariff;
      c.co.taxOwedPassenger = 0;
      c.co.taxOwedTariff = 0;
      note(
        c,
        5,
        'Imperial Tax Break',
        'good',
        'dred',
        `Emperor Dred, in a rare festive mood, cancels the ${fmt(owed)} kubars you owed in taxes and tariffs.`,
      );
    },
  },
  6: {
    fire: (c) => {
      c.co.ship.kuarps += 1;
      note(
        c,
        6,
        'Super Deal',
        'good',
        'ltech',
        `A passing L-Tech test pilot fits you a prototype booster, free of charge. Engine speed is now ${c.co.ship.kuarps} kuarps.`,
      );
    },
  },
  7: {
    pre: (c) => c.co.insurancePriceRange >= 6,
    fire: (c) => {
      c.co.insurancePriceRange -= 5;
      c.co.insuranceCost = c.co.insurancePriceRange + c.r.fint(0, 1000);
      note(
        c,
        7,
        'Insurance Agent',
        'good',
        'insurance',
        `A Voyager's Insurance agent reviews your record and lowers your risk class. Next premium: ${fmt(c.co.insuranceCost)} kubars.`,
      );
    },
  },
  8: {
    pre: (c) => c.co.zinnRate >= 2,
    fire: (c) => {
      c.co.zinnRate -= 1;
      note(
        c,
        8,
        'Word From Mr. Zinn',
        'good',
        'zinn',
        `Mr. Zinn, feeling generous (it happens), cuts your interest rate to ${c.co.zinnRate}% per week.`,
      );
    },
  },
  9: {
    pre: (c) =>
      c.co.loanRate >= 4 ||
      (c.co.loanRate >= 2 && c.co.cash + c.co.bank - c.co.unionLoan - c.co.zinnLoan > 5_000_000),
    fire: (c) => {
      c.co.loanRate -= 1;
      note(
        c,
        9,
        "Trader's Union Notice",
        'good',
        'union',
        `The Trader's Union lowers your loan rate to ${c.co.loanRate}% per week.`,
      );
    },
  },
  10: {
    pre: (c) => c.co.savingsRate <= 2,
    fire: (c) => {
      c.co.savingsRate += 1;
      note(
        c,
        10,
        'Bank Notice',
        'good',
        'bank',
        `The bank raises the interest on your savings to ${c.co.savingsRate}% per week.`,
      );
    },
  },
  11: {
    fire: (c) =>
      c.ask(11, {
        title: 'Mr. Zinn Offers Money',
        text: 'Mr. Zinn beams aboard with a suitcase: 50,000 kubars in cash, added to your loan, and a 100,000 raise of your credit line with him. Take it?',
        choices: yn(),
        portrait: 'zinn',
        mood: 'good',
      }),
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      c.co.zinnLoan += 50000;
      c.co.zinnLimit += 100000;
      c.co.cash += 50000;
      c.report('good', "You took Mr. Zinn's 50,000 kubars. Your debt and his patience both grew.");
    },
  },
  12: {
    pre: (c) => c.co.zinnLoan > 0,
    fire: (c) => {
      c.co.zinnLimit += 50000;
      note(
        c,
        12,
        'Zinn Credit Notice',
        'good',
        'zinn',
        `Mr. Zinn raises your credit limit to ${fmt(c.co.zinnLimit)} kubars.`,
      );
    },
  },
  13: {
    pre: (c) => c.co.unionLoan > 0,
    fire: (c) => {
      c.co.unionLimit += 50000;
      note(
        c,
        13,
        "Trader's Union Credit",
        'good',
        'union',
        `The Trader's Union raises your credit limit to ${fmt(c.co.unionLimit)} kubars.`,
      );
    },
  },
  14: {
    fire: (c) => {
      const x = money(c, 25, 75);
      c.co.cash += x;
      note(
        c,
        14,
        'Money, Money, Money',
        'good',
        'bank',
        `A distant relative you never liked leaves you ${fmt(x)} kubars. You resolve to think of them more fondly.`,
      );
    },
  },
  15: {
    fire: (c) => {
      const x = money(c, 25, 75);
      c.co.cash += x;
      note(
        c,
        15,
        'Lottery!',
        'good',
        'pilot',
        `The ticket your pilot bought on a whim wins the Kukubian lottery: ${fmt(x)} kubars.`,
      );
    },
  },
  16: {
    fire: (c) => {
      c.co.warehouseSpace += 25;
      c.co.insurancePriceRange += 5;
      note(
        c,
        16,
        'Free Warehouse Space',
        'good',
        'warehouse',
        `The Trader's Union grants you 25 extra tons of warehouse space on every planet (now ${c.co.warehouseSpace} t).`,
      );
    },
  },
  17: {
    pre: (c) => cargoTons(c.co) > 0,
    fire: (c) =>
      c.ask(17, {
        title: 'Scooter Jay',
        text: 'Scooter Jay sidles up on the comm: he will take your entire cargo off your hands, no questions, for four times what you paid. It is almost certainly not legal. Deal?',
        choices: yn(),
        portrait: 'scooter',
        mood: 'good',
      }),
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const v = Math.floor(cargoValue(c.co));
      c.co.cash += 4 * v;
      clearCargo(c.co);
      if (c.r.fint(1, 5) === 1) {
        const fine = 7 * v;
        const suffix = c.pay(fine);
        backfire(c.co);
        c.report(
          'bad',
          `The Galaxy Police were watching. Fined ${fmt(fine)} kubars for trafficking.${suffix}`,
        );
      } else {
        c.report('good', `Scooter Jay paid ${fmt(4 * v)} kubars and vanished into the dark.`);
      }
    },
  },
  18: {
    pre: (c) => cargoTons(c.co) > 0,
    fire: (c) =>
      c.ask(18, {
        title: 'Hands',
        text: 'A racketeer known only as Hands offers to swap your whole cargo for a full hold of Exotic. He smiles with too many fingers. Swap?',
        choices: yn(),
        portrait: 'gurttle',
        mood: 'good',
      }),
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const v = Math.floor(cargoValue(c.co));
      if (c.r.fint(1, 5) === 1) {
        clearCargo(c.co);
        const suffix = c.pay(50000);
        backfire(c.co);
        c.report(
          'bad',
          `The swap was a sting. Your cargo is impounded and you are fined 50,000 kubars.${suffix}`,
        );
      } else {
        clearCargo(c.co);
        const cap = c.co.ship.cargo;
        c.co.cargo['exotic'] = { tons: cap, paid: Math.floor(v / cap) };
        c.report('good', `Hands delivered: ${cap} tons of Exotic now fill your hold.`);
      }
    },
  },
  19: {
    fire: (c) => {
      const x = money(c, 15, 35);
      c.ask(19, {
        title: 'Curtonian Plus',
        text: `A Curtonian investment cooperative wants ${fmt(x)} kubars for a "guaranteed" sixfold return. Guaranteed by whom is unclear. Invest?`,
        choices: yn(),
        portrait: 'curtonian',
        mood: 'good',
        data: { x },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = (c.data.x as number) ?? 0;
      const suffix = c.pay(x);
      if (c.r.fint(1, 4) === 1) {
        c.co.cash += 6 * x;
        c.report(
          'good',
          `Against all odds the Curtonians paid out: ${fmt(6 * x)} kubars.${suffix}`,
        );
      } else {
        c.report(
          'bad',
          `The Curtonian cooperative dissolved overnight. Your ${fmt(x)} kubars went with it.${suffix}`,
        );
      }
    },
  },
  20: {
    fire: (c) => {
      const x = money(c, 25, 75);
      c.ask(20, {
        title: 'Quist',
        text: `A dazzling salesbeing called Quist offers you an exclusive stake in a hyperspace bypass for ${fmt(x)} kubars. The brochure is beautiful. Invest?`,
        choices: yn(),
        portrait: 'quist',
        mood: 'good',
        data: { x },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = (c.data.x as number) ?? 0;
      const suffix = c.pay(x);
      c.report(
        'bad',
        `There is no bypass. There is no Quist. There is no ${fmt(x)} kubars.${suffix}`,
      );
    },
  },
  21: {
    fire: (c) => {
      const x = money(c, 15, 35);
      c.ask(21, {
        title: 'The Wobbler',
        text: `The performance artist known as The Wobbler needs ${fmt(x)} kubars to finish a piece guaranteed to triple your money. Art is risk. Fund it?`,
        choices: yn(),
        portrait: 'wobbler',
        mood: 'good',
        data: { x },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = (c.data.x as number) ?? 0;
      const suffix = c.pay(x);
      if (c.r.fint(1, 3) === 1) {
        backfire(c.co);
        c.report(
          'bad',
          `The Wobbler's piece flopped. Critics laughed; your ${fmt(x)} kubars are gone.${suffix}`,
        );
      } else {
        c.co.cash += 3 * x;
        c.report('good', `The Wobbler is a sensation! Your share: ${fmt(3 * x)} kubars.${suffix}`);
      }
    },
  },
  22: {
    fire: (c) => {
      const x = money(c, 10, 50);
      c.ask(22, {
        title: 'Brow, Industrial Spy',
        text: `Brow the industrial spy offers to sabotage every rival company — for ${fmt(x)} kubars. Strictly off the books. Hire him?`,
        choices: yn(),
        portrait: 'sabotage',
        mood: 'good',
        data: { x },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = (c.data.x as number) ?? 0;
      const suffix = c.pay(x);
      if (c.r.fint(1, 5) === 1) {
        const fine = 4 * x;
        const s2 = c.pay(fine);
        backfire(c.co);
        c.report(
          'bad',
          `Brow was caught with your business card. Fined ${fmt(fine)} kubars.${suffix}${s2}`,
        );
      } else {
        runSabotage(c.state, c.ci, x, c.r);
        c.report(
          'good',
          `Brow got through. Every rival company suffered mysterious, expensive accidents.${suffix}`,
        );
      }
    },
  },
  23: {
    fire: (c) => {
      const x = money(c, 1, 35);
      c.ask(23, {
        title: 'Yoyo',
        text: `A grinning drifter called Yoyo bets you ${fmt(x)} kubars on a coin flip. His coin. Take the bet?`,
        choices: yn(),
        portrait: 'yoyo',
        mood: 'good',
        data: { x },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = (c.data.x as number) ?? 0;
      const lost = Math.floor(x / 2);
      const suffix = c.pay(lost);
      c.report(
        'bad',
        `Heads. It is always heads. You pay ${fmt(lost)} kubars and Yoyo pockets his coin.${suffix}`,
      );
    },
  },
  24: {
    pre: (c) => cargoTons(c.co) > 0,
    fire: (c) =>
      c.ask(24, {
        title: 'Limpus Charity',
        text: 'The Limpus Relief Fleet is collecting for flood victims. They would take your entire cargo. Karma, they note, is real. Donate everything?',
        choices: yn(),
        portrait: 'limpus',
        mood: 'good',
      }),
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const tons = clearCargo(c.co);
      c.co.eventGood = 85;
      c.co.eventLastGood = true;
      c.report('good', `You donated ${tons} tons to the Limpus fund. The universe took note.`);
    },
  },
  25: {
    pre: (c) => c.co.ship.kuarps >= 5,
    fire: (c) =>
      c.ask(25, {
        title: 'Sleg Engine Trade',
        text: 'Sleg, a collector of fine engines, offers 150,000 kubars for three kuarps of yours. Your ship would crawl, but richly. Trade?',
        choices: yn(),
        portrait: 'sleg',
        mood: 'good',
      }),
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      c.co.cash += 150000;
      c.co.ship.kuarps -= 3;
      c.report('good', `Sleg paid 150,000 kubars. Engine speed is now ${c.co.ship.kuarps} kuarps.`);
    },
  },
  26: {
    fire: (c) =>
      note(
        c,
        26,
        'Royal Visitor',
        'good',
        'dred',
        'A minor royal cousin of Emperor Dred hitches a ride, waves at everything, signs the guest book and leaves. The crew is oddly delighted.',
      ),
  },
  27: {
    fire: (c) => {
      const x = money(c, 25, 75);
      c.co.cash += x;
      note(
        c,
        27,
        'Iso the Monk',
        'good',
        'quaso',
        `Iso, a wandering monk, thanks you for an ancient kindness you do not remember and presses ${fmt(x)} kubars into your hands.`,
      );
    },
  },
  28: {
    pre: (c) => {
      const s = raffetySlot(c);
      if (s < 0) return false;
      const lot = c.co.shares[s]!;
      return c.state.planets[s]!.exchange.price * 1.15 >= lot.paid;
    },
    fire: (c) => {
      const s = raffetySlot(c);
      const lot = c.co.shares[s]!;
      const price = c.state.planets[s]!.exchange.price;
      const payout = Math.floor(lot.tons * price * 1.15);
      c.co.cash += payout;
      delete c.co.shares[s];
      note(
        c,
        28,
        'R.J. Raffety',
        'good',
        'broker',
        `Financier R.J. Raffety buys your entire ${PLANET_BY_ID[c.state.planets[s]!.id].name} holding at 15% over market: ${fmt(payout)} kubars.`,
      );
    },
  },
  29: {
    pre: (c) => {
      const price = Math.floor(0.8 * c.state.planets[c.co.planet]!.exchange.price);
      return price > 0 && c.co.cash + c.co.bank > 2 * price;
    },
    fire: (c) => {
      const pi = c.co.planet;
      const price = Math.floor(0.8 * c.state.planets[pi]!.exchange.price);
      const budget = Math.min(0.25 * (c.co.cash + c.co.bank), 2_000_000);
      const n = Math.floor(budget / price);
      c.ask(29, {
        title: 'Nebbit',
        text: `Nebbit, a broker of flexible ethics, offers ${n} shares of the ${PLANET_BY_ID[c.state.planets[pi]!.id].name} exchange at 20% below market (${fmt(price)} each, ${fmt(n * price)} total). Buy?`,
        choices: yn(),
        portrait: 'broker',
        mood: 'good',
        data: { pi, price, n },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const pi = c.data.pi as number;
      const price = c.data.price as number;
      const n = c.data.n as number;
      const suffix = c.pay(n * price);
      const lot = c.co.shares[pi];
      if (!lot) c.co.shares[pi] = { tons: n, paid: price };
      else {
        lot.paid = Math.floor((lot.paid * lot.tons + price * n) / (lot.tons + n));
        lot.tons += n;
      }
      c.report('good', `Nebbit delivered ${n} shares. Best not to ask where from.${suffix}`);
    },
  },
  30: {
    pre: (c) => c.co.ship.seats > c.co.passengers,
    fire: (c) => {
      const k = c.co.ship.seats - c.co.passengers;
      c.co.cash += 5000 * k;
      c.co.passengers = c.co.ship.seats;
      note(
        c,
        30,
        'Tatilus',
        'good',
        'tatilus',
        `Tatilus, a tour operator in a hurry, pays 5,000 kubars per empty seat (${k} seats: ${fmt(5000 * k)} kubars) to fill your cabin with sightseers.`,
      );
    },
  },
  31: {
    pre: (c) => c.co.ship.fuel > 1,
    fire: (c) => {
      const paid = Math.floor((c.co.ship.fuel * 3500) / 2);
      c.co.cash += paid;
      c.co.ship.fuel = Math.floor(c.co.ship.fuel / 2);
      note(
        c,
        31,
        'Gurttle',
        'good',
        'gurttle',
        `Gurttle, stranded and desperate, buys half your fuel at 3,500 kubars a ton: ${fmt(paid)} kubars.`,
      );
    },
  },
  32: {
    pre: (c) => cargoTons(c.co) > 0,
    fire: (c) => {
      const v = Math.floor(cargoValue(c.co));
      c.co.cash += 3 * v;
      clearCargo(c.co);
      note(
        c,
        32,
        'Lord 104',
        'good',
        'lord104',
        `Lord 104, a robot aristocrat with no concept of haggling, buys your entire cargo for triple what you paid: ${fmt(3 * v)} kubars.`,
      );
    },
  },
  33: {
    pre: (c) => cargoTons(c.co) < c.co.ship.cargo && !(c.co.cargo['exotic']?.tons ?? 0),
    fire: (c) => {
      const f = c.co.ship.cargo - cargoTons(c.co);
      c.ask(33, {
        title: 'Nectum',
        text: `Nectum the freighter captain, overloaded and overdue, offers ${f} tons of Exotic at 100 kubars a ton (${fmt(100 * f)} kubars). Take it?`,
        choices: yn(),
        portrait: 'nectum',
        mood: 'good',
        data: { f },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const f = c.data.f as number;
      const suffix = c.pay(100 * f);
      c.co.cargo['exotic'] = { tons: f, paid: 100 };
      c.report('good', `${f} tons of Exotic aboard at 100 kubars a ton.${suffix}`);
    },
  },
  34: {
    pre: (c) => cargoTons(c.co) > 0,
    trigger: (c) => {
      if (c.r.fint(1, 40) !== 1) return false;
      // inner precondition: the rolled commodity must not be on board
      const cat = c.r.fint(0, 2);
      const item = c.r.fint(0, 5);
      const id = COMMODITIES[cat * 6 + item]!.id;
      if ((c.co.cargo[id]?.tons ?? 0) > 0) return false;
      c.tc.squowk = id;
      return true;
    },
    fire: (c) => {
      const id = c.tc.squowk!;
      const v = Math.floor(cargoValue(c.co));
      const cap = c.co.ship.cargo;
      clearCargo(c.co);
      c.co.cargo[id] = { tons: cap, paid: Math.floor(v / cap) };
      const name = COMMODITIES.find((x) => x.id === id)!.name;
      note(
        c,
        34,
        'Squowk',
        'good',
        'squowk',
        `Squowk, an eccentric trader, swaps your entire cargo for a full hold of ${name} (${cap} tons). You are not sure who won.`,
      );
    },
  },
  35: {
    pre: (c) => cargoTons(c.co) > 0,
    fire: (c) => {
      const v = Math.floor(cargoValue(c.co));
      c.co.cash += 2 * v;
      clearCargo(c.co);
      note(
        c,
        35,
        'Captain Leahy',
        'good',
        'leahy',
        `Captain Leahy, provisioning a colony fleet, buys your whole cargo at double cost: ${fmt(2 * v)} kubars.`,
      );
    },
  },
  36: {
    fire: (c) =>
      note(
        c,
        36,
        'Mulls',
        'neutral',
        'mulls',
        'Mulls, a retired trader with opinions, corners you on the comm for an hour of advice. Buy low, he says. Sell high. You thank him.',
      ),
  },
  37: {
    fire: (c) => {
      const x = c.co.random * c.state.newsData * 6;
      const kind = c.co.random % 4;
      const what =
        kind === 1
          ? 'an engine tune (+1 kuarp)'
          : kind === 2
            ? 'a cargo-bay refit (+10 tons)'
            : kind === 3
              ? 'an extra cabin (+1 seat)'
              : 'a bigger fuel tank (+5 tons)';
      c.ask(37, {
        title: 'Teeter',
        text: `Teeter, a freelance shipwright of erratic genius, offers ${what} for ${fmt(x)} kubars. Deal?`,
        choices: yn(),
        portrait: 'mechanic',
        mood: 'good',
        data: { x, kind },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = c.data.x as number;
      const kind = c.data.kind as number;
      const suffix = c.pay(x);
      if (kind === 1) c.co.ship.kuarps += 1;
      else if (kind === 2) c.co.ship.cargo += 10;
      else if (kind === 3) c.co.ship.seats += 1;
      else c.co.ship.fuelCap += 5;
      c.report('good', `Teeter's work holds. Probably.${suffix}`);
    },
  },
  38: {
    pre: (c) => c.co.ship.crew > 2,
    fire: (c) => {
      const x = c.r.fint(5, 25) * 1000;
      c.ask(38, {
        title: 'Meeg Automation',
        text: `Meeg Cybernetics offers to automate one crew station for ${fmt(x)} kubars — one less salary to pay, forever. Install it?`,
        choices: yn(),
        portrait: 'meeg',
        mood: 'good',
        data: { x },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = c.data.x as number;
      if (c.r.fint(1, 2) === 1) {
        const suffix = c.pay(2 * x);
        c.co.travelDelayed += 1;
        backfire(c.co);
        c.report(
          'bad',
          `The Meeg unit crashed into the galley. Repairs cost ${fmt(2 * x)} kubars and you lost time.${suffix}`,
        );
      } else {
        const suffix = c.pay(x);
        c.co.ship.crew -= 1;
        c.report('good', `The Meeg unit hums quietly. Crew is now ${c.co.ship.crew}.${suffix}`);
      }
    },
  },
  39: {
    fire: (c) => {
      const x = money(c, 15, 50);
      c.ask(39, {
        title: 'Spike the Space Mutt',
        text: 'A stray space mutt is scratching at the airlock, all eyes and hope. The crew has already named him Spike. Take him in?',
        choices: yn(),
        portrait: 'spike',
        mood: 'good',
        data: { x },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = c.data.x as number;
      const suffix = c.pay(x);
      c.co.travelDelayed += 1;
      backfire(c.co);
      c.report(
        'bad',
        `Spike ate the navigation console. Repairs: ${fmt(x)} kubars, not covered by insurance, plus lost time. The crew still loves him.${suffix}`,
      );
    },
  },
  40: {
    pre: (c) => c.co.crewSalary >= 1500,
    fire: (c) => {
      const x = money(c, 15, 50);
      c.ask(40, {
        title: 'Nibble',
        text: `Nibble, Mr. Zinn's very large associate, offers to "renegotiate" your crew's salary downward for ${fmt(x)} kubars. Hire him?`,
        choices: yn(),
        portrait: 'zinn',
        mood: 'good',
        data: { x },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = c.data.x as number;
      const suffix = c.pay(x);
      if (c.r.fint(1, 5) === 1) {
        const owed = c.co.wagesOwed;
        c.pay(owed);
        c.co.wagesOwed = 0;
        c.co.crewSalary += 100;
        backfire(c.co);
        c.report(
          'bad',
          `The crew found out and struck on the spot. You paid all wages owed and salaries ROSE to ${fmt(c.co.crewSalary)}.${suffix}`,
        );
      } else {
        c.co.crewSalary -= 100;
        c.report(
          'good',
          `Nibble was very persuasive. Crew salary is now ${fmt(c.co.crewSalary)} per person.${suffix}`,
        );
      }
    },
  },
  41: {
    fire: (c) => {
      const x = money(c, 25, 125);
      c.co.cash += x;
      if (c.r.fint(1, 4) === 1) {
        const fine = 2 * x;
        const suffix = c.pay(fine);
        c.co.travelDelayed += 1;
        backfire(c.co);
        note(
          c,
          41,
          'Speevak',
          'bad',
          'police',
          `Speevak paid you ${fmt(x)} kubars to dump his "surplus" in deep space — and the Rangers caught you at it. Fined ${fmt(fine)} kubars and detained.${suffix}`,
        );
      } else {
        note(
          c,
          41,
          'Speevak',
          'good',
          'police',
          `Speevak paid you ${fmt(x)} kubars to quietly dispose of some barrels. You did not look inside.`,
        );
      }
    },
  },
  42: {
    fire: (c) => {
      const x = money(c, 20, 70);
      c.ask(42, {
        title: 'Hapa Jillo',
        text: `Hapa Jillo, saboteur to the discreet, will arrange misfortune for every rival company — ${fmt(x)} kubars, cash. Interested?`,
        choices: yn(),
        portrait: 'hapajillo',
        mood: 'good',
        data: { x },
      });
    },
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = c.data.x as number;
      const suffix = c.pay(x);
      if (c.r.fint(1, 5) === 1) {
        const fine = 4 * x;
        const s2 = c.pay(fine);
        c.co.travelDelayed += 1;
        backfire(c.co);
        c.report(
          'bad',
          `Hapa Jillo sang the moment the police leaned on her. Fined ${fmt(fine)} kubars and held for questioning.${suffix}${s2}`,
        );
      } else {
        runSabotage(c.state, c.ci, x, c.r);
        c.report(
          'good',
          `Rival ships across Kukubia developed sudden, costly problems. Hapa Jillo sends her regards.${suffix}`,
        );
      }
    },
  },
  43: {
    fire: (c) => {
      c.co.travelDelayed /= 2;
      c.tc.block4447 = true;
      note(
        c,
        43,
        'Travel Time Shortened',
        'good',
        'pilot',
        'Your pilot finds a fast current in the solar wind and rides it. You will arrive well ahead of schedule.',
      );
    },
  },
  44: {
    fire: (c) =>
      c.ask(44, {
        title: 'Snoz Lombardo',
        text: `Snoz Lombardo, impresario at large, offers a fat fee to divert your ship — he has a show to catch and money to burn. Take him aboard?`,
        choices: yn(),
        portrait: 'snoz',
        mood: 'good',
      }),
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = money(c, 25, 125);
      c.co.cash += x;
      const d = c.reroute();
      c.state.destination = d;
      c.report(
        'good',
        `Snoz paid ${fmt(x)} kubars. New destination: ${PLANET_BY_ID[c.state.planets[d]!.id].name}.`,
      );
    },
  },
  45: {
    fire: (c) =>
      c.ask(45, {
        title: 'Lady Shimmer',
        text: 'Lady Shimmer, radiant and stranded, asks for passage to another planet. She hints, glitteringly, at gratitude. Take her?',
        choices: yn(),
        portrait: 'shimmer',
        mood: 'good',
      }),
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const d = c.reroute();
      c.state.destination = d;
      if (c.r.fint(1, 4) === 1) {
        const x = money(c, 100, 150);
        c.co.cash += x;
        c.report(
          'good',
          `Lady Shimmer's gratitude turned out to be ${fmt(x)} kubars. New destination: ${PLANET_BY_ID[c.state.planets[d]!.id].name}.`,
        );
      } else {
        c.report(
          'info',
          `Lady Shimmer thanked you warmly and paid nothing. New destination: ${PLANET_BY_ID[c.state.planets[d]!.id].name}.`,
        );
      }
    },
  },
  46: {
    fire: (c) =>
      c.ask(46, {
        title: 'Teal Tree',
        text: 'Teal Tree, a botanist with a deadline, offers a handsome fee for a detour to another planet. Accept?',
        choices: yn(),
        portrait: 'tealtree',
        mood: 'good',
      }),
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const d = c.reroute();
      c.state.destination = d;
      const x = money(c, 25, 125);
      c.co.cash += x;
      c.report(
        'good',
        `Teal Tree paid ${fmt(x)} kubars. New destination: ${PLANET_BY_ID[c.state.planets[d]!.id].name}.`,
      );
    },
  },
  47: {
    fire: (c) =>
      c.ask(47, {
        title: 'Stubbs',
        text: 'Stubbs, a water merchant with a leaking hold, pays cash on the spot for your surplus water reserves. Sell?',
        choices: yn(),
        portrait: 'warehouse',
        mood: 'good',
      }),
    resolve: (c, choice) => {
      if (choice !== 'yes') return;
      const x = money(c, 25, 75);
      c.co.cash += x;
      if (c.r.fint(1, 4) === 1) {
        const d = c.reroute();
        c.state.destination = d;
        c.co.travelDelayed += 1;
        backfire(c.co);
        c.report(
          'bad',
          `Stubbs paid ${fmt(x)} kubars — then his tug drifted into your bow. You limp, delayed, to ${PLANET_BY_ID[c.state.planets[d]!.id].name}.`,
        );
      } else {
        c.report('good', `Stubbs paid ${fmt(x)} kubars and sloshed away happy.`);
      }
    },
  },
};

function raffetySlot(c: EventCtx): number {
  let s = -1;
  for (const [pi, lot] of Object.entries(c.co.shares)) {
    if (lot.tons > 0) s = Math.max(s, Number(pi));
  }
  return s;
}

const BAD: Record<number, TravelEventDef> = {
  [-2]: {
    fire: (c) => {
      const x = money(c, 15, 50);
      c.ask(-2, {
        title: "The Emperor's Donation Drive",
        text: `An Imperial cruiser matches your course. Emperor Dred is collecting "voluntary" donations of ${fmt(x)} kubars for the palace east wing. Donate?`,
        choices: yn('Donate', 'Refuse'),
        portrait: 'dred',
        mood: 'bad',
        data: { x },
      });
    },
    resolve: (c, choice) => {
      const x = c.data.x as number;
      if (choice === 'yes') {
        const suffix = c.pay(x);
        c.report(
          'bad',
          `You donated ${fmt(x)} kubars. The Emperor's gratitude is noted, briefly.${suffix}`,
        );
      } else {
        c.co.taxOwedPassenger += x;
        c.report(
          'bad',
          `The Emperor's clerks smile thinly and add ${fmt(x)} kubars to your tax bill.`,
        );
      }
    },
  },
  [-3]: {
    fire: (c) => {
      const w = c.r.fint(0, 6);
      const name = PLANET_BY_ID[c.state.planets[w]!.id].name;
      if (warehouseTons(c.co, w) === 0) {
        note(
          c,
          -3,
          'Warehouse Fire',
          'neutral',
          'fire',
          `Word arrives of a fire in the warehouse district on ${name}. Your unit there was empty. Lucky.`,
        );
      } else if (c.co.insured) {
        note(
          c,
          -3,
          'Warehouse Fire',
          'neutral',
          'fire',
          `Fire swept the warehouse district on ${name} — but Voyager's Insurance covered your goods in full.`,
        );
      } else {
        c.co.warehouse[w] = {};
        note(
          c,
          -3,
          'Warehouse Fire',
          'bad',
          'fire',
          `Fire gutted the warehouses on ${name}. Everything you stored there is ash. You were not insured.`,
        );
      }
    },
  },
  [-4]: {
    trigger: (c) => c.r.fint(1, 8) === 1,
    fire: (c) => {
      c.co.insurancePriceRange += 5;
      c.co.insuranceCost = c.co.insurancePriceRange * 1000 - c.r.fint(0, 1000);
      note(
        c,
        -4,
        'Insurance Rate Increase',
        'bad',
        'insurance',
        `Voyager's Insurance re-rates your ship upward. Next premium: ${fmt(c.co.insuranceCost)} kubars.`,
      );
    },
  },
  [-5]: {
    pre: (c) => c.co.zinnLoan > 0,
    fire: (c) => {
      c.co.zinnRate += 1;
      note(
        c,
        -5,
        'Word From Mr. Zinn',
        'bad',
        'zinn',
        `Mr. Zinn has reviewed your account and raised your rate to ${c.co.zinnRate}% per week. He wishes you continued success.`,
      );
    },
  },
  [-6]: {
    pre: (c) => c.co.unionLoan > 0,
    fire: (c) => {
      c.co.loanRate += 1;
      note(
        c,
        -6,
        "Trader's Union Notice",
        'bad',
        'union',
        `The Trader's Union raises your loan rate to ${c.co.loanRate}% per week. Insurance does not cover paperwork.`,
      );
    },
  },
  [-7]: {
    fire: (c) => {
      if (c.co.insured) {
        note(
          c,
          -7,
          'Lawsuit!',
          'neutral',
          'magistrate',
          "A passenger sues over a spilled drink and a ruined hat. Voyager's Insurance handles the whole sordid business.",
        );
      } else {
        const x = money(c, 25, 75);
        const suffix = c.pay(x);
        note(
          c,
          -7,
          'Lawsuit!',
          'bad',
          'magistrate',
          `A passenger's lawyer proves, somehow, that your ship ruined their client's life. Damages: ${fmt(x)} kubars.${suffix}`,
        );
      }
    },
  },
  [-8]: {
    fire: (c) =>
      c.ask(-8, {
        title: 'A Demanding Union',
        text: 'The Interstellar Crew Union demands a 100-kubar raise for every crew member, effective immediately. Refusing has been known to have consequences. Agree?',
        choices: yn('Agree', 'Refuse'),
        portrait: 'crew',
        mood: 'bad',
      }),
    resolve: (c, choice) => {
      if (choice === 'yes') {
        c.co.crewSalary += 100;
        c.report('bad', `Crew salary is now ${fmt(c.co.crewSalary)} per person per week.`);
      } else if (c.r.fint(1, 5) === 1) {
        const owed = c.co.wagesOwed;
        const suffix = c.pay(owed);
        c.co.wagesOwed = 0;
        c.co.crewSalary += 500;
        c.report(
          'bad',
          `The crew walked out on the spot. You paid ${fmt(owed)} kubars owed and salaries jumped 500.${suffix}`,
        );
      } else {
        c.report('info', 'You refused. The union grumbles and, for now, backs down.');
      }
    },
  },
  [-9]: {
    pre: (c) => c.co.zinnLoan > 10000 && c.co.zinnLoan / 2 < c.co.unionLimit - c.co.unionLoan,
    fire: (c) => {
      const x = Math.floor(c.co.zinnLoan / 2);
      const suffix = c.pay(x);
      c.co.zinnLoan -= x;
      note(
        c,
        -9,
        'Mr. Zinn Wants His Money',
        'bad',
        'zinn',
        `Mr. Zinn's associates board politely and collect half your outstanding loan: ${fmt(x)} kubars.${suffix}`,
      );
    },
  },
  [-10]: {
    trigger: (c) => {
      const g = c.state;
      const newsHit =
        (g.news <= 10 || (g.news >= 39 && g.news <= 48)) &&
        (g.newsPlanet === c.state.destination || g.newsPlanet === c.co.planet);
      return c.r.fint(1, 10) === 1 || newsHit;
    },
    fire: (c) => {
      const g = c.state;
      let s: number;
      if (g.news >= 39 && g.news <= 48) s = g.news - 38;
      else if (g.news <= 10) s = g.news;
      else s = c.r.fint(1, 10);
      const { name, takesCargo, takesCash } = HOSTILES[s - 1]!;
      c.co.travelDelayed += 1;
      c.tc.delays++;
      if (c.co.insured) {
        note(
          c,
          -10,
          'Hostile Encounter',
          'neutral',
          'pirates',
          `Your ship is boarded by ${name} — but your Voyager's Insurance escort clause pays them off. You lose only time.`,
        );
        return;
      }
      const parts: string[] = [];
      if (takesCargo && cargoTons(c.co) > 0) {
        const tons = clearCargo(c.co);
        parts.push(`they emptied your hold (${tons} tons)`);
      }
      if (takesCash) {
        const x = c.r.fint(10 * c.T, 50 * c.T);
        const suffix = c.pay(x);
        parts.push(`they extorted ${fmt(x)} kubars${suffix}`);
      }
      note(
        c,
        -10,
        'Hostile Encounter',
        parts.length ? 'bad' : 'neutral',
        'pirates',
        parts.length
          ? `Your ship was stopped by ${name}: ${parts.join('; ')}. You limp on, delayed.`
          : `${name} boarded, found nothing worth taking, and left you drifting behind schedule.`,
      );
    },
  },
  [-11]: {
    trigger: (c) => {
      const g = c.state;
      return (
        (g.weather <= 10 || (g.weather >= 61 && g.weather <= 70)) &&
        (g.weatherPlanet === c.state.destination || g.weatherPlanet === c.co.planet)
      );
    },
    fire: (c) => {
      const g = c.state;
      const s = g.weather <= 10 ? g.weather : g.weather - 60;
      const name = WEATHER_HAZARDS[s - 1]!;
      c.co.travelDelayed += 1;
      c.tc.delays++;
      if (c.co.insured) {
        note(
          c,
          -11,
          'Weather Hazard',
          'neutral',
          'weather',
          `Your ship flew straight into ${name}. Voyager's Insurance pays for the repairs; you lose only time.`,
        );
      } else {
        const x = c.r.fint(10 * c.T, 50 * c.T);
        const suffix = c.pay(x);
        note(
          c,
          -11,
          'Weather Hazard',
          'bad',
          'weather',
          `Your ship flew straight into ${name}. Repairs cost ${fmt(x)} kubars, and you are running late.${suffix}`,
        );
      }
    },
  },
  [-12]: {
    pre: (c) => !c.tc.badExclusiveDone && lastLot(c.co) !== null,
    fire: (c) => {
      c.tc.badExclusiveDone = true;
      const id = lastLot(c.co)!;
      const lot = c.co.cargo[id]!;
      const name = COMMODITIES.find((x) => x.id === id)!.name;
      if (c.co.insured) {
        note(
          c,
          -12,
          'Rotten Cargo',
          'neutral',
          'insurance',
          `Half your ${name} turned out to be spoiled — but Voyager's Insurance makes you whole.`,
        );
      } else {
        const n = Math.floor(lot.tons / 2 + 0.5);
        lot.tons -= n;
        if (lot.tons <= 0) delete c.co.cargo[id];
        note(
          c,
          -12,
          'Rotten Cargo',
          'bad',
          'insurance',
          `${n} tons of your ${name} arrived rotten, defective or otherwise unsellable. Overboard it goes.`,
        );
      }
    },
  },
  [-13]: {
    pre: (c) => !c.tc.badExclusiveDone,
    fire: (c) => {
      c.tc.badExclusiveDone = true;
      c.co.travelDelayed += 1;
      c.tc.delays++;
      if (c.co.insured) {
        note(
          c,
          -13,
          'Ship Breaks Down',
          'neutral',
          'repair',
          "The main drive coughed and died between planets. Voyager's Insurance covers the tow and repairs; you lose only time.",
        );
      } else {
        const x = money(c, 25, 75);
        const suffix = c.pay(x);
        note(
          c,
          -13,
          'Ship Breaks Down',
          'bad',
          'repair',
          `The main drive coughed and died between planets. Emergency repairs: ${fmt(x)} kubars, plus lost time.${suffix}`,
        );
      }
    },
  },
  [-14]: {
    pre: (c) => !c.tc.badExclusiveDone && c.co.ship.fuel > 1,
    fire: (c) => {
      c.tc.badExclusiveDone = true;
      c.co.travelDelayed += 1;
      c.tc.delays++;
      if (c.co.insured) {
        note(
          c,
          -14,
          'Fuel Tank Trouble',
          'neutral',
          'repair',
          "A seal failed on the main tank. Voyager's Insurance replaces the lost fuel; you lose only time.",
        );
      } else {
        c.co.ship.fuel = Math.floor(c.co.ship.fuel / 2);
        note(
          c,
          -14,
          'Fuel Tank Trouble',
          'bad',
          'repair',
          `A seal failed on the main tank: half your Ionic Fuel boiled off into space (${c.co.ship.fuel} tons left).`,
        );
      }
    },
  },
  [-15]: {
    pre: (c) => !c.tc.badExclusiveDone,
    fire: (c) => {
      c.tc.badExclusiveDone = true;
      c.co.travelDelayed += 1;
      c.tc.delays++;
      if (c.co.insured) {
        note(
          c,
          -15,
          'Asteroid Strikes',
          'neutral',
          'meteor',
          "An asteroid clipped your hull. Voyager's Insurance covers the damage; you lose only time.",
        );
      } else {
        const x = money(c, 25, 75);
        const suffix = c.pay(x);
        note(
          c,
          -15,
          'Asteroid Strikes',
          'bad',
          'meteor',
          `An asteroid clipped your hull. Patching it cost ${fmt(x)} kubars, plus lost time.${suffix}`,
        );
      }
    },
  },
  [-16]: {
    pre: (c) => !c.tc.badExclusiveDone && cargoTons(c.co) > 0,
    fire: (c) => {
      c.tc.badExclusiveDone = true;
      c.co.travelDelayed += 1;
      c.tc.delays++;
      if (c.co.insured) {
        note(
          c,
          -16,
          'Cargo Disaster',
          'neutral',
          'insurance',
          "The cargo bay depressurised mid-flight. Voyager's Insurance covers every last ton; you lose only time.",
        );
      } else {
        const tons = clearCargo(c.co);
        note(
          c,
          -16,
          'Cargo Disaster',
          'bad',
          'insurance',
          `The cargo bay depressurised mid-flight. All ${tons} tons of cargo are now a very expensive debris field.`,
        );
      }
    },
  },
  [-17]: {
    pre: (c) => !c.tc.badExclusiveDone,
    fire: (c) => {
      c.tc.badExclusiveDone = true;
      const d = c.reroute();
      c.state.destination = d;
      c.co.advertP = 0;
      computePassengers(c.co, c.r);
      note(
        c,
        -17,
        'Wrong Destination',
        'bad',
        'pilot',
        `Your pilot, navigating from memory, has been flying to the wrong planet all along. You will arrive at ${PLANET_BY_ID[c.state.planets[d]!.id].name} instead — and your advertising ran on the wrong world.`,
      );
    },
  },
  [-18]: {
    pre: (c) => !c.tc.badExclusiveDone,
    fire: (c) => {
      c.tc.badExclusiveDone = true;
      c.co.travelDelayed *= 2;
      note(
        c,
        -18,
        'Lost Time',
        'bad',
        'pilot',
        'A wrong turn at a featureless nebula doubles your travel time. The crew pretends not to notice.',
      );
    },
  },
  [-19]: {
    trigger: (c) => c.tc.delays >= 1,
    fire: (c) =>
      note(
        c,
        -19,
        'Travel Delayed',
        'bad',
        'pilot',
        c.tc.delays > 1
          ? 'Between one mishap and the next, your ship is now badly behind schedule. Rivals may reach the markets first.'
          : 'The delay puts you behind schedule. Rivals may reach the markets first.',
      ),
  },
};

/* --------------------------------------------------------------- dialog utils */

const yn = (yes = 'Yes', no = 'No') => [
  { id: 'yes', label: yes },
  { id: 'no', label: no },
];

/** OK-only dialog whose effect has already been applied. */
function note(
  c: EventCtx,
  id: number,
  title: string,
  mood: 'good' | 'bad' | 'neutral',
  portrait: string | undefined,
  text: string,
): void {
  c.report(mood === 'bad' ? 'bad' : mood === 'good' ? 'good' : 'info', text);
  c.ask(id, { title, text, choices: [], portrait, mood });
}

/* ---------------------------------------------------------------- the chain */

const GOOD_IDS = Array.from({ length: 46 }, (_, i) => i + 2); // 2..47
const BAD_IDS = Array.from({ length: 18 }, (_, i) => -(i + 2)); // -2..-19

function defaultTrigger(id: number, r: Rng): boolean {
  if (id >= 2 && id <= 5) return r.fint(1, 10) === 1;
  if (id > 0) return r.fint(1, 40) === 1;
  return r.fint(1, 35) === 1;
}

/**
 * Start the trip's event roll. Returns true if a dialog is pending.
 * Call only when week > 3.
 */
export function beginEventRoll(state: GameState, co: CompanyState, ci: number, r: Rng): boolean {
  const tc = state.travel!;
  const d0 = r.fint(0, 6);
  if (r.fint(1, 40) === 1 && d0 !== state.destination) {
    // Quaso Mutta detour offer decides the chain's polarity
    state.pending = {
      id: 'ev:quaso',
      title: 'The Quaso Mutta',
      text: `A Quaso Mutta of Mira drifts across your bow, vibrating urgently. Your pilot swears it wants you to turn for ${PLANET_BY_ID[state.planets[d0]!.id].name}. Ignoring a Quaso is said to be… unlucky. Follow it?`,
      choices: yn('Follow it', 'Ignore it'),
      portrait: 'quaso',
      mood: 'neutral',
      context: 'travel',
      data: { d0 },
    };
    state.phase = 'event';
    return true;
  }
  tc.good = r.fint(1, 100) <= co.eventGood;
  tc.cursor = 0;
  return walkTravelEvents(state, co, ci, r);
}

/** Walk the chain from the cursor. Returns true if paused on a pending dialog. */
export function walkTravelEvents(state: GameState, co: CompanyState, ci: number, r: Rng): boolean {
  const tc = state.travel!;
  const ids = tc.good ? GOOD_IDS : BAD_IDS;
  const defs = tc.good ? GOOD : BAD;
  const ctx = makeCtx(state, co, ci, r);
  while (tc.cursor < ids.length) {
    const id = ids[tc.cursor]!;
    tc.cursor++;
    if (tc.good && tc.block4447 && id >= 44 && id <= 47) continue;
    const def = defs[id];
    if (!def) continue;
    if (def.pre && !def.pre(ctx)) continue;
    const fires = def.trigger ? def.trigger(ctx) : defaultTrigger(id, r);
    if (!fires) continue;
    tc.fired = true;
    def.fire(ctx);
    if (state.pending) return true;
  }
  return false;
}

/** Apply the streak rule at the end of a chain. */
export function endChainStreak(state: GameState, co: CompanyState): void {
  const tc = state.travel;
  if (!tc || !tc.fired) return;
  if (tc.good) goodChainStreak(co);
  else badChainStreak(co);
}

export function goodChainStreak(co: CompanyState): void {
  if (!co.eventLastGood) {
    co.eventGood = 50;
    co.eventLastGood = true;
  } else {
    co.eventGood = Math.min(85, co.eventGood + 5);
  }
}

/** Also applied by crew strikes, running out of fuel and tax audits. */
export function badChainStreak(co: CompanyState): void {
  if (co.eventLastGood) {
    co.eventGood = 50;
    co.eventLastGood = false;
  } else {
    co.eventGood = Math.max(15, co.eventGood - 5);
  }
}

/** Per-trip level floor. */
export function applyEventGoodFloor(state: GameState, co: CompanyState): void {
  const floor = LEVEL_BY_ID(state.settings.level).eventGoodFloor;
  if (floor > 0) co.eventGood = Math.max(co.eventGood, floor);
}

/** Resolve a choice for the pending TRAVEL event. Returns true if paused again. */
export function resolveTravelEvent(
  state: GameState,
  co: CompanyState,
  ci: number,
  id: string,
  choice: string,
  data: Record<string, unknown>,
  r: Rng,
): boolean {
  const tc = state.travel!;
  const ctx = makeCtx(state, co, ci, r, data);
  if (id === 'ev:quaso') {
    const d0 = data.d0 as number;
    if (choice === 'yes') {
      co.eventGood = 85;
      co.eventLastGood = true;
      state.destination = d0;
      co.advertP = 0;
      computePassengers(co, r);
      tc.good = true;
      tc.fired = true; // counts as a good chain
      ctx.report(
        'good',
        `You follow the Quaso Mutta to ${PLANET_BY_ID[state.planets[d0]!.id].name}. The crew feels inexplicably fortunate.`,
      );
    } else {
      co.eventGood = 15;
      co.eventLastGood = false;
      tc.good = false;
      ctx.report(
        'bad',
        'You ignore the Quaso Mutta. It stops vibrating and watches you go. The silence is ominous.',
      );
    }
    tc.cursor = 0;
    return walkTravelEvents(state, co, ci, r);
  }
  const num = Number(id.slice(3));
  const def = (num > 0 ? GOOD : BAD)[num];
  def?.resolve?.(ctx, choice);
  return walkTravelEvents(state, co, ci, r);
}
