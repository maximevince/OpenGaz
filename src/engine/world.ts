/**
 * The weekly world update: share prices, news, weather,
 * supply drift, availability, prices, fuel, market shocks and the rival news ticker.
 * Every function here runs exactly once per week, in the order `endWeek` calls them.
 */
import { COMMODITIES, commoditiesInCat, type CommodityId } from './data/commodities';
import { hazardFromWeather, hostileFromNews } from './data/hazards';
import { LEVEL_BY_ID } from './data/levels';
import { PLANET_BY_ID } from './data/planets';
import { fmt, refreshPlanetPrices, rollAvailability } from './economy';
import type { Rng } from './rng';
import type { GameState, LogEntry, PlanetState } from './types';

/** `about` names the rival a line concerns; see the note on the same helper in ai.ts. */
function news(state: GameState, text: string, about?: number, header?: string): void {
  state.log.push({ week: state.week, company: -1, kind: 'news', text, about, header });
}

/**
 * This week's world news that is *about* a rival — the lines the rollover deals out as cards,
 * each with its company's portrait and theme, before the next turn starts.
 */
export function rivalNews(state: GameState): LogEntry[] {
  return state.log.filter(
    (l) => l.company === -1 && l.week === state.week && l.about !== undefined,
  );
}

/* ------------------------------------------------------------ stock market */

/**
 * Weekly share prices. Trend is an integer 0..100 read as
 * "chance out of 95 that the week is up"; bull runs climb +5 to 85, bear runs fall -5 to 15,
 * and a reversal snaps to 51/50. Below 250 the slide is near-certain. Crash at <= 0.
 */
export function stepStockMarket(state: GameState, r: Rng): void {
  for (const p of state.planets) {
    const ex = p.exchange;
    if (ex.crashed) {
      ex.crashed = false;
      ex.trend = 50;
      ex.price = 1000;
      ex.history.push(ex.price);
      news(state, `${PLANET_BY_ID[p.id].exchange} reopens for trading at 1,000 kubars a share.`);
    } else {
      const prev = ex.price;
      let delta: number;
      if (prev < 250) {
        delta = r.fint(50, 75);
        ex.trend = 1;
      } else {
        delta = r.fint(prev * 0.01, prev * 0.1);
      }
      if (r.fint(1, 95) <= ex.trend) {
        ex.trend = ex.trend > 50 ? Math.min(ex.trend + 5, 85) : 51;
        ex.price = prev + delta;
      } else {
        ex.trend = ex.trend <= 50 ? Math.max(ex.trend - 5, 15) : 50;
        ex.price = Math.max(prev - delta, 0);
      }
      ex.history.push(ex.price);
    }
    if (ex.price <= 0) {
      ex.crashed = true;
      ex.price = 0;
      news(
        state,
        `CRASH! ${PLANET_BY_ID[p.id].exchange} has collapsed. Every share on it is worthless.`,
      );
    }
    if (ex.history.length > 60) ex.history.shift();
  }
}

/* ------------------------------------------------------------------- news */

/**
 * The News Center roll. 15% of weeks from week 4 the story is a stock story
 * (1000..1003) that moves one exchange; otherwise it is flavour that can still summon a
 * hostile encounter.
 */
export function rollNewsEvent(state: GameState, r: Rng): void {
  state.newsData = r.fint(1, 100);
  state.newsPlanet = r.fint(0, 6);
  const p = state.planets[state.newsPlanet]!;
  if (r.fint(1, 100) <= 15 && state.week >= 4 && !p.exchange.crashed) {
    state.news = r.fint(1000, 1003);
    const ex = p.exchange;
    const name = PLANET_BY_ID[p.id].exchange;
    const pct = state.newsData / 4 + 25; // 25.25 .. 50
    if (state.news === 1000) {
      if (ex.price > 250) {
        ex.price = Math.floor(ex.price * (1 + pct / 100));
        ex.trend = 50;
        news(state, `${name} surges ${Math.round(pct)}% on unexpectedly good news.`);
      } else {
        state.news = r.fint(1, 124);
      }
    } else if (state.news === 1001) {
      if (ex.price > 250) {
        ex.price = Math.floor(ex.price * (1 - pct / 100));
        ex.trend = 50;
        news(state, `${name} plunges ${Math.round(pct)}% after a grim announcement.`);
      } else {
        state.news = r.fint(1, 124);
      }
    } else if (state.news === 1002) {
      ex.trend = ex.trend <= 50 ? 0 : 100;
      news(state, `Analysts issue a dramatic call on ${name}. The mood is now absolute.`);
    } else {
      ex.trend = ex.trend > 50 ? 100 : 0;
      news(state, `Traders on ${name} have made up their minds, and there is no talking to them.`);
    }
  } else {
    state.news = r.fint(1, 124);
  }
}

