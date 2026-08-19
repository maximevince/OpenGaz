/**
 * The Emperor's secret-bid auctions. One auction runs per week at most:
 * ship upgrades (Traders' Union, +200 t) or government facilities that charge landing fees.
 * Humans bid when they pick a destination; opponents bid at week end from net-worth tables;
 * a tie re-runs the same lot next week. Results are announced the following week.
 */
import { PLANET_BY_ID } from './data/planets';
import { computePassengers, fmt, netWorth, subtractCash } from './economy';
import { applyShipUpgrade } from './events';
import type { Rng } from './rng';
import type { AuctionResult, AuctionState, GameState } from './types';

/** Facility name pool — the original rolls a type 1..100; we map it onto this list. */
const FACILITY_NAMES = [
  'Atmospheric Filtering Unit',
  'Orbital Launch Pad',
  'Passenger Ticket Office',
  'Ionic Fuel Depot',
  'Customs House',
  'Docking Cradle',
  'Cargo Crane Complex',
  'Traffic Control Tower',
  'Quarantine Station',
  'Gravity Anchor',
  'Meteor Shield Array',
  'Hydroponic Dome',
  'Communications Relay',
  'Stellar Lighthouse',
  'Waste Reclamation Plant',
  'Passenger Lounge',
  'Bonded Warehouse Row',
  'Navigation Beacon',
  'Dry Dock',
  'Kubar Mint Annex',
] as const;

export function facilityName(
  a: { facilityType: number; planet: number },
  state: GameState,
): string {
  const base = FACILITY_NAMES[(a.facilityType - 1) % FACILITY_NAMES.length]!;
  return `${base} on ${PLANET_BY_ID[state.planets[a.planet]!.id].name}`;
}

/** One row per company for the facilities chart: how many it owns on this planet, and what they earn. */
export interface FacilityHolding {
  company: number;
  count: number;
  /** total landing fee every other company pays on each visit */
  fee: number;
  /** fees banked on the planet, waiting for the owner to land */
  revenue: number;
}

/**
 * What each company owns on one planet. Facilities are stored per planet, so this folds them
 * back into the per-owner totals the chart shows. Companies owning nothing are included.
 */
export function facilityHoldings(state: GameState, planet: number): FacilityHolding[] {
  const rows = state.companies.map((_, company) => ({ company, count: 0, fee: 0, revenue: 0 }));
  for (const f of state.planets[planet]?.facilities ?? []) {
    const row = rows[f.owner];
    if (!row) continue; // owner -1 = seized on bankruptcy
    row.count++;
    row.fee += f.fee;
    row.revenue += f.revenue;
  }
  return rows;
}

function humanCount(state: GameState): number {
  return state.companies.filter((c) => !c.isAI && !c.bankrupt).length;
}

/* ------------------------------------------------------------- weekly driver */

/**
 * Week-end auction step: resolve this week's auction, then schedule next week's.
 * Call from the rollover once `week > 2`.
 */
export function runAuctionWeek(state: GameState, r: Rng): void {
  const prev = state.auction;
  state.auction = null;
  let lastCode = 0;
  if (prev) {
    lastCode = prev.kind === 'ship' ? resolveShip(state, prev, r) : resolveFacility(state, prev, r);
  }
  // schedule next week's lot
  const humans = humanCount(state);
  const shipRoll = r.fint(1, humans <= 1 ? 12 : humans === 2 ? 10 : 8);
  if ((lastCode === -1 || shipRoll === 1) && lastCode !== -2) {
    state.auction = blank('ship', -1, 0, 0);
  } else {
    const facRoll = r.fint(1, humans <= 1 ? 4 : humans === 2 ? 3 : 2);
    if (facRoll === 1 || lastCode === -2) {
      if (lastCode === -2 && state.auctionLast) {
        const l = state.auctionLast;
        state.auction = blank('facility', l.planet, l.fee, l.facilityType);
      } else {
        state.auction = blank('facility', r.fint(0, 6), r.fint(500, 5000), r.fint(1, 100));
      }
    }
  }
  if (state.auction) {
    const a = state.auction;
    state.log.push({
      week: state.week,
      company: -1,
      kind: 'news',
      text:
        a.kind === 'ship'
          ? "The Traders' Union is auctioning a 200-ton ship enlargement this week. Sealed bids when you set course."
          : `Emperor Dred is auctioning the ${facilityName(a, state)} (landing fee ${fmt(a.fee)} per visit). Sealed bids when you set course.`,
    });
  }
}

function blank(
  kind: 'ship' | 'facility',
  planet: number,
  fee: number,
  facilityType: number,
): AuctionState {
  return {
    kind,
    planet,
    fee,
    facilityType,
    highBid: 0,
    highCompany: -1,
    nextBid: 0,
    nextCompany: -1,
    responded: [],
  };
}

