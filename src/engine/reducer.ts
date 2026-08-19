import { COMMODITY_BY_ID } from './data/commodities';
import { ECON, LEVEL_BY_ID } from './data/levels';
import { PLANET_BY_ID } from './data/planets';
import {
  adSpend,
  cargoTons,
  cargoValue,
  distanceBetween,
  fuelUsage,
  insurancePremium,
  netWorth,
  nudgeSupply,
  passengersWaiting,
  priceForSupply,
  refreshPlanetPrices,
  rollPassengerDemand,
  shipTons,
  stockForSupply,
  travelTime,
  warehouseTons,
} from './economy';
import { Rng } from './rng';
import { resolveEventChoice, rollTravelEvents } from './events';
import { resolveSpecialChoice, startSpecial } from './specials';
import { maybeStartAuction, promptBid, recordBid, settleAuction } from './auctions';
import { nextWinningPoint } from './rulesets';
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

export function currentCompany(state: GameState): CompanyState {
  const co = state.companies[currentIndex(state)];
  if (!co) throw new ActionError('no current company');
  return co;
}

function log(state: GameState, company: number, kind: LogEntry['kind'], text: string): LogEntry {
  const e: LogEntry = { week: state.week, company, kind, text };
  state.log.push(e);
  if (state.log.length > 400) state.log.splice(0, state.log.length - 400);
  return e;
}