/** Weather Bureau roll. Ids 1-10 and 61-70 are the ten real hazards. */
export function rollWeather(state: GameState, r: Rng): void {
  state.weather = r.fint(1, 70);
  state.weatherPlanet = r.fint(0, 6);
}

/* --------------------------------------------------------------- commodities */

/** Supply random walk: `comR += ±fint(0,20)`, clamped 0..100. */
export function economicChange(state: GameState, r: Rng): void {
  for (const p of state.planets) {
    for (const c of state.commodities) {
      const delta = r.fint(1, 2) === 1 ? r.fint(0, 20) : -r.fint(0, 20);
      p.supply[c] = Math.min(100, Math.max(0, (p.supply[c] ?? 50) + delta));
    }
  }
}

/**
 * Re-roll every planet's stock from scratch, applying and then clearing
 * the accumulated commodity-advertising pressure.
 */
export function commodityAvailable(state: GameState, r: Rng): void {
  for (const p of state.planets) {
    for (const c of state.commodities) {
      p.stock[c] = rollAvailability(p.supply[c] ?? 50, p.advertC, r);
    }
    p.advertC = 0;
  }
}

/** Recompute every price from the new supply. */
export function commodityPrice(state: GameState): void {
  for (const p of state.planets) refreshPlanetPrices(state, p);
}

/** Fuel prices are re-rolled independently every week. */
export function rollFuelPrices(state: GameState, r: Rng): void {
  for (const p of state.planets) {
    p.fuelPrice = r.fint(state.econ.fuelPriceRange, state.econ.fuelPriceRange * 10);
  }
}

/* -------------------------------------------------------------- market news */

/**
 * The weekly market shock, rolled from week 5. It hits the deterministic planet
 * `week % 7`: a whole category (or everything) is dumped on the market or stripped from it by
 * overwriting prices directly — supply is untouched, so prices snap back next week.
 */
