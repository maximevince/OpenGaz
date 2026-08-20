/**
 * The deterministic rules engine: `applyAction(state, action) -> state`.
 *
 * Structure follows the original's turn machine: a human acts on a planet, picks a
 * destination, runs the departure pipeline, and hands over. When every human has moved the week rolls
 * over: the six rivals take their scripted turns, then the world updates.
 */
import { COMMODITY_BY_ID, type CommodityId } from './data/commodities';
import { ECON, LEVEL_BY_ID } from './data/levels';
import { RIVAL_TAUNTS } from './data/opponents';
import { PLANET_BY_ID } from './data/planets';
import { moveOpponents, runOpponents } from './ai';
import { auctionReportFor, recordBid, runAuctionWeek } from './auctions';
import {
  adCost,
  cargoMarketValue,
  cargoTons,
  computePassengers,
  distanceBetween,
  fmt,
  fuelUsage,
  humanTravelTime,
  netWorth,
  pushLog,
  rollInsuranceCost,
  subtractCash,
  warehouseTons,
} from './economy';
import {
  applyEventGoodFloor,
  badChainStreak,
  beginEventRoll,
  endChainStreak,
  resolveTravelEvent,
} from './events';
import { Rng } from './rng';
import { nextWinningPoint } from './rulesets';
import { resolveSpecialChoice, startSpecial } from './specials';
import {
  commodityAvailable,
  commodityPrice,
  economicChange,
  gameEvents,
  opponentEvents,
  rollFuelPrices,
  rollNewsEvent,
  rollWeather,
  stepStockMarket,
} from './world';
import {
  ActionError,
  type Action,
  type CompanyState,
  type GameState,
  type LogEntry,
  type Phase,
} from './types';

/* ------------------------------------------------------------- helpers */

export function currentIndex(state: GameState): number {
  return state.order[state.turnIndex] ?? -1;
}

/**
 * Where a company is physically standing this week.
 *
 * A company that has already flown this week has `planet` pointing at the destination it
 * declared, while its ship is still parked on `planetLast` until the week rolls over. Rivals
 * move inside the rollover, so `planet` is always current for them.
 */
export function companyLocation(state: GameState, ci: number): number {
  const co = state.companies[ci];
  if (!co) return -1;
  if (co.isAI) return co.planet;
  const seat = state.order.indexOf(ci);
  return seat >= 0 && seat < state.turnIndex ? co.planetLast : co.planet;
}

/** True when this company has already taken its turn in the current week. */
export function hasFlownThisWeek(state: GameState, ci: number): boolean {
  const co = state.companies[ci];
  if (!co) return false;
  if (co.isAI) return true; // rivals all move inside the week rollover
  const seat = state.order.indexOf(ci);
  return seat >= 0 && seat < state.turnIndex;
}

export function currentCompany(state: GameState): CompanyState {
  const co = state.companies[currentIndex(state)];
  if (!co) throw new ActionError('no current company');
  return co;
}

function log(state: GameState, company: number, kind: LogEntry['kind'], text: string): LogEntry {
  return pushLog(state, { week: state.week, company, kind, text });
}

function report(state: GameState, kind: LogEntry['kind'], text: string): void {
  state.arrivalReports.push(log(state, currentIndex(state), kind, text));
}

function need(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new ActionError(msg);
}

function posInt(n: number, what: string): number {
  need(Number.isFinite(n) && n > 0, `${what} must be positive`);
  return Math.floor(n);
}

/** cash -> savings -> forced Union loan, with a note when the Union had to step in. */
function forcePay(state: GameState, co: CompanyState, amount: number, why: string): void {
  const short = amount - co.cash - co.bank;
  subtractCash(co, amount);
  if (short > 0) {
    log(
      state,
      state.companies.indexOf(co),
      'warn',
      `Short of cash for ${why}: the Trader's Union lent you ${fmt(short)} kubars.`,
    );
  }
}

/* --------------------------------------------------------------- main */

/** Apply one action. Returns a NEW state; the input is never mutated. Throws ActionError if illegal. */
export function applyAction(input: GameState, action: Action): GameState {
  const state = structuredClone(input);
  const r = new Rng(state.rng);
  try {
    dispatch(state, action, r);
  } finally {
    state.rng = r.state;
  }
  return state;
}

