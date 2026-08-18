/**
 * Computer opponents. They play through the same actions as humans, so everything stays
 * deterministic and replayable. Personality = style + iq (0..1).
 */
import type { CommodityId } from './data/commodities';
import { PLANET_BY_ID } from './data/planets';
import { cargoTons, distanceBetween, passengersWaiting } from './economy';
import { Rng } from './rng';
import { applyAction, currentCompany, currentIndex } from './reducer';
import type { Action, GameState } from './types';

export function isAiTurn(state: GameState): boolean {
  if (state.phase === 'gameOver') return false;
  const co = state.companies[currentIndex(state)];
  return !!co && co.isAI;
}

/** Run AI companies until it is a human's turn (or the game ends). */
export function runAi(state: GameState): GameState {
  let s = state;
  let guard = 0;
  while (isAiTurn(s) && guard++ < 200) s = stepAi(s);
  return s;
}

/** One full AI turn: act on planet, journey, answer events, continue past arrival. */
export function stepAi(state: GameState): GameState {
  let s = state;
  const tryAct = (a: Action): boolean => {
    try {
      s = applyAction(s, a);
      return true;
    } catch {
      return false;
    }
  };
  if (s.phase === 'onPlanet') {
    const co = currentCompany(s);
    const r = new Rng((s.rng ^ 0xa5a5a5a5) >>> 0);
    const iq = co.aiIq;
    const style = co.aiStyle ?? 'bythebook';
    const noise = () => 1 + (r.float() - 0.5) * (1 - iq) * 0.6;
    runPlan(() => s, tryAct, r, iq, style, noise);
  }
  let guard = 0;
  while (guard++ < 10 && (s.phase === 'event' || s.phase === 'arrival') && isAiTurn(s)) {
    if (s.phase === 'event') {
      const ev = s.pending!;
      const choice = ev.choices.length
        ? pickChoice(
            s,
            ev.choices.map((c) => c.id),
          )
        : 'ok';
      tryAct({ type: 'eventChoice', choice });
    } else {
      tryAct({ type: 'continue' });
    }
  }
  return s;
}

function pickChoice(s: GameState, ids: string[]): string {
  const co = currentCompany(s);
  const yes = ids.find((i) => i === 'yes') ?? ids[0]!;
  const no = ids.find((i) => i === 'no') ?? ids[ids.length - 1]!;
  const r = new Rng((s.rng ^ 0x9e3779b9) >>> 0);
  if (co.aiStyle === 'risky' || co.aiStyle === 'chaotic') return yes;
  if (co.aiStyle === 'cautious') return no;
  return r.chance(0.5 + co.aiIq * 0.2) ? yes : no;
}

/* --------------------------------------------------------- the actual plan */