export function gameEvents(state: GameState, r: Rng): void {
  state.gameEvent = r.fint(1, 20);
  const e = state.gameEvent;
  const pi = state.week % 7;
  const p = state.planets[pi];
  if (!p) return;
  const pname = PLANET_BY_ID[p.id].name;
  const difficulty = LEVEL_BY_ID(state.settings.level).difficulty;
  const humans = state.companies.filter((c) => !c.isAI && !c.bankrupt);
  const avgTons = humans.length
    ? Math.floor(humans.reduce((s, c) => s + c.ship.tons, 0) / humans.length)
    : 400;

  const glut = (ids: CommodityId[], label: string) => {
    for (const c of ids) {
      const k = COMMODITIES.find((x) => x.id === c)!.rank;
      p.price[c] = (difficulty + 1) * 5 * k + r.fint(0, 3);
      p.stock[c] = (p.stock[c] ?? 0) + avgTons + r.fint(10, 1000);
    }
    news(state, `${label} floods the markets on ${pname}. Prices there have hit the floor.`);
  };
  const shortage = (ids: CommodityId[], label: string) => {
    for (const c of ids) {
      const k = COMMODITIES.find((x) => x.id === c)!.rank;
      p.price[c] = 40 * k - r.fint(0, 3);
      p.stock[c] = r.fint(1, 4);
    }
    news(state, `${label} has all but vanished from ${pname}. Traders there are paying anything.`);
  };
  const rate = (
    k: 'passTax' | 'importTariff' | 'exportTariff',
    d: number,
    lo: number,
    hi: number,
    label: string,
  ) => {
    const cur = state.econ[k];
    if (d > 0 ? cur >= hi : cur <= lo) return;
    state.econ[k] = cur + d;
    news(state, `Imperial decree: ${label} ${d > 0 ? 'raised' : 'lowered'} to ${state.econ[k]}%.`);
  };

  switch (e) {
    case 1:
      return glut(commoditiesInCat(0), 'A record harvest');
    case 2:
      return glut(commoditiesInCat(1), 'A factory glut');
    case 3:
      return glut(commoditiesInCat(2), 'A mining boom');
    case 4:
      return shortage(commoditiesInCat(0), 'A failed harvest means food');
    case 5:
      return shortage(commoditiesInCat(1), 'A strike means manufactured goods');
    case 6:
      return shortage(commoditiesInCat(2), 'A mine collapse means raw materials');
    case 7: {
      state.econ.fuelPriceRange = Math.floor(state.econ.fuelPriceRange * 1.2);
      for (const pl of state.planets) pl.fuelPrice = state.econ.fuelPriceRange * 10 - r.fint(0, 20);
      return news(state, 'Ionic Fuel crisis! Prices spike across every colony.');
    }
    case 8: {
      if (state.econ.fuelPriceRange < 15) return;
      state.econ.fuelPriceRange = Math.floor(state.econ.fuelPriceRange * 0.8);
      for (const pl of state.planets) pl.fuelPrice = state.econ.fuelPriceRange + r.fint(0, 20);
      return news(state, 'New Ionic Fuel wells come online. Fuel is cheap everywhere.');
    }
    case 9:
      return rate('passTax', 1, 0, 50, 'the passenger tax');
    case 10:
      return rate('exportTariff', 1, 1, 15, 'the export tariff');
    case 11:
      return rate('importTariff', 1, 1, 15, 'the import tariff');
    case 12:
      return rate('passTax', -1, 0, 50, 'the passenger tax');
    case 13:
      return rate('exportTariff', -1, 2, 15, 'the export tariff');
    case 14:
      return rate('importTariff', -1, 2, 15, 'the import tariff');
    case 15:
      return glut(state.commodities, 'An Imperial surplus auction: goods of every description');
    case 16:
      return shortage(state.commodities, 'A blockade means absolutely everything');
    default:
      return; // 17..20: a quiet week
  }
}

/* ------------------------------------------------------- rival news ticker */

/** Good ids in the 1..108 rival ticker. Everything else is bad or neutral. */
const TICKER_GOOD = new Set([
  1, 3, 5, 14, 15, 16, 17, 21, 29, 30, 31, 32, 33, 34, 37, 38, 40, 44, 45, 49, 50, 77, 78, 79, 80,
  81, 82, 87, 90, 91, 92, 93, 94, 95, 96, 97, 98, 101, 103, 104, 105, 106, 107, 108,
]);
const TICKER_BAD = new Set([
  2, 4, 8, 11, 12, 13, 19, 46, 47, 48, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65,
  66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 102,
]);

/** One rival company gets a windfall or a setback each week. */
export function opponentEvents(state: GameState, r: Rng): void {
  const ais = state.companies.map((c, i) => (c.isAI ? i : -1)).filter((i) => i >= 0);
  if (!ais.length) return;
  const ci = ais[r.fint(0, ais.length - 1)]!;
  const co = state.companies[ci]!;
  const e = r.fint(1, 108);
  if (e === 10 || e === 18) {
    co.ship.kuarps += 1;
    return news(state, `${co.name} has fitted a faster engine.`, ci, `${co.name} Buys an Engine`);
  }
  if (TICKER_GOOD.has(e)) {
    const x = 2 * r.fint(25, 75) * co.ship.tons;
    co.cash += x;
    return news(
      state,
      `${co.name} reports an excellent week: ${fmt(x)} kubars to the good.`,
      ci,
      `A Good Week for ${co.name}`,
    );
  }
  if (TICKER_BAD.has(e)) {
    const x = r.fint(25, 75) * co.ship.tons;
    co.cash -= x;
    return news(
      state,
      `${co.name} has had a costly week: ${fmt(x)} kubars written off.`,
      ci,
      `A Bad Week for ${co.name}`,
    );
  }
}