/* ----------------------------------------------------------------- bidding */

/** Merge a human's secret bid. No minimum, no cash check. */
export function recordBid(state: GameState, ci: number, amount: number): void {
  const a = state.auction;
  if (!a || a.responded.includes(ci)) return;
  a.responded.push(ci);
  const bid = Math.max(0, Math.min(1e11, Math.floor(amount)));
  if (bid <= 0) return;
  if (bid >= a.highBid) {
    a.nextBid = a.highBid;
    a.nextCompany = a.highCompany;
    a.highBid = bid;
    a.highCompany = ci;
  } else if (bid > a.nextBid) {
    a.nextBid = bid;
    a.nextCompany = ci;
  }
}

/* -------------------------------------------------------------- resolution */

/** Opponent ship-auction bid from its net worth. */
function shipBidRange(nw: number): [number, number] {
  const rows: [number, number, number][] = [
    [-100_000, 5000, 10000],
    [-50_000, 7500, 15000],
    [0, 10000, 20000],
    [100_000, 12500, 50000],
    [200_000, 15000, 55000],
    [300_000, 17500, 60000],
    [400_000, 20000, 65000],
    [500_000, 22500, 70000],
    [600_000, 25000, 75000],
    [700_000, 27500, 80000],
    [800_000, 30000, 85000],
    [900_000, 32500, 90000],
    [1_000_000, 35000, 95000],
    [2_000_000, 37500, 100000],
    [3_000_000, 40000, 110000],
    [4_000_000, 50000, 120000],
    [5_000_000, 60000, 130000],
    [6_000_000, 70000, 140000],
    [7_000_000, 80000, 150000],
    [8_000_000, 90000, 160000],
    [9_000_000, 100000, 170000],
    [10_000_000, 110000, 180000],
    [100_000_000, 120000, 190000],
  ];
  for (const [cap, lo, hi] of rows) if (nw <= cap) return [lo, hi];
  return [130000, 200000];
}

/** Facility bid = multiple of the fee by net-worth band. */
function facilityBidRange(nw: number, fee: number): [number, number] {
  const bands: [number, number][] = [
    [-100_000, 2.5],
    [-50_000, 5],
    [0, 7.5],
    [100_000, 10],
    [200_000, 11],
    [300_000, 12],
    [400_000, 13],
    [500_000, 14],
    [600_000, 15],
    [700_000, 16],
    [800_000, 17],
    [900_000, 18],
    [1_000_000, 19],
  ];
  for (const [cap, m] of bands) if (nw <= cap) return [m * fee, 2 * m * fee];
  return [20 * fee, 40 * fee];
}

interface OppBids {
  top: number;
  topCo: number;
  sec: number;
}

function rollOpponentBids(
  state: GameState,
  r: Rng,
  roll: (co: import('./types').CompanyState, i: number) => number,
): OppBids {
  let top: number;
  let sec: number;
  let topCo: number;
  let guard = 0;
  do {
    top = 0;
    sec = 0;
    topCo = -1;
    for (const [co, i] of state.companies.map((c, j) => [c, j] as const)) {
      if (!co.isAI) continue;
      const bid = roll(co, i);
      if (bid >= top) {
        sec = top;
        top = bid;
        topCo = i;
      } else if (bid > sec) {
        sec = bid;
      }
    }
  } while (top > 0 && top === sec && guard++ < 25); // re-roll the whole set on an opponent tie
  return { top, topCo, sec };
}

function resolveShip(state: GameState, a: AuctionState, r: Rng): number {
  const humansAlive = state.companies.filter((c) => !c.isAI && !c.bankrupt);
  const big = Math.max(0, ...humansAlive.map((c) => c.ship.tons));
  const opp = rollOpponentBids(state, r, (co) => {
    const [lo, hi] = shipBidRange(netWorth(state, co));
    let bid = r.fint(lo, hi);
    if (r.fint(1, 6) === 1) bid *= 2;
    if (r.fint(1, 6) === 1 && co.ship.tons < big && bid < a.highBid) {
      bid = Math.min(a.highBid + r.fint(1, 20000), 250000 + r.fint(1, 25000), netWorth(state, co));
      bid = Math.max(0, bid);
    }
    return bid;
  });
  merge(a, opp, state, r);
  return settle(state, a, r, 1);
}

function resolveFacility(state: GameState, a: AuctionState, r: Rng): number {
  const opp = rollOpponentBids(state, r, (co) => {
    const [lo, hi] = facilityBidRange(netWorth(state, co), a.fee);
    let bid = r.fint(lo, hi);
    if (r.fint(1, 6) === 1) bid *= 2;
    return Math.floor(bid);
  });
  merge(a, opp, state, r);
  return settle(state, a, r, 2);
}