function dispatch(state: GameState, a: Action, r: Rng): void {
  if (a.type === 'continueCompetition' || a.type === 'retireCompetition')
    return resolveWinningChoice(state, a.type);
  need(state.phase !== 'gameOver', 'game is over');
  if (a.type === 'continue') return doContinue(state, r);
  if (a.type === 'eventChoice') return doEventChoice(state, a.choice, a.amount, r);
  need(state.phase === 'onPlanet', `cannot ${a.type} now (${state.phase})`);
  need(!state.pending, 'answer the open dialog first');
  const co = currentCompany(state);
  const p = state.planets[co.planet]!;
  const pi = co.planet;

  switch (a.type) {
    /* ---- marketplace ---- */
    case 'buy': {
      const tons = posInt(a.tons, 'tons');
      need(state.commodities.includes(a.commodity), 'unknown commodity');
      const price = p.price[a.commodity]!;
      need(co.cash >= price, 'not enough cash for even one ton');
      need(cargoTons(co) < co.ship.cargo, 'the cargo bay is full');
      const stock = p.stock[a.commodity] ?? 0;
      need(stock > 0, 'none for sale here');
      need(tons <= stock, 'not that many tons on the planet');
      need(cargoTons(co) + tons <= co.ship.cargo, 'not enough room in the cargo bay');
      need(tons * price <= co.cash + co.bank, 'not enough money');
      addLot(co.cargo, a.commodity, tons, price);
      subtractCash(co, tons * price);
      p.stock[a.commodity] = stock - tons;
      return;
    }
    case 'sell': {
      const tons = posInt(a.tons, 'tons');
      const lot = co.cargo[a.commodity];
      need(lot && lot.tons >= tons, 'you do not have that many tons');
      const price = p.price[a.commodity]!;
      // The market price is fixed for the whole week, so selling back what you just bought is
      // a full refund — no separate bookkeeping needed.
      state.sellingProfit += Math.floor((price - lot!.paid) * tons);
      co.visitProfit += Math.floor((price - lot!.paid) * tons);
      co.cash += Math.floor(price * tons);
      p.stock[a.commodity] = (p.stock[a.commodity] ?? 0) + tons;
      removeLot(co.cargo, a.commodity, tons);
      return;
    }
    /* ---- warehouse ---- */
    case 'store': {
      const tons = posInt(a.tons, 'tons');
      const lot = co.cargo[a.commodity];
      need(lot && lot.tons >= tons, 'you do not have that many tons on the ship');
      need(warehouseTons(co, pi) + tons <= co.warehouseSpace, 'the warehouse is full');
      co.warehouse[pi] ??= {};
      addLot(co.warehouse[pi]!, a.commodity, tons, lot!.paid);
      removeLot(co.cargo, a.commodity, tons);
      return;
    }
    case 'retrieve': {
      const tons = posInt(a.tons, 'tons');
      const wh = co.warehouse[pi]?.[a.commodity];
      need(wh && wh.tons >= tons, 'not that many tons in the warehouse');
      need(cargoTons(co) + tons <= co.ship.cargo, 'not enough room in the cargo bay');
      addLot(co.cargo, a.commodity, tons, wh!.paid);
      removeLot(co.warehouse[pi]!, a.commodity, tons);
      return;
    }
    /* ---- passengers ---- */
    case 'setTicketPrice':
      need(Number.isFinite(a.price), 'bad price');
      need(a.price >= ECON.ticketMin, `the minimum fare is ${ECON.ticketMin} kubars`);
      co.ticketPrice = Math.floor(a.price);
      return;
    case 'pickupPassengers': {
      need(!co.paxPickedUp, 'you have already taken on passengers here');
      need(co.paxWaiting > 0, 'nobody is waiting for a ticket');
      co.paxPickedUp = true;
      co.passengers = co.paxWaiting;
      const income = co.paxPrice * co.passengers;
      co.cash += income;
      co.taxOwedPassenger += Math.floor((income * state.econ.passTax) / 100);
      return;
    }
    /* ---- advertising ---- */
    case 'advertise': {
      const tp = Math.floor(a.passenger);
      const tc = Math.floor(a.commodity);
      need(
        tp >= 0 && tp < ECON.adTiers.length && tc >= 0 && tc < ECON.adTiers.length,
        'bad ad tier',
      );
      const fixP = adCost(tp, co);
      const fixC = adCost(tc, co);
      need(
        co.cash + co.advertInvestedP + co.advertInvestedC >= fixP + fixC,
        'not enough cash for that campaign',
      );
      co.cash += co.advertInvestedP + co.advertInvestedC; // refund this week's earlier placement
      co.adPassenger = tp;
      co.adCommodity = tc;
      co.advertInvestedP = fixP;
      co.advertInvestedC = fixC;
      co.advertP = Math.floor(co.advertInvestedP / 125);
      co.cash -= fixP + fixC;
      return;
    }
    /* ---- crew & taxes ---- */
    case 'payCrew':
      need(co.wagesOwed > 0, 'nothing owed');
      need(co.wagesOwed <= co.cash, 'not enough cash');
      co.cash -= co.wagesOwed;
      co.wagesOwed = 0;
      return;
    case 'payTaxes': {
      const due = co.taxOwedPassenger + co.taxOwedTariff;
      need(due > 0, 'nothing owed');
      need(due <= co.cash, 'not enough cash');
      co.cash -= due;
      co.taxOwedPassenger = 0;
      co.taxOwedTariff = 0;
      return;
    }
    /* ---- insurance ---- */
    case 'buyInsurance':
      need(!co.insured, 'already insured for this trip');
      need(co.insuranceCost <= co.cash, 'not enough cash');
      co.cash -= co.insuranceCost;
      co.insured = true;
      return;
    /* ---- bank & loans ---- */
    case 'bankDeposit': {
      const amt = posInt(a.amount, 'amount');
      need(amt <= co.cash, 'not enough cash');
      co.cash -= amt;
      co.bank += amt;
      return;
    }
    case 'bankWithdraw': {
      const amt = posInt(a.amount, 'amount');
      need(amt <= co.bank, 'not enough in the bank');
      co.bank -= amt;
      co.cash += amt;
      return;
    }
    case 'unionBorrow': {
      const amt = posInt(a.amount, 'amount');
      need(co.unionLoan + amt <= co.unionLimit, 'that would exceed your credit limit');
      co.unionLoan += amt;
      co.cash += amt;
      return;
    }
    case 'unionRepay': {
      const amt = Math.min(posInt(a.amount, 'amount'), co.unionLoan);
      need(amt <= co.cash, 'not enough cash');
      co.cash -= amt;
      co.unionLoan -= amt;
      return;
    }
    case 'zinnRepay': {
      const amt = Math.min(posInt(a.amount, 'amount'), co.zinnLoan);
      need(amt <= co.cash, 'not enough cash');
      co.cash -= amt;
      co.zinnLoan -= amt;
      return;
    }
    /* ---- fuel ---- */
    case 'buyFuel': {
      const tons = posInt(a.tons, 'tons');
      const room = co.ship.fuelCap - co.ship.fuel;
      need(room > 0, 'the tank is full');
      need(tons <= room, 'that is more than the tank holds');
      const cost = Math.floor(tons * p.fuelPrice);
      need(cost <= co.cash, 'not enough cash');
      co.cash -= cost;
      co.ship.fuel = Math.floor(co.ship.fuel + tons);
      return;
    }
    /* ---- stock exchange ---- */
    case 'stockBuy': {
      const n = posInt(a.shares, 'shares');
      need(!p.exchange.crashed, 'the exchange has crashed');
      need(!co.stockBoughtThisWeek, 'only one purchase per turn is allowed');
      const price = p.exchange.price;
      need(price > 0, 'no shares are trading');
      const maxShares = Math.floor((0.5 * (co.cash + co.bank)) / price);
      need(maxShares >= 1, 'you cannot afford a single share');
      need(n <= maxShares, 'you may invest at most half of your money each week');
      co.stockBoughtThisWeek = true;
      subtractCash(co, price * n);
      addLot(co.shares as Record<number, { tons: number; paid: number }>, pi, n, price);
      subtractCash(co, Math.floor((ECON.brokerFee * price * n) / 100));
      return;
    }
    case 'stockSell': {
      const n = posInt(a.shares, 'shares');
      need(!p.exchange.crashed, 'the exchange has crashed');
      const lot = co.shares[pi];
      need(lot && lot.tons >= n, 'you do not own that many shares');
      const price = p.exchange.price;
      co.cash += Math.floor(n * price);
      subtractCash(co, Math.floor((ECON.brokerFee * n * price) / 100));
      lot!.tons -= n;
      if (lot!.tons === 0) delete co.shares[pi];
      return;
    }
    case 'special':
      return startSpecial(state, co, currentIndex(state), r);
    case 'journey':
      need(Number.isInteger(a.to) && a.to >= 0 && a.to < state.planets.length, 'bad destination');
      need(a.to !== co.planet, 'you are already there');
      return startJourney(state, co, a.to, r);
    default:
      throw new ActionError(`unknown action ${(a as Action).type}`);
  }
}

