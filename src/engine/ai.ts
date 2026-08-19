/**
 * The six rival companies.
 *
 * They are not simulated traders: the original runs them as a scripted economic backdrop.
 * Each rival holds exactly one commodity slot, buys the biggest bargain on the planet it is
 * standing on, pays a fixed weekly running cost, compounds its cash, and occasionally buys an
 * engine or a bigger ship. All six act in index order inside the week rollover, before the
 * humans' new week begins. Rivals never go bankrupt.
 */
import { COMMODITIES, type CommodityId } from './data/commodities';
import { LEVEL_INDEX } from './data/levels';
import { OPPONENTS } from './data/opponents';
import { PLANET_BY_ID } from './data/planets';
import { fmt, netWorth, opponentTravelTime, distanceBetween } from './economy';
import type { Rng } from './rng';
import type { CompanyState, GameState } from './types';

function news(state: GameState, text: string): void {
  state.log.push({ week: state.week, company: -1, kind: 'news', text });
}

const aiDef = (co: CompanyState) => OPPONENTS[co.aiIndex - 1] ?? OPPONENTS[0]!;

/** richest non-bankrupt human net worth */
function richestHuman(state: GameState): number {
  const humans = state.companies.filter((c) => !c.isAI && !c.bankrupt);
  return humans.length ? Math.max(...humans.map((c) => netWorth(state, c))) : -10_000_000_000;
}

/** Run every rival's weekly turn, in index order. */
export function runOpponents(state: GameState, r: Rng): void {
  const R = richestHuman(state);
  for (let i = 0; i < state.companies.length; i++) {
    const co = state.companies[i]!;
    if (!co.isAI) continue;
    opponentFacilities(state, co, i);
    opponentBuySell(state, co);
    if (state.week >= 15) opponentStock(state, co, R);
    const shown = opponentBuysEngine(state, co, r);
    if (state.week > 4 && !shown) opponentBuysShip(state, co, r);
    if (co.cash > 0) opponentCashGrowth(state, co);
    if (state.week >= 3) opponentWeeklyCost(state, co);
  }
}

/* --------------------------------------------------------------- facilities */

/** Pay every rival facility on this planet, then collect this rival's own takings. */
function opponentFacilities(state: GameState, co: CompanyState, ci: number): void {
  const p = state.planets[co.planet];
  if (!p) return;
  for (const f of p.facilities) {
    if (f.owner === ci) {
      co.cash += f.revenue;
      f.revenue = 0;
    } else if (f.owner >= 0 && !state.companies[f.owner]?.bankrupt) {
      co.cash -= f.fee;
      f.revenue += f.fee;
    }
  }
}

/* ------------------------------------------------------------- buy and sell */

/**
 * Sell the held commodity at the local price, then buy the biggest bargain measured against
 * the 40k reference price, and pays the full asking price both ways.
 */
function opponentBuySell(state: GameState, co: CompanyState): void {
  const p = state.planets[co.planet];
  if (!p) return;
  if (co.aiTag && co.aiCargo > 0) {
    p.stock[co.aiTag] = (p.stock[co.aiTag] ?? 0) + co.aiCargo;
    co.cash += (p.price[co.aiTag] ?? 0) * co.aiCargo;
    co.aiCargo = 0;
  }
  let best = 0;
  let pick: CommodityId | null = null;
  let qty = 0;
  for (const def of COMMODITIES) {
    const c = def.id;
    const ref = 40 * def.rank;
    const price = p.price[c] ?? ref;
    const avail = p.stock[c] ?? 0;
    if (ref - price > best && avail > co.ship.tons / 16) {
      best = ref - price;
      pick = c;
      qty = Math.min(Math.floor((co.ship.tons / 4) * (co.aiIq / 100)), avail);
    }
  }
  if (!pick || qty <= 0) return;
  co.aiTag = pick;
  co.aiCargo = qty;
  co.cash -= (p.price[pick] ?? 0) * qty;
  p.stock[pick] = Math.max(0, (p.stock[pick] ?? 0) - qty);
}

/* ------------------------------------------------------------------ shares */