/** Convenience for the Explore screen: is this week's weather a real hazard? */
export function weatherIsHazard(state: GameState): boolean {
  return state.weather <= 10 || (state.weather >= 61 && state.weather <= 70);
}

export function planetName(state: GameState, i: number): string {
  const p: PlanetState | undefined = state.planets[i];
  return p ? PLANET_BY_ID[p.id].name : '';
}

/* ------------------------------------------------- Explore screen readouts */

/**
 * The News Center headline for this week. Beyond flavour it carries one real
 * warning: a story about a hostile group near a planet guarantees that encounter on any
 * unlucky flight to or from it.
 */
export function newsHeadline(state: GameState): string {
  const where = planetName(state, state.newsPlanet);
  const p = state.planets[state.newsPlanet];
  if (state.news >= 1000) {
    const ex = p ? PLANET_BY_ID[p.id].exchange : 'the exchange';
    if (state.news === 1000) return `Investors pile into ${ex} after a surprise announcement.`;
    if (state.news === 1001) return `Panic selling on ${ex} as bad numbers leak.`;
    if (state.news === 1002) return `Analysts turn decisively on ${ex}. Nobody is hedging.`;
    return `Sentiment on ${ex} has hardened. The traders there have stopped arguing.`;
  }
  const hostile = hostileFromNews(state.news);
  if (hostile) {
    return `WARNING: ${hostile.name} have been sighted on the routes around ${where}. Captains are advised to insure their cargo.`;
  }
  if (p) {
    // 36/74 oversupply, 37/75 shortage, 38/76 the exchange's mood
    const sorted = state.commodities
      .map((c) => [c, p.supply[c] ?? 50] as const)
      .sort((a, b) => a[1] - b[1]);
    const scarce = sorted[0];
    const plenty = sorted[sorted.length - 1];
    if ((state.news === 36 || state.news === 74) && plenty) {
      const name = COMMODITIES.find((c) => c.id === plenty[0])!.name;
      return `Markets on ${where} are swimming in ${name}. Buyers are staying home.`;
    }
    if ((state.news === 37 || state.news === 75) && scarce) {
      const name = COMMODITIES.find((c) => c.id === scarce[0])!.name;
      return `${name} has all but run out on ${where}. Traders there are paying over the odds.`;
    }
    if (state.news === 38 || state.news === 76) {
      const t = p.exchange.trend;
      const mood = t > 60 ? 'bullish' : t < 40 ? 'bearish' : 'undecided';
      return `Word from the trading floor on ${where}: the market there is ${mood}.`;
    }
  }
  const filler = [
    `A ceremonial kubar was struck on ${where} this week. It is very shiny and worth exactly one kubar.`,
    'Emperor Dred opened a new wing of the palace. Attendance was, as ever, compulsory.',
    "The Traders' Union reminds captains that unpaid tariffs are noticed eventually.",
    `A captain on ${where} claims to have been bitten by her own cargo. Enquiries continue.`,
    'Weather across the colonies is expected to be weather-like.',
    'The Ministry of Time confirms that this week is one week long.',
  ];
  return filler[state.news % filler.length]!;
}

/** The Weather Bureau forecast. Only ten of the seventy readings actually bite. */
export function weatherForecast(state: GameState): string {
  const hazard = hazardFromWeather(state.weather);
  const where = planetName(state, state.weatherPlanet);
  if (hazard) {
    return `HAZARD WARNING: ${hazard} is sitting over the approaches to ${where}. Any ship flying to or from ${where} risks running straight into it — insure the trip.`;
  }
  const calm = [
    `Clear skies over ${where} and mild solar weather everywhere else.`,
    `A little ion drizzle around ${where}; nothing a hull cannot shrug off.`,
    'Unremarkable conditions across all seven worlds. The Bureau is quietly pleased.',
    `Some turbulence reported near ${where}, well within tolerance.`,
    `The forecast for ${where} is dull, which the Bureau considers a triumph.`,
  ];
  return calm[state.weather % calm.length]!;
}