/* --------------------------------------------------------- lot helpers */

function addLot<K extends PropertyKey>(
  map: Partial<Record<K, { tons: number; paid: number }>>,
  k: K,
  tons: number,
  price: number,
): void {
  const lot = map[k];
  if (!lot) {
    map[k] = { tons, paid: price };
  } else {
    lot.paid = Math.floor((lot.tons * lot.paid + tons * price) / (lot.tons + tons));
    lot.tons += tons;
  }
}

function removeLot<K extends PropertyKey>(
  map: Partial<Record<K, { tons: number; paid: number }>>,
  k: K,
  tons: number,
): void {
  const lot = map[k]!;
  lot.tons -= tons;
  if (lot.tons <= 0) delete map[k];
}

/* -------------------------------------------------------------- journey */

/**
 * Picking a destination: first the credit gate — over either limit you must either
 * turn back or declare bankruptcy — then the week's sealed auction bid, then the flight.
 */
function startJourney(state: GameState, co: CompanyState, to: number, r: Rng): void {
  if (co.zinnLoan > co.zinnLimit) {
    state.pending = {
      id: 'gate:zinn',
      title: 'Mr. Zinn Is Waiting',
      text: `You owe Mr. Zinn ${fmt(co.zinnLoan)} kubars — past your ${fmt(co.zinnLimit)} limit. He will not let your ship leave until you are back inside it. Return to the main menu and put your house in order, or declare bankruptcy?`,
      choices: [
        { id: 'yes', label: 'Back to the menu' },
        { id: 'no', label: 'Declare bankruptcy' },
      ],
      portrait: 'zinn',
      mood: 'bad',
      context: 'planet',
      data: { to },
    };
    return;
  }
  if (co.unionLoan > co.unionLimit) {
    state.pending = {
      id: 'gate:union',
      title: "The Trader's Union Objects",
      text: `Your Union loan stands at ${fmt(co.unionLoan)} kubars, past your ${fmt(co.unionLimit)} credit limit. Return to the main menu and settle it, or declare bankruptcy?`,
      choices: [
        { id: 'yes', label: 'Back to the menu' },
        { id: 'no', label: 'Declare bankruptcy' },
      ],
      portrait: 'union',
      mood: 'bad',
      context: 'planet',
      data: { to },
    };
    return;
  }
  const a = state.auction;
  const ci = currentIndex(state);
  if (a && !a.responded.includes(ci)) {
    const presets = a.kind === 'ship' ? [10000, 25000, 50000] : [5 * a.fee, 15 * a.fee, 30 * a.fee];
    state.pending = {
      id: 'auction:bid',
      title: a.kind === 'ship' ? 'Ship Auction' : 'Facility Auction',
      text:
        a.kind === 'ship'
          ? `Before you set course: the Traders' Union is auctioning a 200-ton enlargement of your ship to the highest secret bid. Suggested bids: ${presets.map(fmt).join(', ')}. Other players: eyes closed!`
          : `Before you set course: Emperor Dred is privatising a government facility. Its owner charges every rival ${fmt(a.fee)} kubars each time they land there. Suggested bids: ${presets.map(fmt).join(', ')}. Other players: eyes closed!`,
      choices: [
        { id: 'bid', label: 'Place bid' },
        { id: 'no', label: 'No bid' },
      ],
      input: { label: 'Your secret bid (kubars)', min: 0, max: 1e11, initial: 0 },
      portrait: 'dred',
      mood: 'neutral',
      context: 'planet',
      data: { to },
    };
    return;
  }
  depart(state, co, to, r);
}