function runPlan(
  get: () => GameState,
  tryAct: (a: Action) => boolean,
  r: Rng,
  iq: number,
  style: string,
  noise: () => number,
): void {
  const co = () => currentCompany(get());
  const p = () => get().planets[co().planet]!;
  const ci = currentIndex(get());

  // 0. answer any pending dialog (auction bid etc.), then maybe use the planet special
  const answer = () => {
    let guard = 0;
    while (get().pending && guard++ < 5) {
      const ev = get().pending!;
      const ids = ev.choices.map((c) => c.id);
      const choice =
        ids.length === 0
          ? 'ok'
          : ids.includes('yes')
            ? r.chance(0.6 + iq * 0.3)
              ? 'yes'
              : 'no'
            : ids[0]!;
      tryAct({
        type: 'eventChoice',
        choice,
        amount: ev.input ? Math.min(ev.input.max, ev.input.initial) : undefined,
      });
    }
  };
  answer();
  {
    const special = PLANET_BY_ID[p().id].special;
    const useful =
      ((special === 'mechanic' || special === 'engines') && co().cash > 40000) ||
      (special === 'zinn' && co().zinnLoan > 0) ||
      (special === 'union' && co().unionLoan > 0) ||
      special === 'fuel' ||
      (special === 'shoreleave' && co().wagesOwed > 0) ||
      (special === 'blessing' && co().mods.blessedWeeks === 0) ||
      (special === 'insurance' && r.chance(0.5)) ||
      (special === 'smuggler' && co().cash > 20000);
    if (useful && r.chance(0.7)) {
      tryAct({ type: 'special' });
      answer();
    }
  }

  // 1. sell cargo that is profitable here (or everything if we've been hauling it a while)
  for (const c of Object.keys(co().cargo) as CommodityId[]) {
    const lot = co().cargo[c]!;
    const price = p().price[c] ?? 0;
    const margin = price / Math.max(1, lot.paid);
    if (margin >= 1.08 * noise() || (margin >= 0.9 && r.chance(0.5 - iq * 0.3))) {
      tryAct({ type: 'sell', commodity: c, tons: lot.tons });
    }
  }
  // 2. mandatory bills
  if (co().wagesOwed > 0 && co().cash >= co().wagesOwed) tryAct({ type: 'payCrew' });
  const taxes = co().taxOwedPassenger + co().taxOwedTariff;
  if (
    taxes > 0 &&
    co().cash >= taxes &&
    (taxes > 5000 || co().weeksTaxUnpaid >= 2 || r.chance(iq))
  ) {
    tryAct({ type: 'payTaxes' });
  }
  // 3. choose destination by expected trade profit
  const dest = chooseDestination(get(), ci, r, iq, style);
  // 4. fuel: always enough for the trip (worst case), fill up when cheap or tank low
  {
    const dist = distanceBetween(get(), co().planet, dest);
    const worst = Math.ceil(dist / 2) + Math.ceil((400 * co().ship.klass) / 100) + 1;
    const need = co().ship.fuelCap - co().ship.fuel;
    if (need > 0) {
      const lowTank = co().ship.fuel < co().ship.fuelCap * 0.4;
      const cheap = p().fuelPrice < 350;
      let tons = 0;
      if (lowTank || cheap || style === 'bythebook') tons = need;
      else if (co().ship.fuel < worst) tons = Math.min(need, worst - co().ship.fuel);
      tons = Math.min(tons, Math.floor((co().cash * 0.6) / Math.max(1, p().fuelPrice)));
      if (tons > 0) tryAct({ type: 'buyFuel', tons });
    }
  }
  // 5. buy for that destination
  {
    const budget = co().cash * (style === 'cautious' ? 0.5 : style === 'risky' ? 0.95 : 0.8);
    let cash = budget;
    const cands = get()
      .commodities.map((c) => ({
        c,
        gain: (get().planets[dest]!.price[c] ?? 0) - (p().price[c] ?? 0),
        price: p().price[c] ?? 1,
      }))
      .filter((x) => x.gain > 0 && (p().stock[x.c] ?? 0) > 0)
      // cargo space is the binding constraint: prefer the biggest gain per ton we can afford
      .sort((a, b) => b.gain - a.gain);
    for (const x of cands) {
      const room = co().ship.cargo - cargoTons(co());
      if (room <= 0 || cash <= 0) break;
      const tons = Math.min(room, p().stock[x.c] ?? 0, Math.floor(cash / x.price));
      if (tons > 0 && tryAct({ type: 'buy', commodity: x.c, tons })) cash -= tons * x.price;
      if (style === 'chaotic' && r.chance(0.3)) break;
    }
  }
  // 6. passengers & ads
  {
    const price =
      style === 'ruthless' ? 3800 : style === 'naive' ? 1500 : 2500 + Math.round(1500 * iq);
    tryAct({ type: 'setTicketPrice', price });
    if (!co().onStrike && passengersWaiting(co()) > 0) tryAct({ type: 'pickupPassengers' });
    // passenger ads pay for themselves many times over; commodity ads only when flush
    const tier = co().cash > 40000 ? 5 : co().cash > 12000 ? 4 : co().cash > 6000 ? 2 : 0;
    if (tier > 0)
      tryAct({ type: 'advertise', passenger: tier, commodity: co().cash > 60000 ? 3 : 0 });
  }
  // 7. insurance
  if (
    co().cash > 20000 &&
    (style === 'cautious' || style === 'bythebook' || r.chance(0.3 + iq * 0.4))
  ) {
    tryAct({ type: 'buyInsurance' });
  }
  // 8. money management
  {
    const c = co();
    if (c.cash < 5000 && c.unionLoan < c.unionLimit * 0.5) {
      tryAct({ type: 'unionBorrow', amount: Math.min(20000, c.unionLimit - c.unionLoan) });
    }
    if (c.unionLoan > 0 && c.cash > c.unionLoan + 15000)
      tryAct({ type: 'unionRepay', amount: c.unionLoan });
    else if (c.unionLoan > 0 && c.cash > 30000)
      tryAct({ type: 'unionRepay', amount: Math.floor(c.cash * 0.3) });
    // Zinn's 4 %/week compounds fast: pay him down whenever there is a cushion, urgently near the limit
    {
      const c2 = co();
      const urgent = c2.zinnLoan > c2.zinnLimit * 0.75;
      const reserve = urgent ? 5000 : 25000;
      if (c2.zinnLoan > 0 && c2.cash > reserve) {
        tryAct({ type: 'zinnRepay', amount: Math.floor((c2.cash - reserve) * (urgent ? 1 : 0.6)) });
      }
      if (urgent && co().zinnLoan > 0 && co().bank > 0) {
        tryAct({ type: 'bankWithdraw', amount: co().bank });
        tryAct({ type: 'zinnRepay', amount: Math.max(0, co().cash - 5000) });
      }
    }
    if (co().cash > 80000 && style !== 'risky')
      tryAct({ type: 'bankDeposit', amount: Math.floor(co().cash * 0.3) });
    // a flutter on the local exchange for risk-takers — judged from the visible chart only
    const h = p().exchange.history;
    const rising =
      h.length >= 3 && h[h.length - 1]! > h[h.length - 2]! && h[h.length - 2]! > h[h.length - 3]!;
    const falling = h.length >= 2 && h[h.length - 1]! < h[h.length - 2]!;
    if (
      (style === 'risky' || style === 'ruthless') &&
      co().cash > 40000 &&
      p().exchange.closedFor === 0 &&
      rising
    ) {
      const shares = Math.floor(
        (co().cash * (style === 'risky' ? 0.3 : 0.15)) / Math.max(1, p().exchange.price),
      );
      if (shares > 0) tryAct({ type: 'stockBuy', shares });
    }
    const lot = co().shares[co().planet];
    if (
      lot &&
      lot.tons > 0 &&
      (falling || p().exchange.price > lot.paid * 1.3 || p().exchange.price < lot.paid * 0.85)
    ) {
      tryAct({ type: 'stockSell', shares: lot.tons });
    }
  }
  // 9. go
  tryAct({ type: 'journey', to: dest });
}

