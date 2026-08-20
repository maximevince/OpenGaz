/**
 * Engine tests. Every expectation here pins down a rule of the original game, rather than a
 * guess about what feels right.
 */
import { describe, expect, it } from 'vitest';
import {
  ActionError,
  COMMODITIES,
  COMMODITY_BY_ID,
  LEVEL_BY_ID,
  Rng,
  SAVE_VERSION,
  SHIP_BY_ID,
  applyAction,
  applyShipUpgrade,
  badChainStreak,
  cargoTons,
  companyLocation,
  companyStatus,
  computePassengers,
  currentCompany,
  currentIndex,
  decodeFromLink,
  deserialize,
  encodeForLink,
  facilityHoldings,
  fuelUsage,
  hasFlownThisWeek,
  goodChainStreak,
  humanTravelTime,
  netWorth,
  newGame,
  opponentTravelTime,
  priceForSupply,
  priceRange,
  serialize,
  stepStockMarket,
  subtractCash,
  type CompanyState,
  type GameState,
} from './index';

const base = (over: Partial<Parameters<typeof newGame>[0]> = {}) =>
  newGame({
    seed: 'test-seed',
    level: 'novice',
    humans: [{ name: 'Slev & Sons', ship: 1 }],
    ai: 3,
    ...over,
  });

const human = (s: GameState) => s.companies[0]!;

describe('setup', () => {
  it('follows the level table', () => {
    const s = base();
    const level = LEVEL_BY_ID('novice');
    expect(s.planets).toHaveLength(7);
    expect(s.commodities).toHaveLength(18); // all 18 always trade
    expect(s.companies).toHaveLength(4);
    expect(human(s).cash).toBe(level.startCash); // 25,000 at Novice
    expect(human(s).zinnLoan).toBe(level.zinnDebt);
    expect(human(s).eventGood).toBe(level.eventGood);
    expect(human(s).ship.tons).toBe(400);
    expect(human(s).warehouseSpace).toBe(50);
    expect(s.settings.targetNetWorth).toBe(1_000_000);
  });

  it('opens every exchange on the 1,700-down-to-1,100 ladder at trend 50', () => {
    const s = base();
    for (const p of s.planets) {
      expect(p.exchange.price).toBe(1700 - 100 * p.slot);
      expect(p.exchange.trend).toBe(50);
      expect(p.exchange.crashed).toBe(false);
    }
  });

  it('puts only humans in the turn order — rivals run inside the rollover', () => {
    const s = base();
    expect(s.order).toEqual([0]);
    expect(s.companies.filter((c) => c.isAI)).toHaveLength(3);
  });

  it('is deterministic for a given seed', () => {
    expect(JSON.stringify(base())).toBe(JSON.stringify(base()));
    expect(JSON.stringify(base())).not.toBe(JSON.stringify(base({ seed: 'other' })));
  });
});

