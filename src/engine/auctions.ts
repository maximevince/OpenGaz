/**
 * Secret-bid auctions run by the Emperor: government facilities (from week 11) that charge
 * rivals a landing fee, and the occasional 600-ton ship upgrade. AI bids are computed when the
 * auction opens; humans bid via a pending event at the start of their turn; the auction is
 * settled at the end of the week.
 */
import { PLANET_BY_ID } from './data/planets';
import { upgradeShipClass } from './events';
import type { Rng } from './rng';
import type { GameState } from './types';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

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
];

export function maybeStartAuction(state: GameState, r: Rng): void {
  if (state.auction) return;
  const alive = state.companies.map((c, i) => [c, i] as const).filter(([c]) => !c.bankrupt);
  if (alive.length < 2) return;
  let auction: GameState['auction'] = null;
  if (state.week >= 11 && r.chance(0.2)) {
    const pi = r.int(0, state.planets.length - 1);
    const p = state.planets[pi]!;
    const used = new Set(p.facilities.map((f) => f.name));
    const names = FACILITY_NAMES.filter((n) => !used.has(n));
    if (names.length === 0) return;
    const fee = r.int(15, 60) * 100;
    auction = {
      kind: 'facility',
      name: `${r.pick(names)} on ${PLANET_BY_ID[p.id].name}`,
      planet: pi,
      fee,
      reserve: fee * 8,
      bids: {},
      waiting: [],
    };
  } else if (state.week >= 8 && r.chance(0.1)) {
    auction = {
      kind: 'ship',
      name: '600-ton class ship upgrade',
      planet: -1,
      fee: 0,
      reserve: 30000,
      bids: {},
      waiting: [],
    };
  }
  if (!auction) return;
  for (const [c, i] of alive) {
    if (c.isAI) {
      // AI valuation with personality noise
      const worth =
        auction.kind === 'facility' ? auction.fee * (10 + r.int(0, 8)) : 60000 + r.int(0, 40000);
      const wants = auction.kind === 'ship' ? c.ship.klass === 1 : true;
      const cap = c.cash * (c.aiStyle === 'risky' ? 0.8 : c.aiStyle === 'cautious' ? 0.3 : 0.5);
      const bid = wants ? Math.min(cap, worth * (0.7 + 0.6 * r.float()) * (0.6 + c.aiIq * 0.5)) : 0;
      if (bid >= auction.reserve) auction.bids[i] = Math.round(bid / 100) * 100;
    } else {
      auction.waiting.push(i);
    }
  }
  state.auction = auction;
  state.log.push({
    week: state.week,
    company: -1,
    kind: 'news',
    text:
      auction.kind === 'facility'
        ? `Emperor Dred is auctioning the ${auction.name} (landing fee ${fmt(auction.fee)} per visit). Sealed bids this week; minimum ${fmt(auction.reserve)}.`
        : `A 600-ton class ship upgrade goes under the hammer this week. Sealed bids; minimum ${fmt(auction.reserve)}.`,
  });
}

/** Post the bid prompt for a human company if it still owes a bid. */
export function promptBid(state: GameState, ci: number): void {
  const a = state.auction;
  if (!a || !a.waiting.includes(ci) || state.pending) return;
  const co = state.companies[ci]!;
  state.pending = {
    id: 'auctionbid',
    title: a.kind === 'facility' ? 'Facility auction' : 'Ship upgrade auction',
    text:
      a.kind === 'facility'
        ? `Emperor Dred is privatising the ${a.name}. Its owner charges every rival company ${fmt(a.fee)} kubars each time they land there, and collects the takings when visiting. Sealed bids — the highest wins. Minimum bid ${fmt(a.reserve)}. Other players: eyes closed!`
        : `A 600-ton class version of your ship is up for auction: +50 % cargo, seats and fuel (and crew), +25,000 credit limit. Sealed bids — the highest wins. Minimum ${fmt(a.reserve)}. Other players: eyes closed!`,
    choices: [
      { id: 'bid', label: 'Place bid' },
      { id: 'no', label: 'No bid' },
    ],
    input: {
      label: 'Your bid (kubars)',
      min: 0,
      max: Math.max(0, co.cash),
      initial: Math.min(co.cash, a.reserve),
    },
    portrait: 'dred',
    mood: 'neutral',
    context: 'planet',
  };
}

export function recordBid(
  state: GameState,
  ci: number,
  choice: string,
  amount: number | undefined,
): void {
  const a = state.auction;
  if (!a) return;
  a.waiting = a.waiting.filter((i) => i !== ci);
  const co = state.companies[ci]!;
  if (choice === 'bid' && amount && amount >= a.reserve && amount <= co.cash)
    a.bids[ci] = Math.floor(amount);
}

/** Settle at week end. */
export function settleAuction(state: GameState): void {
  const a = state.auction;
  if (!a) return;
  state.auction = null;
  const entries = Object.entries(a.bids)
    .map(([i, b]) => [Number(i), b] as const)
    .filter(([i]) => !state.companies[i]!.bankrupt);
  entries.sort((x, y) => y[1] - x[1]);
  const top = entries[0];
  if (!top || top[1] < a.reserve) {
    state.log.push({
      week: state.week,
      company: -1,
      kind: 'news',
      text: `Nobody met the reserve for the ${a.name}. The Emperor is sulking.`,
    });
    return;
  }
  const [wi, bid] = top;
  const w = state.companies[wi]!;
  const pay = Math.min(bid, w.cash);
  w.cash -= pay;
  if (a.kind === 'facility') {
    const p = state.planets[a.planet]!;
    p.facilities.push({
      id: `${a.planet}-${p.facilities.length}`,
      name: a.name.replace(/ on .*$/, ''),
      fee: a.fee,
      owner: wi,
      revenue: 0,
    });
    state.log.push({
      week: state.week,
      company: -1,
      kind: 'news',
      text: `${w.name} won the ${a.name} with a bid of ${fmt(bid)} kubars. Rivals now pay ${fmt(a.fee)} to land there.`,
    });
    w.inbox.push({
      week: state.week,
      company: wi,
      kind: 'good',
      text: `You won the auction for the ${a.name} for ${fmt(bid)} kubars! Rivals landing there pay you ${fmt(a.fee)} each visit.`,
    });
  } else {
    upgradeShipClass(w);
    state.log.push({
      week: state.week,
      company: -1,
      kind: 'news',
      text: `${w.name} won the ship-upgrade auction for ${fmt(bid)} kubars and now flies a 600-ton class ship.`,
    });
    w.inbox.push({
      week: state.week,
      company: wi,
      kind: 'good',
      text: `You won the ship upgrade for ${fmt(bid)} kubars! Cargo ${w.ship.cargo} t, ${w.ship.seats} seats, ${w.ship.fuelCap} t fuel, crew ${w.ship.crew}.`,
    });
  }
  for (const [i] of entries.slice(1)) {
    state.companies[i]!.inbox.push({
      week: state.week,
      company: i,
      kind: 'info',
      text: `You were outbid for the ${a.name}; ${w.name} won with ${fmt(bid)} kubars.`,
    });
  }
}