/**
 * Departure pipeline part one: bookkeeping, interest, wages, then the
 * in-flight event chain — which may pause for a dialog and resume in `finishDeparture`.
 */
function depart(state: GameState, co: CompanyState, to: number, r: Rng): void {
  const ci = currentIndex(state);
  const from = co.planet;
  state.destination = to;
  state.arrivalReports = [];
  state.phase = 'travel';
  state.travel = {
    from,
    to,
    good: true,
    cursor: 0,
    fired: false,
    delays: 0,
    badExclusiveDone: false,
    block4447: false,
    badChainForced: false,
  };

  // state 1 — departure bookkeeping
  co.random = r.fint(1, 100);
  const destPlanet = state.planets[to]!;
  destPlanet.advertC += Math.floor(co.advertInvestedC / 50);
  if (co.ship.cargo > 100) destPlanet.advertC += co.ship.cargo - 100;
  state.sellingProfit = 0;
  co.specialUsed = false;
  co.loanInterest = Math.floor((co.unionLoan * co.loanRate) / 100);
  co.unionLoan += co.loanInterest;
  co.savingsInterest = Math.floor((co.bank * co.savingsRate) / 100);
  co.bank += co.savingsInterest;
  co.zinnInterest = Math.floor((co.zinnLoan * co.zinnRate) / 100);
  co.zinnLoan += co.zinnInterest;
  co.wagesOwed += co.crewSalary * co.ship.crew;

  if (state.week > 3 && beginEventRoll(state, co, ci, r)) return; // wait for the dialog
  finishDeparture(state, co, r);
}