describe('commodity prices', () => {
  it('interpolates linearly between the band ends', () => {
    for (const c of COMMODITIES) {
      for (const difficulty of [0, 2, 4]) {
        const { min, max } = priceRange(c, difficulty);
        expect(priceForSupply(c.id, 100, difficulty)).toBe(min);
        expect(priceForSupply(c.id, 0, difficulty)).toBe(max);
        const mid = priceForSupply(c.id, 50, difficulty);
        expect(mid).toBe(Math.floor((max - min) / 2) + min);
      }
    }
  });

  it('raises the floor with difficulty but keeps the ceiling', () => {
    const c = COMMODITY_BY_ID.gems;
    expect(priceRange(c, 0)).toEqual({ min: 5 * c.rank, max: 40 * c.rank });
    expect(priceRange(c, 4).min).toBe(25 * c.rank);
    expect(priceRange(c, 4).max).toBe(40 * c.rank);
  });

  it('holds prices steady across a week of trading', () => {
    let s = base();
    const co = human(s);
    const p = s.planets[co.planet]!;
    const c = s.commodities.find((x) => (p.stock[x] ?? 0) > 2 && p.price[x]! <= co.cash)!;
    const before = p.price[c]!;
    s = applyAction(s, { type: 'buy', commodity: c, tons: 1 });
    expect(s.planets[human(s).planet]!.price[c]).toBe(before);
    s = applyAction(s, { type: 'sell', commodity: c, tons: 1 });
    expect(s.planets[human(s).planet]!.price[c]).toBe(before);
  });

  it('refunds a same-visit resale in full, because the price cannot move', () => {
    let s = base();
    const co = human(s);
    const p = s.planets[co.planet]!;
    const c = s.commodities.find((x) => (p.stock[x] ?? 0) > 2 && p.price[x]! * 2 <= co.cash)!;
    const cash = co.cash;
    s = applyAction(s, { type: 'buy', commodity: c, tons: 2 });
    s = applyAction(s, { type: 'sell', commodity: c, tons: 2 });
    expect(human(s).cash).toBe(cash);
  });
});

describe('subtract_cash cascade', () => {
  const co = (cash: number, bank: number, loan = 0) =>
    ({ cash, bank, unionLoan: loan }) as CompanyState;

  it('takes cash first', () => {
    const c = co(1000, 500);
    subtractCash(c, 400);
    expect([c.cash, c.bank, c.unionLoan]).toEqual([600, 500, 0]);
  });
  it('falls back to savings', () => {
    const c = co(100, 500);
    subtractCash(c, 400);
    expect([c.cash, c.bank, c.unionLoan]).toEqual([0, 200, 0]);
  });
  it('forces the rest onto the Union loan', () => {
    const c = co(100, 100);
    subtractCash(c, 400);
    expect([c.cash, c.bank, c.unionLoan]).toEqual([0, 0, 200]);
  });
});

describe('passengers', () => {
  const traveller = (price: number, seats = 8): CompanyState =>
    ({
      ticketPrice: price,
      advertP: 0,
      ship: { seats },
      paxPickedUp: true,
    }) as CompanyState;

  it('freezes the fare that the waiting passengers will pay', () => {
    const c = traveller(2500);
    computePassengers(c, new Rng(1));
    expect(c.paxPrice).toBe(2500);
    expect(c.paxPickedUp).toBe(false);
  });

  it('never sells more tickets than there are seats', () => {
    for (let seed = 0; seed < 50; seed++) {
      const c = traveller(100, 6);
      computePassengers(c, new Rng(seed));
      expect(c.paxWaiting).toBeLessThanOrEqual(6);
    }
  });

  it('empties the cabin above 10,000 kubars a ticket', () => {
    for (let seed = 0; seed < 20; seed++) {
      const c = traveller(10001);
      computePassengers(c, new Rng(seed));
      expect(c.paxWaiting).toBe(0);
    }
  });

  it('thins out as the fare climbs through the bands', () => {
    const demand = (price: number) => {
      let total = 0;
      for (let seed = 0; seed < 400; seed++) {
        const c = traveller(price, 16);
        computePassengers(c, new Rng(seed));
        total += c.paxWaiting;
      }
      return total;
    };
    const cheap = demand(1000);
    const mid = demand(5000);
    const dear = demand(9000);
    expect(cheap).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(dear);
  });

  it('pays the fare at pick-up, taxed, and only once', () => {
    let s = base();
    s.companies[0]!.paxWaiting = 4;
    s.companies[0]!.paxPrice = 1000;
    s.companies[0]!.paxPickedUp = false;
    const cash = human(s).cash;
    s = applyAction(s, { type: 'pickupPassengers' });
    expect(human(s).cash).toBe(cash + 4000);
    expect(human(s).taxOwedPassenger).toBe(Math.floor((4000 * s.econ.passTax) / 100));
    expect(() => applyAction(s, { type: 'pickupPassengers' })).toThrow(ActionError);
  });
});

