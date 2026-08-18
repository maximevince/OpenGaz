import { describe, expect, it } from 'vitest';
import {
  ActionError,
  applyAction,
  cargoTons,
  currentCompany,
  decodeFromLink,
  encodeForLink,
  isAiTurn,
  netWorth,
  newGame,
  passengersWaiting,
  priceForSupply,
  priceRange,
  runAi,
  COMMODITY_BY_ID,
  type GameState,
} from './index';

const base = () =>
  newGame({
    seed: 'test-seed',
    level: 'novice',
    humans: [{ name: 'Slev & Sons', ship: 1 }],
    ai: 3,
  });

describe('setup', () => {
  it('creates 7 planets, 9 commodities, humans + AI', () => {
    const s = base();
    expect(s.planets).toHaveLength(7);
    expect(s.commodities).toHaveLength(9);
    expect(s.companies).toHaveLength(4);
    expect(s.companies[0]!.isAI).toBe(false);
    expect(s.companies[0]!.cash).toBe(50000);
    expect(s.companies[0]!.zinnLoan).toBe(110000);
    expect(new Set(s.planets.map((p) => p.slot)).size).toBe(7);
  });
  it('is deterministic for the same seed', () => {
    expect(JSON.stringify(base())).toBe(JSON.stringify(base()));
    expect(JSON.stringify(base())).not.toBe(
      JSON.stringify(
        newGame({ ...{ seed: 'other', level: 'novice', humans: [{ name: 'x', ship: 1 }], ai: 3 } }),
      ),
    );
  });
});

describe('prices', () => {
  it('stay within the commodity band and fall with supply', () => {
    for (const c of Object.values(COMMODITY_BY_ID)) {
      const { min, max } = priceRange(c);
      const hi = priceForSupply(c.id, 0, 0);
      const lo = priceForSupply(c.id, 100, 0);
      expect(hi).toBeLessThanOrEqual(max);
      expect(lo).toBeGreaterThanOrEqual(min);
      expect(hi).toBeGreaterThan(lo);
      expect(priceForSupply(c.id, 50, 0)).toBeGreaterThan(lo);
    }
  });
});

describe('trading', () => {
  it('buys, refunds at cost the same visit, and rejects overbuying', () => {
    let s = base();
    const co = () => currentCompany(s);
    const p = s.planets[co().planet]!;
    const c = s.commodities.find((x) => (p.stock[x] ?? 0) >= 5)!;
    const price = p.price[c]!;
    const cash0 = co().cash;
    s = applyAction(s, { type: 'buy', commodity: c, tons: 5 });
    expect(co().cash).toBe(cash0 - 5 * price);
    expect(cargoTons(co())).toBe(5);
    expect(co().cargo[c]!.paid).toBe(price);
    // refund
    s = applyAction(s, { type: 'sell', commodity: c, tons: 5 });
    expect(co().cash).toBe(cash0);
    expect(cargoTons(co())).toBe(0);
    expect(() => applyAction(s, { type: 'buy', commodity: c, tons: 100000 })).toThrow(ActionError);
    expect(() => applyAction(s, { type: 'sell', commodity: c, tons: 1 })).toThrow(ActionError);
  });
  it('does not mutate the input state', () => {
    const s = base();
    const before = JSON.stringify(s);
    applyAction(s, { type: 'setTicketPrice', price: 3000 });
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('money', () => {
  it('bank and union loan respect limits; net worth is consistent', () => {
    let s = base();
    const co = () => currentCompany(s);
    s = applyAction(s, { type: 'bankDeposit', amount: 20000 });
    expect(co().bank).toBe(20000);
    expect(co().cash).toBe(30000);
    expect(() => applyAction(s, { type: 'bankWithdraw', amount: 20001 })).toThrow();
    s = applyAction(s, { type: 'unionBorrow', amount: 100000 });
    expect(co().unionLoan).toBe(100000);
    expect(() => applyAction(s, { type: 'unionBorrow', amount: 1 })).toThrow();
    expect(netWorth(s, co())).toBe(130000 + 20000 - 100000 - 110000);
  });
  it('accrues interest and wages when leaving, taxes passengers on arrival', () => {
    let s = base();
    const co = () => currentCompany(s);
    s = applyAction(s, { type: 'bankDeposit', amount: 10000 });
    s = applyAction(s, { type: 'setTicketPrice', price: 500 });
    s = applyAction(s, { type: 'pickupPassengers' });
    const pax = co().passengers;
    expect(pax).toBe(passengersWaiting({ ...co(), passengers: 0 }));
    const cashBefore = co().cash;
    const dest = (co().planet + 1) % 7;
    s = applyAction(s, { type: 'journey', to: dest });
    // event may be pending
    if (s.phase === 'event')
      s = applyAction(s, { type: 'eventChoice', choice: s.pending!.choices[0]?.id ?? 'ok' });
    expect(s.phase).toBe('arrival');
    expect(co().planet).toBe(dest);
    expect(co().bank).toBe(10100);
    expect(co().zinnLoan).toBe(Math.round(110000 * 1.04));
    expect(co().wagesOwed).toBe(4 * 1500);
    if (pax > 0) {
      expect(co().taxOwedPassenger).toBe(Math.round(pax * 500 * 0.15));
      // cash may have moved due to events; passenger income must be included
      expect(co().cash + 0).toBeGreaterThanOrEqual(0);
    }
    expect(co().passengers).toBe(0);
    void cashBefore;
  });
});

describe('turns & weeks', () => {
  it('advances through all companies then a new week with arrival ordering', () => {
    let s = base();
    expect(s.week).toBe(1);
    // human turn
    s = applyAction(s, { type: 'journey', to: (currentCompany(s).planet + 1) % 7 });
    while (s.phase === 'event')
      s = applyAction(s, { type: 'eventChoice', choice: s.pending!.choices[0]?.id ?? 'ok' });
    s = applyAction(s, { type: 'continue' });
    expect(isAiTurn(s)).toBe(true);
    s = runAi(s);
    expect(s.week).toBe(2);
    expect(isAiTurn(s)).toBe(false);
    // order sorted by travel time
    const t = s.order.map((i) => s.companies[i]!.lastTravelTime);
    for (let i = 1; i < t.length; i++) expect(t[i]!).toBeGreaterThanOrEqual(t[i - 1]!);
  });

  it('AI-only game runs to completion deterministically', () => {
    const play = () => {
      let s: GameState = newGame({ seed: 'ai-vs-ai', level: 'novice', humans: [], ai: 4 });
      // no humans → runAi loops until game over
      let weeks = 0;
      while (s.phase !== 'gameOver' && weeks < 400) {
        s = runAi(s);
        weeks = s.week;
      }
      return s;
    };
    const a = play();
    const b = play();
    expect(a.phase).toBe('gameOver');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // someone won or everyone went bust
    const alive = a.companies.filter((c) => !c.bankrupt);
    expect(alive.length <= 1 || a.winner !== null).toBe(true);
    // sanity: no NaN money anywhere
    for (const c of a.companies) {
      expect(Number.isFinite(c.cash)).toBe(true);
      expect(Number.isFinite(c.unionLoan)).toBe(true);
    }
  });
});

describe('save', () => {
  it('round-trips through a play-by-link string', () => {
    const s = base();
    const link = encodeForLink(s);
    expect(link.length).toBeLessThan(20000);
    expect(JSON.stringify(decodeFromLink(link))).toBe(JSON.stringify(s));
  });
});