/** Merge the opponents' top two bids into the human high/next pair. */
function merge(a: AuctionState, opp: OppBids, state: GameState, r: Rng): void {
  if (opp.top > a.highBid) {
    a.nextBid = a.highBid;
    a.nextCompany = a.highCompany;
    a.highBid = opp.top;
    a.highCompany = opp.topCo;
    if (opp.sec > a.nextBid) {
      a.nextBid = opp.sec;
      a.nextCompany = -2; // an unnamed rival — cosmetic only
    }
  } else if (opp.top > a.nextBid) {
    a.nextBid = opp.top;
    a.nextCompany = opp.topCo;
  }
  // never announce the same company as both winner and runner-up
  if (a.nextCompany === a.highCompany || a.nextCompany === -1) {
    const ais = state.companies
      .map((c, i) => (c.isAI ? i : -1))
      .filter((i) => i >= 0 && i !== a.highCompany);
    if (ais.length) a.nextCompany = ais[r.fint(0, ais.length - 1)]!;
  }
}

/** Pay the winner's bid and hand over the prize. Returns the auctionLast code. */
function settle(state: GameState, a: AuctionState, r: Rng, base: 1 | 2): number {
  const tie = a.nextBid === a.highBid && a.highBid !== 0;
  const result: AuctionResult = {
    code: 0,
    kind: a.kind,
    planet: a.planet,
    fee: a.fee,
    facilityType: a.facilityType,
    highBid: a.highBid,
    highCompany: a.highCompany,
    nextBid: a.nextBid,
    nextCompany: a.nextCompany,
  };
  if (tie) {
    result.code = base === 1 ? -1 : -2;
    state.auctionLast = result;
    return result.code;
  }
  result.code = base;
  if (a.highBid > 0 && a.highCompany >= 0) {
    const w = state.companies[a.highCompany]!;
    if (w.isAI) {
      w.cash -= a.highBid;
      if (a.kind === 'ship') w.ship.tons += 200;
      else addFacility(state, a);
    } else {
      if (a.highBid > w.cash + w.bank) result.code = base + 2; // paid partly by loan
      subtractCash(w, a.highBid);
      if (a.kind === 'ship') {
        applyShipUpgrade(w);
        computePassengers(w, r);
      } else {
        addFacility(state, a);
      }
    }
    state.log.push({
      week: state.week,
      company: -1,
      kind: 'news',
      text:
        a.kind === 'ship'
          ? `${w.name} won the Traders' Union ship auction with a secret bid of ${fmt(a.highBid)} kubars.`
          : `${w.name} won the ${facilityName(a, state)} with a secret bid of ${fmt(a.highBid)} kubars. Rivals landing there now pay ${fmt(a.fee)}.`,
    });
  }
  state.auctionLast = result;
  return result.code;
}

function addFacility(state: GameState, a: AuctionState): void {
  const p = state.planets[a.planet]!;
  p.facilities.push({
    id: `${a.planet}-${p.facilities.length}`,
    name: FACILITY_NAMES[(a.facilityType - 1) % FACILITY_NAMES.length]!,
    fee: a.fee,
    owner: a.highCompany,
    revenue: 0,
  });
}

/* ------------------------------------------------------- arrival reporting */

/** Turn-start / arrival messages about last week's auction. */
export function auctionReportFor(state: GameState, ci: number): string | null {
  const l = state.auctionLast;
  if (!l || l.code === 0) return null;
  const what =
    l.kind === 'ship'
      ? "the Traders' Union ship auction"
      : `the auction for the ${facilityName(l, state)}`;
  if (l.code === -1 || l.code === -2)
    return `Last week's ${what} ended in a tie — the Emperor orders it re-run this week.`;
  if (l.highBid <= 0) return `Nobody bid in ${what}. The lot was withdrawn.`;
  const winner = state.companies[l.highCompany]?.name ?? 'A rival company';
  const runner =
    l.nextBid > 0
      ? ` The next highest was ${state.companies[l.nextCompany]?.name ?? 'another company'} at ${fmt(l.nextBid)} kubars.`
      : '';
  const you = l.highCompany === ci;
  if (l.kind === 'ship') {
    return you
      ? `You won ${what} for ${fmt(l.highBid)} kubars — your ship has been enlarged by 200 tons.${l.code === 3 ? " The Trader's Union financed what your cash could not cover." : ''}${runner}`
      : `${winner} won ${what} with a bid of ${fmt(l.highBid)} kubars.${runner}`;
  }
  return you
    ? `You won ${what} for ${fmt(l.highBid)} kubars — every rival landing there pays you ${fmt(l.fee)}.${l.code === 4 ? " The Trader's Union financed what your cash could not cover." : ''}${runner}`
    : `${winner} won ${what} with a bid of ${fmt(l.highBid)} kubars.${runner}`;
}