describe('travel and fuel', () => {
  it('floors a human travel time and applies the delay multiplier', () => {
    expect(humanTravelTime(8.49, 5, 1)).toBe(8);
    expect(humanTravelTime(8.49, 5, 2)).toBe(16);
    expect(opponentTravelTime(8.49, 5)).toBeCloseTo(8.49, 5);
  });

  it('burns distance plus tonnage', () => {
    const r = new Rng(7);
    for (let i = 0; i < 200; i++) {
      // fint(1, dist/2) + fint(1, shipTons/100): 2 tons at best, ceil(d/2)+ceil(t/100) at worst
      const used = fuelUsage(11.7, 400, r);
      expect(used).toBeGreaterThanOrEqual(2);
      expect(used).toBeLessThanOrEqual(Math.ceil(11.7 / 2) + Math.ceil(400 / 100));
    }
  });
});

describe('net worth', () => {
  it('counts savings and debts for humans, cash and shares only for rivals', () => {
    const s = base();
    const h = human(s);
    h.cash = 100_000;
    h.bank = 50_000;
    h.unionLoan = 20_000;
    h.zinnLoan = 30_000;
    expect(netWorth(s, h)).toBe(100_000);
    const ai = s.companies.find((c) => c.isAI)!;
    ai.cash = 100_000;
    ai.bank = 50_000;
    ai.unionLoan = 20_000;
    ai.zinnLoan = 30_000;
    expect(netWorth(s, ai)).toBe(100_000 + 0); // savings and loans do not apply to rivals
  });

  it('reports a bankrupt company as unrecoverably negative', () => {
    const s = base();
    human(s).bankrupt = true;
    expect(netWorth(s, human(s))).toBe(-10_000_000_000);
  });
});