/**
 * Departure pipeline part two: the streak rule, fuel, crew strike,
 * running dry, the tax audit, export tariff, next trip's premium and passengers.
 */
function finishDeparture(state: GameState, co: CompanyState, r: Rng): void {
  const ci = currentIndex(state);
  const tc = state.travel!;
  const from = tc.from;
  const to = state.destination!;
  const dist = distanceBetween(state, from, to);

  // state 3 — luck bookkeeping, fuel burn, crew strike
  endChainStreak(state, co);
  applyEventGoodFloor(state, co);

  co.ship.fuel -= fuelUsage(dist, co.ship.tons, r);

  if (co.wagesOwed >= co.ship.crew * co.crewSalary * 5 && r.fint(1, 3) === 1) {
    const owed = co.wagesOwed;
    forcePay(state, co, owed, 'the crew strike settlement');
    co.wagesOwed = 0;
    co.crewSalary += 500;
    badChainStreak(co);
    report(
      state,
      'bad',
      `Your crew downed tools mid-flight. You paid all ${fmt(owed)} kubars owed on the spot, and their salary is now ${fmt(co.crewSalary)} each.`,
    );
  }

  // states 4/5 — out of fuel
  if (co.ship.fuel < 0) {
    const cost = co.ship.fuelCap * state.econ.fuelPriceRange * 10 + 10000;
    forcePay(state, co, cost, 'the emergency tanker');
    co.ship.fuel = co.ship.fuelCap;
    co.travelDelayed += 1;
    badChainStreak(co);
    report(
      state,
      'bad',
      `You ran dry between planets. An emergency tanker filled your tank and charged ${fmt(cost)} kubars for the privilege. You are running late.`,
    );
  }

  // state 6 — tax audit
  const owed = co.taxOwedPassenger + co.taxOwedTariff;
  if (owed >= 35 * co.ship.tons && r.fint(1, 3) === 1) {
    const bill = 3 * owed;
    forcePay(state, co, bill, 'the tax audit');
    co.taxOwedPassenger = 0;
    co.taxOwedTariff = 0;
    badChainStreak(co);
    report(
      state,
      'bad',
      `The Imperial Tax Auditor boarded you in transit: ${fmt(owed)} kubars of arrears plus twice that in fines — ${fmt(bill)} kubars in all.`,
    );
  }

  // state 7 — exit
  const exportTax = Math.floor(
    (cargoMarketValue(co, state.planets[from]!) * state.econ.exportTariff) / 100,
  );
  if (exportTax > 0) co.taxOwedTariff += exportTax;
  co.insuranceCost = rollInsuranceCost(co, r);
  computePassengers(co, r);
  co.insured = false;
  co.advertInvestedP = 0;
  co.advertInvestedC = 0;
  co.advertP = 0;
  co.passengers = 0;
  co.visitProfit = 0;

  co.lastTravelTime = humanTravelTime(dist, co.ship.kuarps, co.travelDelayed);
  co.travelDelayed = 1;
  co.planetLast = from;
  co.planet = to;
  co.arrivalPending = true;
  state.destination = null;
  state.travel = null;

  const pname = PLANET_BY_ID[state.planets[to]!.id].name;
  report(state, 'info', `Course set for ${pname}.`);
  log(state, ci, 'info', `${co.name} left ${PLANET_BY_ID[state.planets[from]!.id].name}.`);
  state.awaitingHandoff = true;
  state.phase = 'arrival';
}