/** Trade the local exchange only, from week 15. */
function opponentStock(state: GameState, co: CompanyState, R: number): void {
  const p = state.planets[co.planet];
  if (!p || p.exchange.crashed) return;
  const price = p.exchange.price;
  if (price <= 0) return;
  const def = aiDef(co);
  if (p.exchange.trend >= def.stockTrendMin) {
    if (co.cash <= price) return;
    const f = Math.min(1, co.aiIq / 100) * (netWorth(state, co) >= R ? 0.5 : 1);
    const n = Math.floor((((f * def.stockMult) / 100) * co.cash) / price);
    if (n <= 0) return;
    co.cash -= n * price;
    const lot = co.shares[co.planet];
    if (!lot) co.shares[co.planet] = { tons: n, paid: price };
    else {
      lot.paid = Math.floor((lot.paid * lot.tons + price * n) / (lot.tons + n));
      lot.tons += n;
    }
  } else {
    const lot = co.shares[co.planet];
    if (!lot || lot.tons <= 0) return;
    co.cash += lot.tons * price;
    delete co.shares[co.planet];
  }
}

/* ------------------------------------------------------------ ships, engines */

/** Pyke: 3-in-4. Xeen: 1-in-6. Cost 5,000-25,000. */
function opponentBuysEngine(state: GameState, co: CompanyState, r: Rng): boolean {
  const world = PLANET_BY_ID[state.planets[co.planet]!.id];
  const cost = r.fint(5000, 25000);
  const onPyke = world.id === 'pyke';
  const onXeen = world.id === 'xeen';
  if (onPyke && r.fint(1, 4) !== 1) {
    co.ship.kuarps += 1;
    co.cash -= cost;
    news(state, `${co.name} calls at Pyke and fits a faster ${co.ship.kuarps}-kuarp engine.`);
    return true;
  }
  if (onXeen && r.fint(1, 4) === 1 && r.fint(1, 3) !== 1) {
    co.ship.kuarps += 1;
    co.cash -= cost;
    news(
      state,
      `${co.name} has a Xeen mechanic turbocharge its engine to ${co.ship.kuarps} kuarps.`,
    );
    return true;
  }
  return false;
}

/** Base odds only in the original — no level tables, no catch-up target. */
function opponentBuysShip(state: GameState, co: CompanyState, r: Rng): boolean {
  const humans = state.companies.filter((c) => !c.isAI);
  if (!humans.length) return false;
  const avg = Math.floor(humans.reduce((s, c) => s + c.ship.tons, 0) / humans.length);
  const def = aiDef(co);
  const D =
    co.ship.tons >= avg ? 10000 : co.ship.tons + 600 <= avg ? def.shipOddsFar : def.shipOddsNear;
  if (r.fint(1, D) !== 1) return false;
  const cost = r.fint(25000, 75000);
  co.cash -= cost;
  co.ship.tons += 200;
  news(
    state,
    `${co.name} buys a ${co.ship.tons}-ton ship from the Traders' Union for ${fmt(cost)} kubars.`,
  );
  return true;
}

/* ------------------------------------------------------------------- money */

/** Compounding cash. */
function opponentCashGrowth(state: GameState, co: CompanyState): void {
  const idx = LEVEL_INDEX(state.settings.level);
  let factor = 1.02;
  if (idx === 0) {
    if (state.week >= 100) factor = 1.02;
    else if (state.week >= 50) factor = 1.01;
    else return;
  } else if (idx === 1) {
    factor = state.week < 50 ? 1.01 : 1.02;
  }
  co.cash = Math.floor(co.cash * factor);
}

/** The fixed weekly running cost the original charges instead of Steam's scripted P&L. */
function opponentWeeklyCost(state: GameState, co: CompanyState): void {
  const idx = LEVEL_INDEX(state.settings.level);
  const L = idx === 0 ? 15 : 12 - 2 * idx;
  co.cash -= aiDef(co).weeklyCostK * (co.ship.tons / 4) * L;
}

/* ---------------------------------------------------------------- movement */

/**
 * Rivals head for the planet with the lowest supply of the commodity they hold,
 * which is where it fetches the most. Ties go to the highest slot index.
 */
export function moveOpponents(state: GameState, r: Rng): void {
  for (const co of state.companies) {
    if (!co.isAI) continue;
    co.planetLast = co.planet;
    let target = r.fint(0, 6);
    const tag = co.aiTag;
    if (tag) {
      for (let j = 0; j < state.planets.length; j++) {
        if ((state.planets[j]!.supply[tag] ?? 50) <= (state.planets[target]!.supply[tag] ?? 50)) {
          target = j;
        }
      }
    }
    co.planet = target;
    co.lastTravelTime = opponentTravelTime(
      distanceBetween(state, co.planetLast, co.planet),
      co.ship.kuarps,
    );
  }
}