function chooseDestination(s: GameState, ci: number, r: Rng, iq: number, style: string): number {
  const co = s.companies[ci]!;
  const here = co.planet;
  const p = s.planets[here]!;
  let best = -1;
  let bestScore = -Infinity;
  for (let d = 0; d < s.planets.length; d++) {
    if (d === here) continue;
    const q = s.planets[d]!;
    // best single-commodity haul value per ton of cargo space, minus distance cost
    let gain = 0;
    for (const c of s.commodities) {
      const g = ((q.price[c] ?? 0) - (p.price[c] ?? 0)) * Math.min(co.ship.cargo, p.stock[c] ?? 0);
      if (g > gain) gain = g;
    }
    // sell-side: what our current cargo fetches there
    for (const c of Object.keys(co.cargo) as CommodityId[]) {
      gain += ((q.price[c] ?? 0) - co.cargo[c]!.paid) * co.cargo[c]!.tons;
    }
    const dist = distanceBetween(s, here, d);
    let score = gain - dist * 800 * (style === 'cautious' ? 1.5 : 1);
    score *= 1 + (r.float() - 0.5) * (1.2 - iq); // dumber = noisier
    if (style === 'chaotic' && r.chance(0.25)) score += r.int(0, 50000);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best >= 0 ? best : (here + 1) % s.planets.length;
}