/* --------------------------------------------------------------- events */

function doEventChoice(state: GameState, choice: string, amount: number | undefined, r: Rng): void {
  need(state.pending, 'no event pending');
  const ev = state.pending!;
  const valid = ev.choices.length === 0 ? choice === 'ok' : ev.choices.some((c) => c.id === choice);
  need(valid, 'invalid choice');
  const data = ev.data ?? {};
  state.pending = null;
  const co = currentCompany(state);
  const ci = currentIndex(state);

  // the credit gate and the auction bid both sit in front of a journey
  if (ev.id === 'gate:zinn' || ev.id === 'gate:union') {
    if (choice === 'yes') return; // back to the main menu
    return declareBankrupt(state, co, ci);
  }
  if (ev.id === 'auction:bid') {
    if (choice === 'bid') recordBid(state, ci, amount ?? 0);
    else state.auction?.responded.push(ci);
    return startJourney(state, co, data.to as number, r);
  }
  if (ev.context === 'planet') {
    resolveSpecialChoice(state, co, ci, ev.id, choice, data, r, amount);
    return;
  }
  need(state.phase === 'event', 'no travel event pending');
  state.phase = 'travel';
  if (resolveTravelEvent(state, co, ci, ev.id, choice, data, r)) return; // another event fired
  finishDeparture(state, co, r);
}

/* ------------------------------------------------------ turns and weeks */

function doContinue(state: GameState, r: Rng): void {
  need(state.phase === 'arrival', 'nothing to continue from');
  state.arrivalReports = [];
  if (state.awaitingHandoff) {
    state.awaitingHandoff = false;
    return advanceTurn(state, r);
  }
  state.phase = 'onPlanet'; // the reports were this company's arrival; its turn begins now
}

function advanceTurn(state: GameState, r: Rng): void {
  state.turnIndex++;
  while (
    state.turnIndex < state.order.length &&
    state.companies[state.order[state.turnIndex]!]!.bankrupt
  ) {
    state.turnIndex++;
  }
  if (state.turnIndex >= state.order.length) endWeek(state, r);
  else enterTurn(state);
}

/**
 * A human's turn begins: crashed exchanges wipe holdings, last week's auction
 * is announced, and — if they flew in — the arrival charges land before the main menu opens.
 */
function enterTurn(state: GameState): void {
  const ci = currentIndex(state);
  const co = state.companies[ci];
  if (!co) return;
  state.arrivalReports = [];
  co.stockBoughtThisWeek = false;

  // crashed exchanges wipe every holding (the first human to look also wipes the rivals')
  const firstHuman =
    state.order.findIndex((i) => !state.companies[i]!.bankrupt) === state.turnIndex;
  state.planets.forEach((p, i) => {
    if (!p.exchange.crashed) return;
    if (co.shares[i]) {
      delete co.shares[i];
      report(
        state,
        'bad',
        `${PLANET_BY_ID[p.id].exchange} has crashed. Your shares in it are worthless.`,
      );
    }
    if (firstHuman) {
      for (const other of state.companies) if (other.isAI) delete other.shares[i];
    }
  });

  if (co.sabotageDamage !== 0) {
    const amount = Math.abs(co.sabotageDamage);
    const loaned = co.sabotageDamage < 0;
    report(
      state,
      'bad',
      `Sabotage! Someone arranged a series of accidents for your company: ${fmt(amount)} kubars of damage.${loaned ? " The Trader's Union covered what you could not." : ''}`,
    );
    co.sabotageDamage = 0;
  }

  const auctionNews = auctionReportFor(state, ci);
  if (auctionNews) report(state, 'info', auctionNews);

  if (co.arrivalPending) {
    co.arrivalPending = false;
    arriveOnPlanet(state, co, ci);
  }
  if (co.inbox.length) {
    state.arrivalReports.push(...co.inbox);
    co.inbox = [];
  }
  state.awaitingHandoff = false;
  state.phase = state.arrivalReports.length ? 'arrival' : 'onPlanet';
}