function report(state: GameState, kind: LogEntry['kind'], text: string): void {
  state.arrivalReports.push(log(state, currentIndex(state), kind, text));
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

function need(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new ActionError(msg);
}

function posInt(n: number, what: string): number {
  need(Number.isFinite(n) && n > 0, `${what} must be positive`);
  return Math.floor(n);
}

/** Take money; if cash is short, the Trader's Union auto-lends the difference (mandatory costs only). */
function forcePay(state: GameState, co: CompanyState, amount: number, why: string): void {
  co.cash -= amount;
  if (co.cash < 0) {
    const short = -co.cash;
    co.unionLoan += short;
    co.cash = 0;
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
    case 'buy': {
      const tons = posInt(a.tons, 'tons');
      need(state.commodities.includes(a.commodity), 'unknown commodity');
      const stock = p.stock[a.commodity] ?? 0;
      need(tons <= stock, 'not that many tons on the planet');
      need(cargoTons(co) + tons <= co.ship.cargo, 'not enough room in the cargo bay');
      const price = p.price[a.commodity]!;
      const cost = tons * price;
      need(cost <= co.cash, 'not enough cash');
      co.cash -= cost;
      addLot(co.cargo, a.commodity, tons, price);
      addLot(co.visitBought, a.commodity, tons, price);
      p.stock[a.commodity] = stock - tons;
      nudgeSupply(p, a.commodity, tons);
      p.price[a.commodity] = priceForSupply(
        a.commodity,
        p.supply[a.commodity]!,
        LEVEL_BY_ID(state.settings.level).squeeze,
      );
      return;
    }
    case 'sell': {
      const tons = posInt(a.tons, 'tons');
      const lot = co.cargo[a.commodity];
      need(lot && lot.tons >= tons, 'you do not have that many tons');
      // full refund for tons bought during this visit
      const vb = co.visitBought[a.commodity];
      const refundTons = Math.min(tons, vb?.tons ?? 0);
      const marketTons = tons - refundTons;
      let revenue = 0;
      if (refundTons > 0) {
        revenue += refundTons * vb!.paid;
        vb!.tons -= refundTons;
        if (vb!.tons === 0) delete co.visitBought[a.commodity];
        nudgeSupply(p, a.commodity, -refundTons);
      }
      if (marketTons > 0) {
        revenue += marketTons * p.price[a.commodity]!;
        nudgeSupply(p, a.commodity, -marketTons);
        co.visitProfit += marketTons * (p.price[a.commodity]! - lot!.paid);
      }
      co.cash += revenue;
      p.stock[a.commodity] = (p.stock[a.commodity] ?? 0) + tons;
      p.price[a.commodity] = priceForSupply(
        a.commodity,
        p.supply[a.commodity]!,
        LEVEL_BY_ID(state.settings.level).squeeze,
      );
      removeLot(co.cargo, a.commodity, tons);
      return;
    }
    case 'store': {
      const tons = posInt(a.tons, 'tons');
      const lot = co.cargo[a.commodity];
      need(lot && lot.tons >= tons, 'you do not have that many tons on the ship');
      need(warehouseTons(co, pi) + tons <= (co.warehouseCap[pi] ?? 0), 'warehouse is full');
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
    case 'setTicketPrice':
      need(Number.isFinite(a.price), 'bad price');
      co.ticketPrice = Math.round(Math.min(ECON.ticketMax, Math.max(ECON.ticketMin, a.price)));
      return;
    case 'pickupPassengers':
      co.passengers = passengersWaiting(co);
      return;
    case 'advertise': {
      const tp = Math.floor(a.passenger);
      const tc = Math.floor(a.commodity);
      need(
        tp >= 0 && tp < ECON.adTiers.length && tc >= 0 && tc < ECON.adTiers.length,
        'bad ad tier',
      );
      const cost =
        adSpend(tp, co) +
        adSpend(tc, co) -
        adSpend(co.adPassenger, co) -
        adSpend(co.adCommodity, co);
      need(cost <= co.cash, 'not enough cash');
      co.cash -= cost;
      co.adPassenger = tp;
      co.adCommodity = tc;
      return;
    }
    case 'payCrew':
      need(co.wagesOwed > 0, 'nothing owed');
      need(co.wagesOwed <= co.cash, 'not enough cash');
      co.cash -= co.wagesOwed;
      co.wagesOwed = 0;
      co.onStrike = false;
      return;
    case 'payTaxes': {
      const due = co.taxOwedPassenger + co.taxOwedTariff;
      need(due > 0, 'nothing owed');
      need(due <= co.cash, 'not enough cash');
      co.cash -= due;
      co.taxOwedPassenger = 0;
      co.taxOwedTariff = 0;
      co.weeksTaxUnpaid = 0;
      return;
    }
    case 'buyInsurance':
      need(!co.insured, 'already insured for this trip');
      need(co.insurancePremium <= co.cash, 'not enough cash');
      co.cash -= co.insurancePremium;
      co.insured = true;
      return;
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
    case 'buyFuel': {
      const tons = Math.min(posInt(a.tons, 'tons'), co.ship.fuelCap - co.ship.fuel);
      need(tons > 0, 'tank is full');
      const cost = Math.round(tons * p.fuelPrice * (1 - co.mods.fuelDiscount));
      need(cost <= co.cash, 'not enough cash');
      co.cash -= cost;
      co.ship.fuel += tons;
      co.mods.fuelDiscount = 0;
      return;
    }
    case 'stockBuy': {
      const n = posInt(a.shares, 'shares');
      need(p.exchange.closedFor === 0, 'the exchange is closed');
      need(!co.stockBoughtThisWeek, 'only one purchase per week allowed');
      const cost = n * p.exchange.price;
      const total = Math.round(cost * (1 + ECON.brokerFee));
      need(
        total <= co.cash * ECON.stockWeeklyCashCap + 0.5,
        'you may invest at most 50% of your cash per week',
      );
      co.cash -= total;
      addLot(co.shares as Record<number, { tons: number; paid: number }>, pi, n, p.exchange.price);
      co.stockBoughtThisWeek = true;
      return;
    }
    case 'stockSell': {
      const n = posInt(a.shares, 'shares');
      const lot = co.shares[pi];
      need(lot && lot.tons >= n, 'you do not own that many shares');
      need(p.exchange.closedFor === 0, 'the exchange is closed');
      co.cash += Math.round(n * p.exchange.price * (1 - ECON.brokerFee));
      lot!.tons -= n;
      if (lot!.tons === 0) delete co.shares[pi];
      return;
    }
    case 'special':
      return startSpecial(state, co, currentIndex(state), r);
    case 'journey':
      need(Number.isInteger(a.to) && a.to >= 0 && a.to < state.planets.length, 'bad destination');
      need(a.to !== co.planet, 'you are already there');
      return doJourney(state, co, a.to, r);
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
    lot.paid = Math.round(((lot.tons * lot.paid + tons * price) / (lot.tons + tons)) * 100) / 100;
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

function doJourney(state: GameState, co: CompanyState, to: number, r: Rng): void {
  const ci = currentIndex(state);
  const from = co.planet;
  const dist = distanceBetween(state, from, to);
  state.destination = to;
  state.arrivalReports = [];
  state.phase = 'travel';

  // --- leaving: export tariff, weekly accruals ---
  const exportTax = Math.round(cargoValue(co) * state.econ.exportTariff);
  if (exportTax > 0) co.taxOwedTariff += exportTax;
  co.bank = Math.round(co.bank * (1 + co.bankRate));
  co.unionLoan = Math.round(co.unionLoan * (1 + co.unionRate));
  co.zinnLoan = Math.round(co.zinnLoan * (1 + co.zinnRate));
  co.wagesOwed += co.ship.crew * co.crewSalary;
  if (co.taxOwedPassenger + co.taxOwedTariff > 0) co.weeksTaxUnpaid++;
  else co.weeksTaxUnpaid = 0;
  co.visitProfit = 0;
  co.visitBought = {};
  co.mods.fuelDiscount = 0;
  if (co.mods.blessedWeeks > 0 && --co.mods.blessedWeeks === 0) co.luck = 0.5;

  // --- fuel ---
  const used = fuelUsage(dist, shipTons(co), r);
  if (used > co.ship.fuel) {
    const short = used - co.ship.fuel;
    const emergency = 20000 + short * r.int(6000, 9000);
    co.ship.fuel = 0;
    forcePay(state, co, emergency, 'emergency fuel');
    report(
      state,
      'bad',
      `You ran out of Ionic Fuel ${short} tons short of ${PLANET_BY_ID[state.planets[to]!.id].name}. An emergency tanker charged you ${fmt(emergency)} kubars.`,
    );
  } else {
    co.ship.fuel -= used;
  }
  co.lastTravelTime = travelTime(state, from, to, co.ship.kuarps);

  // --- strike check ---
  if (co.wagesOwed > co.ship.crew * co.crewSalary * 1.5 && !co.onStrike && r.chance(0.35)) {
    co.onStrike = true;
    report(
      state,
      'bad',
      'Your crew has gone on strike! Pay all wages owed before you can pick up passengers again.',
    );
  }

  // --- travel events (may leave a pending choice) ---
  rollTravelEvents(state, co, ci, from, to, r);
  if ((state.phase as Phase) === 'event') return; // wait for eventChoice, then arrive()
  arrive(state, r);
}

export function arrive(state: GameState, r: Rng): void {
  const ci = currentIndex(state);
  const co = state.companies[ci]!;
  const to = state.destination!;
  const p = state.planets[to]!;
  const pname = PLANET_BY_ID[p.id].name;
  co.planet = to;
  state.destination = null;
  if (co.inbox.length) {
    state.arrivalReports.push(...co.inbox);
    co.inbox = [];
  }

  // passengers pay on arrival (taxed)
  if (co.passengers > 0) {
    const income = co.passengers * co.ticketPrice;
    const tax = Math.round(income * state.econ.passengerTax);
    co.cash += income;
    co.taxOwedPassenger += tax;
    report(
      state,
      'good',
      `${co.passengers} passengers paid ${fmt(income)} kubars for the trip to ${pname} (passenger tax ${fmt(tax)} due).`,
    );
    co.passengers = 0;
  }
  // import tariff
  const importTax = Math.round(cargoValue(co) * state.econ.importTariff);
  if (importTax > 0) {
    co.taxOwedTariff += importTax;
    report(state, 'info', `Import tariff of ${fmt(importTax)} kubars assessed on your cargo.`);
  }
  // facilities: pay fees to owners, collect own revenue
  for (const f of p.facilities) {
    if (f.owner === ci) {
      if (f.revenue > 0) {
        co.cash += f.revenue;
        report(state, 'good', `${f.name} earned you ${fmt(f.revenue)} kubars in fees.`);
        f.revenue = 0;
      }
    } else if (f.owner >= 0) {
      forcePay(state, co, f.fee, `${f.name} fee`);
      f.revenue += f.fee;
      report(
        state,
        'bad',
        `${state.companies[f.owner]!.name} charged you ${fmt(f.fee)} kubars to use the ${f.name}.`,
      );
    }
  }
  // commodity ads add tons at the destination
  const adC = adSpend(co.adCommodity, co);
  if (adC > 0) {
    const extra = Math.floor(adC / 50);
    const per = Math.max(1, Math.floor(extra / state.commodities.length));
    for (const c of state.commodities) p.stock[c] = (p.stock[c] ?? 0) + per;
    report(
      state,
      'info',
      `Your commodity advertising brought ${extra} extra tons of goods to the market on ${pname}.`,
    );
  }
  // roll next week's passengers, ads reset, insurance consumed
  rollPassengerDemand(co, adSpend(co.adPassenger, co), r);
  co.adPassenger = 0;
  co.adCommodity = 0;
  co.insured = false;
  co.insurancePremium = insurancePremium(state, co, r);
  co.stockBoughtThisWeek = false;
  if (co.onStrike) co.paxBase = 0;
  state.phase = 'arrival';
}

/* --------------------------------------------------------------- events */

function doEventChoice(state: GameState, choice: string, amount: number | undefined, r: Rng): void {
  need(state.pending, 'no event pending');
  const ev = state.pending!;
  const valid = ev.choices.length === 0 ? choice === 'ok' : ev.choices.some((c) => c.id === choice);
  need(valid, 'invalid choice');
  state.pending = null;
  const co = currentCompany(state);
  if (ev.context === 'planet') {
    if (ev.id === 'auctionbid') recordBid(state, currentIndex(state), choice, amount);
    else resolveSpecialChoice(state, co, currentIndex(state), ev.id, choice, ev.data ?? {}, r);
    if (!state.pending) promptBid(state, currentIndex(state));
    return; // stay on the planet
  }
  need(state.phase === 'event', 'no travel event pending');
  state.phase = 'travel';
  resolveEventChoice(state, co, ev.id, choice, ev.data ?? {}, r);
  if ((state.phase as Phase) === 'event') return; // chained event
  arrive(state, r);
}

/* ------------------------------------------------------ continue / week */

function doContinue(state: GameState, r: Rng): void {
  need(state.phase === 'arrival', 'nothing to continue from');
  state.arrivalReports = [];
  state.turnIndex++;
  // skip bankrupt companies
  while (
    state.turnIndex < state.order.length &&
    state.companies[state.order[state.turnIndex]!]!.bankrupt
  ) {
    state.turnIndex++;
  }
  if (state.turnIndex >= state.order.length) endWeek(state, r);
  else {
    state.phase = 'onPlanet';
    enterTurn(state);
  }
}

/** A company's turn begins: pending auction bid prompt for humans. */
function enterTurn(state: GameState): void {
  const ci = currentIndex(state);
  const co = state.companies[ci];
  if (co && !co.isAI) promptBid(state, ci);
}

function endWeek(state: GameState, r: Rng): void {
  state.week++;

  // --- world: supply drift, restock, prices, fuel, exchanges ---
  for (const p of state.planets) {
    for (const c of state.commodities) {
      const s = p.supply[c] ?? 50;
      const drift = (50 - s) * 0.08 + (r.float() - 0.5) * 16;
      p.supply[c] = Math.min(100, Math.max(0, s + drift));
      const target = stockForSupply(c, p.supply[c]!, r);
      const cur = p.stock[c] ?? 0;
      p.stock[c] = Math.max(0, Math.round(cur + (target - cur) * 0.6));
    }
    refreshPlanetPrices(state, p, r);
    p.fuelPrice = Math.round(
      Math.min(
        ECON.fuelPriceMax,
        Math.max(ECON.fuelPriceMin, p.fuelPrice * (0.85 + 0.3 * r.float())),
      ),
    );
    stepExchange(p, r);
  }

  // --- weekly economic roll, auctions ---
  weeklyEconomy(state, r);
  settleAuction(state);
  maybeStartAuction(state, r);

  // --- companies: bankruptcy, net worth, win ---
  for (let i = 0; i < state.companies.length; i++) {
    const co = state.companies[i]!;
    if (co.bankrupt) continue;
    if (co.unionLoan > co.unionLimit) {
      co.bankrupt = true;
      log(
        state,
        -1,
        'news',
        `${co.name} exceeded its Trader's Union credit limit and has been declared BANKRUPT.`,
      );
    } else if (co.zinnLoan > co.zinnLimit) {
      co.bankrupt = true;
      log(state, -1, 'news', `Mr. Zinn repossessed ${co.name}'s ship. ${co.name} is BANKRUPT.`);
    }
    // tax audit after 3 weeks of arrears
    const owed = co.taxOwedPassenger + co.taxOwedTariff;
    if (owed > 0 && co.weeksTaxUnpaid >= 3) {
      const fine = Math.round(owed * 0.25);
      forcePay(state, co, owed + fine, 'the tax audit');
      co.taxOwedPassenger = 0;
      co.taxOwedTariff = 0;
      co.weeksTaxUnpaid = 0;
      co.inbox.push({
        week: state.week,
        company: i,
        kind: 'bad',
        text: `The Imperial Tax Auditor caught up with you: ${fmt(owed)} kubars in overdue taxes collected, plus a ${fmt(fine)} kubar fine.`,
      });
    }
    co.netWorthHistory.push(netWorth(state, co));
    if (co.netWorthHistory.length > 60) co.netWorthHistory.shift();
  }
  const alive = state.companies.map((c, i) => [c, i] as const).filter(([c]) => !c.bankrupt);
  const rich = alive.filter(([c]) => netWorth(state, c) >= state.settings.targetNetWorth);
  if (rich.length > 0) {
    rich.sort((a, b) => netWorth(state, b[0]) - netWorth(state, a[0]));
    state.winner = rich[0]![1];
    // An AI-only simulation has no human available to answer the continuation decision.
    state.phase = state.companies.some((co) => !co.isAI) ? 'winner' : 'gameOver';
    log(
      state,
      -1,
      'news',
      `${rich[0]![0].name} reached ${fmt(state.settings.targetNetWorth)} kubars and leads the competition.`,
    );
    return;
  }
  const humansAlive = alive.filter(([c]) => !c.isAI);
  const anyHuman = state.companies.some((c) => !c.isAI);
  if ((anyHuman && humansAlive.length === 0) || alive.length <= 1) {
    state.winner = alive.length === 1 ? alive[0]![1] : null;
    state.phase = 'gameOver';
    return;
  }

  state.order = nextTurnOrder(state, alive);
  state.turnIndex = 0;
  state.phase = 'onPlanet';
  enterTurn(state);
}

function nextTurnOrder(
  state: GameState,
  alive: readonly (readonly [CompanyState, number])[],
): number[] {
  const prev = new Map(state.order.map((c, i) => [c, i]));
  const byArrival = (a: number, b: number) => {
      const d = state.companies[a]!.lastTravelTime - state.companies[b]!.lastTravelTime;
      return d !== 0 ? d : (prev.get(a) ?? 0) - (prev.get(b) ?? 0);
    };
  const indices = alive.map(([, i]) => i);
  if (state.settings.ruleset === 'steam') return indices.sort(byArrival);

  // Deluxe resolves its human arrivals by travel time, then runs its six rivals in fixed order.
  return [
    ...indices.filter((i) => !state.companies[i]!.isAI).sort(byArrival),
    ...indices.filter((i) => state.companies[i]!.isAI).sort((a, b) => a - b),
  ];
}

function resolveWinningChoice(
  state: GameState,
  action: 'continueCompetition' | 'retireCompetition',
): void {
  need(state.phase === 'winner', 'there is no winning decision to make');
  if (action === 'retireCompetition' || state.settings.ruleset === 'steam') {
    state.phase = 'gameOver';
    return;
  }
  state.settings.targetNetWorth = nextWinningPoint(
    state.settings.ruleset,
    state.settings.targetNetWorth,
  );
  state.winner = null;
  state.phase = 'onPlanet';
  enterTurn(state);
}

function stepExchange(p: { exchange: GameState['planets'][number]['exchange'] }, r: Rng): void {
  const ex = p.exchange;
  if (ex.closedFor > 0) {
    ex.closedFor--;
    if (ex.closedFor === 0) {
      ex.price = 1000;
      ex.trend = 0.5;
    }
    ex.history.push(ex.price);
  } else {
    const up = r.chance(ex.trend);
    const pct = r.int(1, 6) / 100;
    ex.price = Math.round(ex.price * (up ? 1 + pct : 1 - pct));
    // momentum: trend follows the move, mean-reverts slowly
    ex.trend = Math.min(
      0.85,
      Math.max(0.15, ex.trend + (up ? 0.06 : -0.06) + (0.5 - ex.trend) * 0.05),
    );
    if (ex.price < 250 && r.chance(0.5)) ex.price = Math.round(ex.price * 0.5);
    if (ex.price < 100) {
      ex.price = 0;
      ex.closedFor = 2;
    }
    ex.history.push(ex.price);
  }
  if (ex.history.length > 40) ex.history.shift();
}

function weeklyEconomy(state: GameState, r: Rng): void {
  const roll = r.int(1, 20);
  const bump = (k: 'importTariff' | 'exportTariff' | 'passengerTax', d: number, label: string) => {
    const old = state.econ[k];
    state.econ[k] = Math.max(0, Math.round((old + d) * 100) / 100);
    log(
      state,
      -1,
      'news',
      `Imperial decree: ${label} changed from ${Math.round(old * 100)}% to ${Math.round(state.econ[k] * 100)}%.`,
    );
  };
  switch (roll) {
    case 1:
    case 2: {
      // harvest glut / shortage on an agricultural good
      const agri = state.commodities.filter((c) => COMMODITY_BY_ID[c].agri);
      if (agri.length === 0) return;
      const c = r.pick(agri);
      const glut = roll === 1;
      for (const p of state.planets) {
        p.supply[c] = Math.min(100, Math.max(0, (p.supply[c] ?? 50) + (glut ? 30 : -30)));
        p.stock[c] = Math.max(0, Math.round((p.stock[c] ?? 0) * (glut ? 1.8 : 0.4)));
        refreshPlanetPrices(state, p, r);
      }
      log(
        state,
        -1,
        'news',
        glut
          ? `Bumper harvest: ${COMMODITY_BY_ID[c].name} floods the markets across Kukubia. Prices tumble.`
          : `Crop failure: ${COMMODITY_BY_ID[c].name} is scarce everywhere. Prices soar.`,
      );
      return;
    }
    case 3:
      return bump('exportTariff', 0.01, 'the export tariff');
    case 4:
      return bump('exportTariff', -0.01, 'the export tariff');
    case 5:
      return bump('importTariff', 0.01, 'the import tariff');
    case 6:
      return bump('importTariff', -0.01, 'the import tariff');
    case 7:
      return bump('passengerTax', 0.05, 'the passenger tax');
    case 8:
      return bump('passengerTax', -0.05, 'the passenger tax');
    case 9: {
      for (const p of state.planets)
        p.fuelPrice = Math.min(ECON.fuelPriceMax, Math.round(p.fuelPrice * 1.5));
      log(
        state,
        -1,
        'news',
        'Ionic Fuel shock: refinery strike on Nosh sends fuel prices up across the colonies.',
      );
      return;
    }
    case 10: {
      for (const p of state.planets)
        p.fuelPrice = Math.max(ECON.fuelPriceMin, Math.round(p.fuelPrice * 0.6));
      log(state, -1, 'news', 'Fuel glut: new Ionic Fuel wells come online. Fuel prices drop.');
      return;
    }
    case 11:
    case 12: {
      // rumour sets a trend on one exchange
      const p = r.pick(state.planets);
      const bull = roll === 11;
      p.exchange.trend = bull ? 0.8 : 0.2;
      log(
        state,
        -1,
        'news',
        `Kuku News: analysts turn ${bull ? 'bullish' : 'bearish'} on ${PLANET_BY_ID[p.id].exchange}.`,
      );
      return;
    }
    default:
      return;
  }
}