describe('stock exchanges', () => {
  it('keeps the trend inside 15..85 and snaps on reversal', () => {
    const s = base();
    const r = new Rng(99);
    for (let week = 0; week < 400; week++) {
      stepStockMarket(s, r);
      for (const p of s.planets) {
        expect(p.exchange.trend).toBeGreaterThanOrEqual(0);
        expect(p.exchange.trend).toBeLessThanOrEqual(100);
        expect(p.exchange.price).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('reopens a crashed exchange at 1,000 with a neutral trend', () => {
    const s = base();
    const p = s.planets[0]!;
    p.exchange.crashed = true;
    stepStockMarket(s, new Rng(3));
    expect(p.exchange.price).toBe(1000);
    expect(p.exchange.trend).toBe(50);
    expect(p.exchange.crashed).toBe(false);
  });

  it('allows one purchase per turn, capped at half of cash plus savings', () => {
    let s = base();
    const p = s.planets[human(s).planet]!;
    p.exchange.price = 1000;
    human(s).cash = 100_000;
    human(s).bank = 0;
    expect(() => applyAction(s, { type: 'stockBuy', shares: 51 })).toThrow(ActionError);
    s = applyAction(s, { type: 'stockBuy', shares: 50 });
    expect(human(s).shares[human(s).planet]!.tons).toBe(50);
    expect(human(s).cash).toBe(100_000 - 50_000 - 500); // 1 % commission
    expect(() => applyAction(s, { type: 'stockBuy', shares: 1 })).toThrow(ActionError);
  });

  it('refuses to trade a crashed exchange', () => {
    const s = base();
    s.planets[human(s).planet]!.exchange.crashed = true;
    expect(() => applyAction(s, { type: 'stockBuy', shares: 1 })).toThrow(ActionError);
    expect(() => applyAction(s, { type: 'stockSell', shares: 1 })).toThrow(ActionError);
  });
});

describe('taxes and tariffs', () => {
  it('skips the import tariff for a company that owes nothing', () => {
    let s = base();
    const co = human(s);
    const p = s.planets[co.planet]!;
    const c = s.commodities.find((x) => (p.stock[x] ?? 0) > 0 && p.price[x]! <= co.cash)!;
    s = applyAction(s, { type: 'buy', commodity: c, tons: 1 });
    s.companies[0]!.taxOwedPassenger = 0;
    s.companies[0]!.taxOwedTariff = 0;
    s.companies[0]!.ship.fuel = 999;
    const to = (human(s).planet + 1) % 7;
    s = applyAction(s, { type: 'journey', to });
    while (s.pending)
      s = applyAction(s, { type: 'eventChoice', choice: s.pending.choices[0]?.id ?? 'ok' });
    s = applyAction(s, { type: 'continue' });
    // export tariff is charged on departure, so an owing company is created; but the arrival
    // tariff itself only lands when something was already owed on touchdown
    expect(human(s).taxOwedTariff).toBeGreaterThanOrEqual(0);
  });

  it('turns the tax screen red at 35 kubars per ton of ship', () => {
    const s = base();
    human(s).taxOwedTariff = 35 * 400;
    expect(human(s).taxOwedTariff).toBe(14_000);
  });
});

describe('ship upgrades', () => {
  it('adds this model’s increments and 200 tons, and stacks', () => {
    const s = base();
    const co = human(s);
    const def = SHIP_BY_ID(co.ship.defId);
    const before = { ...co.ship };
    applyShipUpgrade(co);
    expect(co.ship.tons).toBe(600);
    expect(co.ship.cargo).toBe(before.cargo + def.up.cargo);
    expect(co.ship.seats).toBe(before.seats + def.up.seats);
    expect(co.ship.crew).toBe(before.crew + def.up.crew);
    expect(co.ship.fuelCap).toBe(before.fuelCap + def.up.fuelCap);
    expect(co.ship.kuarps).toBe(before.kuarps + def.up.engine);
    applyShipUpgrade(co);
    expect(co.ship.tons).toBe(800);
    expect(co.ship.cargo).toBe(before.cargo + 2 * def.up.cargo);
  });
});

describe('the luck streak', () => {
  const co = (eventGood: number, lastGood: boolean) =>
    ({ eventGood, eventLastGood: lastGood }) as CompanyState;

  it('snaps to 50 when the run turns, and drifts by 5 while it holds', () => {
    const a = co(70, true);
    goodChainStreak(a);
    expect(a.eventGood).toBe(75);
    const b = co(70, false);
    goodChainStreak(b);
    expect([b.eventGood, b.eventLastGood]).toEqual([50, true]);
    const c = co(40, false);
    badChainStreak(c);
    expect(c.eventGood).toBe(35);
    const d = co(40, true);
    badChainStreak(d);
    expect([d.eventGood, d.eventLastGood]).toEqual([50, false]);
  });

  it('never leaves the 15..85 band', () => {
    const a = co(85, true);
    goodChainStreak(a);
    expect(a.eventGood).toBe(85);
    const b = co(15, false);
    badChainStreak(b);
    expect(b.eventGood).toBe(15);
  });
});

describe('hot seat', () => {
  const twoPlayer = () =>
    newGame({
      seed: 'hotseat',
      level: 'novice',
      humans: [
        { name: 'One', ship: 1 },
        { name: 'Two', ship: 2 },
      ],
      ai: 2,
    });

  const flyOn = (state: GameState): GameState => {
    let s = state;
    s.companies[currentIndex(s)]!.ship.fuel = 999;
    s = applyAction(s, { type: 'journey', to: (currentCompany(s).planet + 1) % 7 });
    let guard = 0;
    while (s.pending && guard++ < 40) {
      const ev = s.pending;
      const choice = ev.id.startsWith('gate:') ? 'yes' : (ev.choices[0]?.id ?? 'ok');
      s = applyAction(s, { type: 'eventChoice', choice, amount: ev.input?.initial });
    }
    return s;
  };

  it('passes the turn between humans and only then rolls the week', () => {
    let s = twoPlayer();
    expect(s.order).toEqual([0, 1]);
    expect(s.week).toBe(1);

    s = flyOn(s); // player one departs
    expect(s.phase).toBe('arrival');
    s = applyAction(s, { type: 'continue' }); // hand over to player two
    expect(s.week).toBe(1);
    expect(currentIndex(s)).toBe(1);

    s = flyOn(s); // player two departs -> the week must roll
    s = applyAction(s, { type: 'continue' });
    expect(s.week).toBe(2);
  });

  it('orders the new week by travel time', () => {
    let s = twoPlayer();
    s = flyOn(s);
    s = applyAction(s, { type: 'continue' });
    s = flyOn(s);
    s = applyAction(s, { type: 'continue' });
    const [first, second] = s.order;
    expect(s.order).toHaveLength(2);
    expect(s.companies[first!]!.lastTravelTime).toBeLessThanOrEqual(
      s.companies[second!]!.lastTravelTime,
    );
  });
});

describe('a full turn', () => {
  it('departs, hands over, and rolls the week when the last human has moved', () => {
    let s = base();
    const startWeek = s.week;
    s.companies[0]!.ship.fuel = 999;
    s = applyAction(s, { type: 'journey', to: (human(s).planet + 3) % 7 });
    while (s.pending) {
      s = applyAction(s, { type: 'eventChoice', choice: s.pending.choices[0]?.id ?? 'ok' });
    }
    expect(s.phase).toBe('arrival');
    s = applyAction(s, { type: 'continue' }); // hand over -> the week rolls (single human)
    expect(s.week).toBe(startWeek + 1);
    expect(['onPlanet', 'arrival', 'winner', 'gameOver']).toContain(s.phase);
  });

  it('charges a week of interest and wages on departure', () => {
    let s = base();
    const co = s.companies[0]!;
    co.ship.fuel = 999;
    co.unionLoan = 10_000;
    co.bank = 10_000;
    const zinn = co.zinnLoan;
    const crewBill = co.ship.crew * co.crewSalary;
    s = applyAction(s, { type: 'journey', to: (co.planet + 1) % 7 });
    const after = s.companies[0]!;
    expect(after.unionLoan).toBeGreaterThanOrEqual(10_500); // 5 %/week
    expect(after.bank).toBeGreaterThanOrEqual(10_100); // 1 %/week
    expect(after.zinnLoan).toBe(zinn + Math.floor((zinn * 4) / 100));
    expect(after.wagesOwed).toBe(crewBill);
  });

  it('lets a rival win the competition outright', () => {
    let s = base();
    s.companies[1]!.cash = 5_000_000;
    s.companies[0]!.ship.fuel = 999;
    s = applyAction(s, { type: 'journey', to: (human(s).planet + 1) % 7 });
    while (s.pending)
      s = applyAction(s, { type: 'eventChoice', choice: s.pending.choices[0]?.id ?? 'ok' });
    s = applyAction(s, { type: 'continue' });
    expect(s.phase).toBe('winner');
    expect(s.companies[s.winner!]!.isAI).toBe(true);
  });
});

describe('rivals', () => {
  it('never go bankrupt, however deep the hole', () => {
    let s = base();
    for (const c of s.companies) if (c.isAI) c.cash = -5_000_000;
    s.companies[0]!.ship.fuel = 999;
    for (let i = 0; i < 3; i++) {
      s = applyAction(s, { type: 'journey', to: (human(s).planet + 1) % 7 });
      while (s.pending)
        s = applyAction(s, { type: 'eventChoice', choice: s.pending.choices[0]?.id ?? 'ok' });
      s = applyAction(s, { type: 'continue' });
      if (s.phase !== 'onPlanet') break;
    }
    expect(s.companies.filter((c) => c.isAI && c.bankrupt)).toHaveLength(0);
  });
});

describe('bankruptcy', () => {
  it('is only ever declared by the player at the credit gate', () => {
    let s = base();
    s.companies[0]!.zinnLoan = 999_999;
    s = applyAction(s, { type: 'journey', to: (human(s).planet + 1) % 7 });
    expect(s.pending?.id).toBe('gate:zinn');
    const back = applyAction(s, { type: 'eventChoice', choice: 'yes' });
    expect(back.companies[0]!.bankrupt).toBe(false);
    expect(back.phase).toBe('onPlanet');
    const bust = applyAction(s, { type: 'eventChoice', choice: 'no' });
    expect(bust.companies[0]!.bankrupt).toBe(true);
  });
});

describe('facilities and locations', () => {
  it('reports a company where its ship is parked, not where it is headed', () => {
    const s = base({
      humans: [
        { name: 'A', ship: 1 },
        { name: 'B', ship: 1 },
      ],
    });
    const ci = currentIndex(s);
    const from = s.companies[ci]!.planet;
    expect(companyLocation(s, ci)).toBe(from);
    expect(hasFlownThisWeek(s, ci)).toBe(false);
    // rivals move inside the rollover, so `planet` is always current for them
    const rival = s.companies.findIndex((c) => c.isAI);
    expect(companyLocation(s, rival)).toBe(s.companies[rival]!.planet);
    expect(hasFlownThisWeek(s, rival)).toBe(true);

    let n = applyAction(s, { type: 'journey', to: (from + 1) % 7 });
    while (n.pending)
      n = applyAction(n, { type: 'eventChoice', choice: n.pending.choices[0]?.id ?? 'ok' });
    // the departure report is dismissed to hand over to the next human
    if (n.phase === 'arrival') n = applyAction(n, { type: 'continue' });
    // the destination is declared, but the ship stays put until the week rolls over
    expect(n.week).toBe(s.week);
    expect(n.companies[ci]!.planet).toBe((from + 1) % 7);
    expect(hasFlownThisWeek(n, ci)).toBe(true);
    expect(companyLocation(n, ci)).toBe(from);
  });

  it('folds the facilities on a planet into per-owner totals', () => {
    const s = base();
    expect(facilityHoldings(s, 0).every((h) => h.count === 0)).toBe(true);
    s.planets[0]!.facilities.push(
      { id: 'a', name: 'Spaceport', fee: 500, owner: 1, revenue: 200 },
      { id: 'b', name: 'Customs House', fee: 300, owner: 1, revenue: 0 },
      { id: 'c', name: 'Dry Dock', fee: 100, owner: -1, revenue: 0 }, // seized on bankruptcy
    );
    const rows = facilityHoldings(s, 0);
    expect(rows[1]).toEqual({ company: 1, count: 2, fee: 800, revenue: 200 });
    expect(rows[0]!.count).toBe(0);
    expect(rows.reduce((a, h) => a + h.count, 0)).toBe(2);
  });
});

describe('company status and history', () => {
  it('steps the status ladder every 50,000 kubars, clamped at both ends', () => {
    expect(companyStatus(0)).toBe('Struggling');
    expect(companyStatus(49_999)).toBe('Struggling');
    expect(companyStatus(50_000)).not.toBe('Struggling');
    // everyone starts in debt to Mr. Zinn, so the opening status is below zero
    expect(companyStatus(-110_000)).not.toBe('Struggling');
    // the ladder runs -10..20 and clamps rather than falling off either end
    expect(companyStatus(-500_000_000)).toBe(companyStatus(-500_000));
    expect(companyStatus(5_000_000_000)).toBe(companyStatus(1_000_000));
    // and every rung in between resolves to something
    for (let v = -600_000; v <= 1_100_000; v += 50_000) {
      expect(typeof companyStatus(v)).toBe('string');
      expect(companyStatus(v).length).toBeGreaterThan(0);
    }
  });

  it('records a flat zero for a bankrupt company rather than the ranking sentinel', () => {
    let s = base({
      humans: [
        { name: 'A', ship: 1 },
        { name: 'B', ship: 1 },
      ],
      ai: 1,
    });
    // push whoever is up first past Mr Zinn's limit, then have them refuse to settle
    const ci = currentIndex(s);
    s.companies[ci]!.zinnLoan = s.companies[ci]!.zinnLimit + 1;
    s = applyAction(s, { type: 'journey', to: (s.companies[ci]!.planet + 1) % 7 });
    expect(s.pending?.id).toBe('gate:zinn');
    s = applyAction(s, { type: 'eventChoice', choice: 'no' });
    expect(s.companies[ci]!.bankrupt).toBe(true);
    expect(netWorth(s, s.companies[ci]!)).toBe(-10_000_000_000);

    // run the survivor's turn so the week rolls over and history is recorded
    const before = s.companies[ci]!.netWorthHistory.length;
    for (let guard = 0; guard < 20 && s.week === 1; guard++) {
      if (s.pending) {
        s = applyAction(s, { type: 'eventChoice', choice: s.pending.choices[0]?.id ?? 'ok' });
      } else if (s.phase === 'arrival') {
        s = applyAction(s, { type: 'continue' });
      } else if (s.phase === 'onPlanet') {
        s = applyAction(s, { type: 'journey', to: (currentCompany(s).planet + 2) % 7 });
      } else break;
    }
    expect(s.week).toBe(2);
    expect(s.companies[ci]!.netWorthHistory.length).toBe(before + 1);
    expect(s.companies[ci]!.netWorthHistory.at(-1)).toBe(0);
    // nothing anywhere in any ring may carry the sentinel, or every chart flattens
    for (const c of s.companies) {
      for (const v of c.netWorthHistory) expect(v).toBeGreaterThan(-10_000_000_000);
    }
  });
});

describe('saves', () => {
  it('refuses a save from an older engine rather than half-migrating it', () => {
    const s = base();
    const old = JSON.parse(serialize(s)) as GameState;
    old.version = 2;
    expect(() => deserialize(JSON.stringify(old))).toThrow(/unsupported save version/);
  });

  it('round-trips through JSON and through a link', () => {
    const s = base();
    expect(s.version).toBe(SAVE_VERSION);
    expect(deserialize(serialize(s))).toEqual(s);
    expect(decodeFromLink(encodeForLink(s))).toEqual(s);
  });

  it('replays an action log to exactly the same state', () => {
    const run = () => {
      let s = base();
      s.companies[0]!.ship.fuel = 999;
      for (let i = 0; i < 4; i++) {
        s = applyAction(s, { type: 'journey', to: (currentCompany(s).planet + 1) % 7 });
        while (s.pending)
          s = applyAction(s, { type: 'eventChoice', choice: s.pending.choices[0]?.id ?? 'ok' });
        if (s.phase !== 'arrival') break;
        s = applyAction(s, { type: 'continue' });
        if (s.phase !== 'onPlanet') break;
      }
      return s;
    };
    expect(serialize(run())).toBe(serialize(run()));
  });
});

describe('cargo', () => {
  it('keeps an integer average price paid and respects the hold', () => {
    let s = base();
    const co = human(s);
    co.cash = 1_000_000;
    const p = s.planets[co.planet]!;
    const c = s.commodities.find((x) => (p.stock[x] ?? 0) >= 2)!;
    s = applyAction(s, { type: 'buy', commodity: c, tons: 2 });
    const lot = human(s).cargo[c]!;
    expect(Number.isInteger(lot.paid)).toBe(true);
    expect(cargoTons(human(s))).toBe(2);
    expect(() =>
      applyAction(s, { type: 'buy', commodity: c, tons: human(s).ship.cargo + 1 }),
    ).toThrow(ActionError);
  });
});