/**
 * Who was already standing here when you landed. Rivals move inside the week rollover and
 * humans fly in turn order, so anyone reported here reached the market ahead of you.
 */
function reportNeighbours(state: GameState, co: CompanyState, ci: number): void {
  const here = co.planet;
  const pname = PLANET_BY_ID[state.planets[here]!.id].name;
  let n = 0;
  for (let oi = 0; oi < state.companies.length; oi++) {
    const other = state.companies[oi]!;
    if (oi === ci || other.bankrupt) continue;
    if (companyLocation(state, oi) !== here || !hasFlownThisWeek(state, oi)) continue;
    if (other.isAI) {
      const taunt = RIVAL_TAUNTS[(co.random + n) % RIVAL_TAUNTS.length]!;
      const hold =
        other.aiTag && other.aiCargo > 0
          ? `, holds full of ${fmt(other.aiCargo)} tons of ${COMMODITY_BY_ID[other.aiTag].name}`
          : ', holds empty';
      report(state, 'info', `${other.name} is already parked on ${pname}${hold}. ${taunt}`);
    } else {
      report(
        state,
        'warn',
        `${other.name} touched down on ${pname} before you and has already had the pick of the market.`,
      );
    }
    n++;
  }
}

/** Arrival charges: import tariff, then facility fees paid and collected. */
function arriveOnPlanet(state: GameState, co: CompanyState, ci: number): void {
  const p = state.planets[co.planet]!;
  const pname = PLANET_BY_ID[p.id].name;
  report(state, 'info', `You touch down on ${pname}.`);
  reportNeighbours(state, co, ci);

  // import tariff — only assessed if you already owe something (a quirk of the original)
  if (co.taxOwedPassenger + co.taxOwedTariff !== 0) {
    const tax = Math.floor((cargoMarketValue(co, p) * state.econ.importTariff) / 100);
    if (tax > 0) {
      co.taxOwedTariff += tax;
      report(state, 'info', `Import tariff of ${fmt(tax)} kubars assessed on your cargo.`);
    }
  }
  for (const f of p.facilities) {
    if (f.owner === ci) {
      if (f.revenue > 0) {
        co.cash += f.revenue;
        report(
          state,
          'good',
          `Your ${f.name} here has collected ${fmt(f.revenue)} kubars in landing fees.`,
        );
        f.revenue = 0;
      }
    } else if (f.owner >= 0) {
      forcePay(state, co, f.fee, `the ${f.name} landing fee`);
      f.revenue += f.fee;
      report(
        state,
        'bad',
        `${state.companies[f.owner]!.name} charged you ${fmt(f.fee)} kubars to land at the ${f.name}.`,
      );
    }
  }
}

/** Bankruptcy is only ever declared by the player at the credit gate. */
function declareBankrupt(state: GameState, co: CompanyState, ci: number): void {
  co.bankrupt = true;
  for (const p of state.planets) {
    for (const f of p.facilities) {
      if (f.owner === ci) {
        f.owner = -1;
        f.revenue = 0;
      }
    }
  }
  log(state, -1, 'news', `${co.name} has declared bankruptcy and left the trade routes.`);
  const humansLeft = state.companies.filter((c) => !c.isAI && !c.bankrupt);
  if (humansLeft.length === 0) {
    state.phase = 'gameOver';
    state.winner = null;
    return;
  }
  co.arrivalPending = false;
  state.awaitingHandoff = true;
  state.phase = 'arrival';
  state.arrivalReports = [
    log(state, ci, 'bad', "Your company is bankrupt. The Trader's Union has seized your ship."),
  ];
}

/* ------------------------------------------------------------ week rollover */

