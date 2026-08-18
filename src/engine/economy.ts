import {
  COMMODITY_BY_ID,
  baseAvailability,
  priceRange,
  type CommodityId,
} from './data/commodities';
import { ECON, LEVEL_BY_ID } from './data/levels';
import { slotDistance } from './data/planets';
import { SHIP_BY_ID } from './data/ships';
import type { Rng } from './rng';
import type { CompanyState, GameState, PlanetState } from './types';

/* ------------------------------------------------------------ prices */

/**
 * Market price from the planet's supply rating (0..100). Low supply → high price.
 * The curve is convex so scarce goods get expensive fast; `squeeze` narrows the band.
 */
export function priceForSupply(c: CommodityId, supply: number, squeeze: number, noise = 0): number {
  const { min, max } = priceRange(COMMODITY_BY_ID[c]);
  const s = Math.min(100, Math.max(0, supply)) / 100;
  const t = Math.pow(1 - s, 1.6); // 0 (plentiful) .. 1 (scarce)
  const lo = min + (max - min) * (squeeze * 0.25);
  const hi = max - (max - min) * (squeeze * 0.25);
  const p = lo + (hi - lo) * t;
  return Math.max(min, Math.min(max, Math.round(p * (1 + noise))));
}

/** tons that appear on the market for a given supply rating */
export function stockForSupply(c: CommodityId, supply: number, r: Rng): number {
  const base = baseAvailability(COMMODITY_BY_ID[c]);
  const s = Math.min(100, Math.max(0, supply)) / 100;
  return Math.max(0, Math.round(base * (0.15 + 0.85 * s) * (0.6 + 0.8 * r.float())));
}

export function refreshPlanetPrices(state: GameState, p: PlanetState, r: Rng): void {
  const squeeze = LEVEL_BY_ID(state.settings.level).squeeze;
  for (const c of state.commodities) {
    p.price[c] = priceForSupply(c, p.supply[c] ?? 50, squeeze, (r.float() - 0.5) * 0.1);
  }
}

/** Buying/selling nudges local supply: ~1 % per (availability/25) tons. */
export function nudgeSupply(p: PlanetState, c: CommodityId, tonsBought: number): void {
  const per = Math.max(1, baseAvailability(COMMODITY_BY_ID[c]) / 25);
  const s = (p.supply[c] ?? 50) - tonsBought / per;
  p.supply[c] = Math.min(100, Math.max(0, s));
}

/* --------------------------------------------------------- passengers */

/** Passengers waiting at the current ticket price (before seat cap). */
export function passengersWaiting(co: CompanyState): number {
  const price = co.ticketPrice;
  const base = co.paxBase + co.paxAdBonus;
  let n = (base * 1000) / price;
  if (price > 4000) n *= Math.pow(4000 / price, 3); // harsh drop-off
  return Math.max(0, Math.min(co.ship.seats, Math.floor(n)));
}

/** Roll passenger demand on arrival: base 0..seats, ad bonus ad/4..ad (ad = spend/125). */
export function rollPassengerDemand(co: CompanyState, adSpend: number, r: Rng): void {
  const ad = Math.floor(adSpend / 175);
  co.paxBase = r.int(0, co.ship.seats);
  co.paxAdBonus = ad > 0 ? r.int(Math.floor(ad / 4), ad) : 0;
}

/* --------------------------------------------------------------- fuel */

export function fuelUsage(dist: number, shipTons: number, r: Rng): number {
  return (
    r.int(1, Math.max(1, Math.floor(dist / 2))) + r.int(1, Math.max(1, Math.floor(shipTons / 100)))
  );
}

export function shipTons(co: CompanyState): number {
  return Math.round(400 * co.ship.klass);
}

export function travelTime(state: GameState, from: number, to: number, kuarps: number): number {
  const d = slotDistance(state.planets[from]!.slot, state.planets[to]!.slot);
  return (d * 5) / Math.max(1, kuarps);
}

export function distanceBetween(state: GameState, from: number, to: number): number {
  return slotDistance(state.planets[from]!.slot, state.planets[to]!.slot);
}

/* ------------------------------------------------------------- money */

export function sharesValue(state: GameState, co: CompanyState): number {
  let v = 0;
  for (const [pi, lot] of Object.entries(co.shares)) {
    const p = state.planets[Number(pi)];
    if (p && lot.tons > 0) v += lot.tons * p.exchange.price;
  }
  return Math.round(v);
}

export function netWorth(state: GameState, co: CompanyState): number {
  return Math.round(co.cash + co.bank + sharesValue(state, co) - co.unionLoan - co.zinnLoan);
}

export function cargoTons(co: CompanyState): number {
  return Object.values(co.cargo).reduce((s, l) => s + (l?.tons ?? 0), 0);
}

export function cargoValue(co: CompanyState): number {
  return Object.values(co.cargo).reduce((s, l) => s + (l ? l.tons * l.paid : 0), 0);
}

export function warehouseTons(co: CompanyState, planet: number): number {
  return Object.values(co.warehouse[planet] ?? {}).reduce((s, l) => s + (l?.tons ?? 0), 0);
}

export function adSpend(tier: number, co: CompanyState): number {
  return Math.round((ECON.adTiers[tier] ?? 0) * co.ship.klass);
}

/** Insurance premium for the next trip (before Frac adjustments). */
export function insurancePremium(state: GameState, co: CompanyState, r: Rng): number {
  const risk = SHIP_BY_ID(co.ship.defId).risk;
  const cargo = cargoValue(co);
  const base = 300 + cargo * 0.02 + shipTons(co) * 1.5;
  const p = base * risk * (0.85 + 0.3 * r.float()) * (co.luck < 0.3 ? 1.3 : 1);
  return Math.max(15, Math.min(15000, Math.round(p)));
}
