/**
 * Pure economic formulas: prices, availability, passenger demand, fuel, travel time and money.
 */
import { COMMODITY_BY_ID, priceRange, type CommodityId } from './data/commodities';
import { ECON, LEVEL_BY_ID } from './data/levels';
import { slotDistance } from './data/planets';
import type { Rng } from './rng';
import type { CompanyState, GameState, LogEntry, PlanetState } from './types';

/* ------------------------------------------------------------ prices */

/**
 * Market price from the planet's supply rating:
 * `floor((pMax - pMin) * (100 - comR) / 100) + pMin`, pMin=(difficulty+1)*5*k, pMax=40*k.
 */
export function priceForSupply(c: CommodityId, supply: number, difficulty: number): number {
  const { min, max } = priceRange(COMMODITY_BY_ID[c], difficulty);
  const s = Math.min(100, Math.max(0, supply));
  return Math.floor(((max - min) * (100 - s)) / 100) + min;
}

/**
 * Tons offered for sale this week:
 * `comA = fint(0.2*comR, comR)` plus the advertising bonus, wiped when `fint(0,130) >= comR`.
 */
export function rollAvailability(supply: number, advertC: number, r: Rng): number {
  let a = r.fint(0.2 * supply, supply);
  const x = (advertC * supply) / 100;
  if (x > 0) a += r.fint(0.2 * x, x);
  if (r.fint(0, 130) >= supply) a = 0;
  return Math.max(0, a);
}

export function refreshPlanetPrices(state: GameState, p: PlanetState): void {
  const difficulty = LEVEL_BY_ID(state.settings.level).difficulty;
  for (const c of state.commodities) {
    p.price[c] = priceForSupply(c, p.supply[c] ?? 50, difficulty);
  }
}

/* --------------------------------------------------------- passengers */

/**
 * `computePassengers()`: demand from seats + ads, stepped down by
 * ticket-price band, zero above 10,000. Called at departure for the DESTINATION.
 */
export function computePassengers(co: CompanyState, r: Rng): void {
  co.paxPickedUp = false;
  co.paxPrice = Math.max(100, co.ticketPrice);
  let n = r.fint(0, co.ship.seats) + r.fint(co.advertP / 4, co.advertP);
  const price = co.paxPrice;
  if (price <= 4000) n = Math.floor((n * 1000) / price);
  else if (price <= 5000) n = Math.floor((n * 1000) / (1.5 * price));
  else if (price <= 6000) n = Math.floor((n * 1000) / (2.25 * price));
  else if (price <= 7000) n = Math.floor((n * 1000) / (3.25 * price));
  else if (price <= 8000) n = Math.floor((n * 1000) / (4.75 * price));
  else if (price <= 9000) n = Math.floor((n * 1000) / (7 * price));
  else if (price <= 10000) n = Math.floor((n * 1000) / (10 * price));
  else n = 0;
  co.paxWaiting = Math.min(n, co.ship.seats);
}

/* --------------------------------------------------------------- fuel */

/** Fuel burned on one trip: `fint(1, dist/2) + fint(1, shipTons/100)`. */
export function fuelUsage(dist: number, shipTons: number, r: Rng): number {
  return r.fint(1, dist / 2) + r.fint(1, shipTons / 100);
}

/** Low-fuel warning threshold. */
export function lowFuel(co: CompanyState): boolean {
  return co.ship.fuel < co.ship.tons / 100 + 11;
}

/* ------------------------------------------------------------- travel */

export function distanceBetween(state: GameState, from: number, to: number): number {
  return slotDistance(state.planets[from]!.slot, state.planets[to]!.slot);
}

/** Human travel time: `floor(dist*5/engine * travelDelayed)`. */
export function humanTravelTime(dist: number, kuarps: number, travelDelayed: number): number {
  return Math.floor(((dist * 5) / Math.max(1, kuarps)) * travelDelayed);
}

/** Opponent travel time — not floored, no delay factor. */
export function opponentTravelTime(dist: number, kuarps: number): number {
  return (dist * 5) / Math.max(1, kuarps);
}

/* ------------------------------------------------------------- money */

/**
 * `subtract_cash`: cash → savings → the remainder is
 * forced onto the Trader's Union loan. Never fails; may push the loan past its limit.
 */
export function subtractCash(co: CompanyState, amount: number): void {
  if (co.cash >= amount) {
    co.cash -= amount;
  } else if (co.cash + co.bank >= amount) {
    co.bank = co.bank + co.cash - amount;
    co.cash = 0;
  } else {
    co.unionLoan = co.unionLoan - (co.bank + co.cash) + amount;
    co.bank = 0;
    co.cash = 0;
  }
}

export function sharesValue(state: GameState, co: CompanyState): number {
  let v = 0;
  for (const [pi, lot] of Object.entries(co.shares)) {
    const p = state.planets[Number(pi)];
    if (p && lot.tons > 0) v += lot.tons * p.exchange.price;
  }
  return v;
}

/**
 * Net worth: humans = shares + cash + savings − loans; opponents = shares + cash.
 * Cargo, warehouse, ship, facilities and owed taxes/wages are excluded.
 */
export function netWorth(state: GameState, co: CompanyState): number {
  if (co.bankrupt) return -10_000_000_000;
  const shares = sharesValue(state, co);
  if (co.isAI) return Math.floor(shares + co.cash);
  return Math.floor(shares + co.cash + co.bank - co.unionLoan - co.zinnLoan);
}

export function cargoTons(co: CompanyState): number {
  return Object.values(co.cargo).reduce((s, l) => s + (l?.tons ?? 0), 0);
}

export function cargoValue(co: CompanyState): number {
  return Object.values(co.cargo).reduce((s, l) => s + (l ? l.tons * l.paid : 0), 0);
}

/** Cargo valued at a planet's current market prices — this is what tariffs are charged on. */
export function cargoMarketValue(co: CompanyState, p: PlanetState): number {
  let v = 0;
  for (const [c, lot] of Object.entries(co.cargo) as [CommodityId, { tons: number }][]) {
    if (lot.tons > 0) v += lot.tons * (p.price[c] ?? 0);
  }
  return v;
}

export function warehouseTons(co: CompanyState, planet: number): number {
  return Object.values(co.warehouse[planet] ?? {}).reduce((s, l) => s + (l?.tons ?? 0), 0);
}

/** Ad level cost: `floor(base * shipTons / 400)`. */
export function adCost(tier: number, co: CompanyState): number {
  return Math.floor(((ECON.adTiers[tier] ?? 0) * co.ship.tons) / 400);
}

/** Roll the next trip's insurance premium: `fint(range, range*1000)`. */
export function rollInsuranceCost(co: CompanyState, r: Rng): number {
  return r.fint(co.insurancePriceRange, co.insurancePriceRange * 1000);
}

/* ------------------------------------------------------------- misc */

export const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');

export function pushLog(state: GameState, e: LogEntry): LogEntry {
  state.log.push(e);
  if (state.log.length > 400) state.log.splice(0, state.log.length - 400);
  return e;
}