/** The week rolls over once every human has moved. */
function endWeek(state: GameState, r: Rng): void {
  state.week++;

  runOpponents(state, r); // the six rivals act in one batch first
  stepStockMarket(state, r); // (1)
  rollNewsEvent(state, r); // (2)
  rollWeather(state, r); // (3)
  moveOpponents(state, r); // (4) rivals pick a destination; human order rebuilt below
  if (state.week > 2) runAuctionWeek(state, r); // (5)
  economicChange(state, r); // (6)
  commodityAvailable(state, r); // (7)
  commodityPrice(state); // (8)
  rollFuelPrices(state, r); // (9)
  if (state.week > 4) gameEvents(state, r); // (10)
  if (state.week > 4) opponentEvents(state, r); // (11)

  for (const co of state.companies) {
    // (12) + (13): net worth is only recomputed here, and history is a 21-week ring.
    // A bankrupt company records a flat 0, not the -10,000,000,000 the win check uses to
    // rank it last — that sentinel in the history would flatten every chart drawn from it.
    co.netWorthHistory.push(co.bankrupt ? 0 : netWorth(state, co));
    if (co.netWorthHistory.length > 21) co.netWorthHistory.shift();
  }

  if (checkWinner(state)) return; // (14)

  state.order = nextTurnOrder(state);
  state.turnIndex = 0;
  if (state.order.length === 0) {
    state.phase = 'gameOver';
    return;
  }
  enterTurn(state);
}

/** Humans race each other by travel time; rivals run inside the rollover. */
function nextTurnOrder(state: GameState): number[] {
  const humans = state.companies
    .map((c, i) => [c, i] as const)
    .filter(([c]) => !c.isAI && !c.bankrupt)
    .map(([, i]) => i);
  return humans.sort(
    (a, b) => state.companies[a]!.lastTravelTime - state.companies[b]!.lastTravelTime,
  );
}

/**
 * Win check: strictly above the current goal, humans winning ties against rivals.
 * A winner may raise the stakes and keep playing.
 */
function checkWinner(state: GameState): boolean {
  const goal = state.settings.targetNetWorth;
  const rivals = state.companies
    .map((c, i) => [c, i] as const)
    .filter(([c]) => c.isAI)
    .sort((a, b) => netWorth(state, b[0]) - netWorth(state, a[0]));
  const humans = state.companies
    .map((c, i) => [c, i] as const)
    .filter(([c]) => !c.isAI && !c.bankrupt)
    .sort((a, b) => netWorth(state, b[0]) - netWorth(state, a[0]));

  const bestHuman = humans[0];
  const bestRival = rivals[0];
  let winner: number | null = null;
  if (
    bestHuman &&
    netWorth(state, bestHuman[0]) >= (bestRival ? netWorth(state, bestRival[0]) : -Infinity) &&
    netWorth(state, bestHuman[0]) > goal
  ) {
    winner = bestHuman[1];
  } else if (bestRival && netWorth(state, bestRival[0]) > goal) {
    winner = bestRival[1];
  }
  if (winner === null) return false;
  state.winner = winner;
  state.phase = humans.length ? 'winner' : 'gameOver';
  log(
    state,
    -1,
    'news',
    `${state.companies[winner]!.name} has passed ${fmt(goal)} kubars and won the competition.`,
  );
  return true;
}

function resolveWinningChoice(
  state: GameState,
  action: 'continueCompetition' | 'retireCompetition',
): void {
  need(state.phase === 'winner', 'there is no winning decision to make');
  if (action === 'retireCompetition') {
    state.phase = 'gameOver';
    return;
  }
  state.settings.targetNetWorth = nextWinningPoint(
    state.settings.ruleset,
    state.settings.targetNetWorth,
  );
  state.winner = null;
  state.order = nextTurnOrder(state);
  state.turnIndex = 0;
  if (state.order.length === 0) {
    state.phase = 'gameOver';
    return;
  }
  enterTurn(state);
}

/* --------------------------------------------------------------- queries */

/** Tons of `c` the company could buy here right now. */
export function maxBuyable(state: GameState, co: CompanyState, c: CommodityId): number {
  const p = state.planets[co.planet]!;
  const price = p.price[c] ?? 0;
  if (price <= 0) return 0;
  const room = co.ship.cargo - cargoTons(co);
  return Math.max(0, Math.min(p.stock[c] ?? 0, room, Math.floor(co.cash / price)));
}

export function taxOwed(co: CompanyState): number {
  return co.taxOwedPassenger + co.taxOwedTariff;
}

/** The tax screen turns red at this point, and an audit becomes possible. */
export function taxIsDangerous(co: CompanyState): boolean {
  return taxOwed(co) >= 35 * co.ship.tons;
}

export function commodityName(c: CommodityId): string {
  return COMMODITY_BY_ID[c].name;
}

export function levelOf(state: GameState) {
  return LEVEL_BY_ID(state.settings.level);
}

export type { Phase };
