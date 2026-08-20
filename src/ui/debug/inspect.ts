/**
 * Read-only views of the game state for the inspector.
 *
 * Everything here is a projection: it derives, it never mutates. The tables want the same
 * numbers the engine works with, so they call the engine's own selectors (`netWorth`,
 * `cargoTons`, `facilityHoldings`) rather than re-deriving them — an inspector that computes
 * net worth its own way would eventually disagree with the game and send someone hunting a
 * bug that is only in the panel.
 */
import {
  cargoTons,
  cargoValue,
  COMMODITY_BY_ID,
  companyLocation,
  currentIndex,
  encodeForLink,
  facilityHoldings,
  LEVEL_BY_ID,
  netWorth,
  PLANET_BY_ID,
  planetName,
  priceRange,
  serialize,
  SHIP_BY_ID,
  warehouseTons,
  type Action,
  type CommodityId,
  type GameState,
} from '../../engine';

export interface CompanyRow {
  i: number;
  name: string;
  ai: string;
  planet: string;
  cash: number;
  bank: number;
  debt: number;
  netWorth: number;
  cargo: string;
  store: number;
  pax: string;
  fuel: string;
  flags: string;
  current: boolean;
}

export function companyRows(s: GameState): CompanyRow[] {
  const cur = currentIndex(s);
  return s.companies.map((co, i) => ({
    i,
    name: co.name,
    ai: co.isAI ? `${co.aiStyle ?? '?'} ${co.aiIq}%` : 'human',
    // where the ship actually is: a human who has flown is still parked on planetLast
    planet: planetName(s, companyLocation(s, i)) || '—',
    cash: co.cash,
    bank: co.bank,
    debt: co.unionLoan + co.zinnLoan,
    netWorth: netWorth(s, co),
    cargo: `${cargoTons(co)}/${co.ship.cargo}`,
    store: s.planets.reduce((t, _, pi) => t + warehouseTons(co, pi), 0),
    pax: `${co.passengers}/${co.ship.seats}`,
    fuel: `${co.ship.fuel}/${co.ship.fuelCap}`,
    flags: [
      co.bankrupt && 'bankrupt',
      co.insured && 'insured',
      co.arrivalPending && 'arrival',
      co.specialUsed && 'special-used',
      co.stockBoughtThisWeek && 'stock-done',
      co.paxPickedUp && 'pax-done',
      co.travelDelayed !== 1 && `delay×${co.travelDelayed}`,
      co.sabotageDamage !== 0 && `sabotage ${co.sabotageDamage}`,
    ]
      .filter(Boolean)
      .join(' '),
    current: i === cur,
  }));
}

/** The numbers behind one company that the row has no room for. */
export function companyDetail(s: GameState, i: number): Record<string, unknown> | null {
  const co = s.companies[i];
  if (!co) return null;
  return {
    id: co.id,
    ship: `${SHIP_BY_ID(co.ship.defId).name} — ${co.ship.tons}t hull, ${co.ship.kuarps} kuarps, crew ${co.ship.crew}`,
    cargoValue: cargoValue(co),
    savings: `${co.bank} @ ${co.savingsRate}%/wk (+${co.savingsInterest})`,
    union: `${co.unionLoan}/${co.unionLimit} @ ${co.loanRate}%/wk (+${co.loanInterest})`,
    zinn: `${co.zinnLoan}/${co.zinnLimit} @ ${co.zinnRate}%/wk (+${co.zinnInterest})`,
    owed: `wages ${co.wagesOwed}, pax tax ${co.taxOwedPassenger}, tariff ${co.taxOwedTariff}`,
    crewSalary: co.crewSalary,
    insurance: `${co.insured ? 'covered' : 'uncovered'} — quote ${co.insuranceCost}, risk class ${co.insurancePriceRange}`,
    tickets: `price ${co.ticketPrice}, ${co.paxWaiting} waiting at ${co.paxPrice}`,
    ads: `pax tier ${co.adPassenger} (${co.advertInvestedP}k, ${co.advertP} demand), goods tier ${co.adCommodity} (${co.advertInvestedC}k)`,
    travel: `at ${co.planet}, was at ${co.planetLast}, last trip ${co.lastTravelTime}w`,
    events: `good ${co.eventGood}% (last ${co.eventLastGood ? 'good' : 'bad'}), roll ${co.random}`,
    ai: co.isAI ? `index ${co.aiIndex}, carrying ${co.aiCargo}t of ${co.aiTag ?? '—'}` : '—',
    visitProfit: co.visitProfit,
    inbox: co.inbox.length,
    netWorthHistory: co.netWorthHistory,
  };
}

export interface PlanetRow {
  i: number;
  id: string;
  name: string;
  slot: number;
  special: string;
  fuel: number;
  share: number;
  trend: number;
  crashed: boolean;
  advertC: number;
  facilities: string;
  here: string;
}

export function planetRows(s: GameState): PlanetRow[] {
  return s.planets.map((p, i) => {
    const def = PLANET_BY_ID[p.id];
    const owners = facilityHoldings(s, i)
      .filter((h) => h.count > 0)
      .map((h) => `${s.companies[h.company]?.name ?? '?'}×${h.count} (${h.revenue}k due)`);
    return {
      i,
      id: p.id,
      name: def.name,
      slot: p.slot,
      special: def.special,
      fuel: p.fuelPrice,
      share: p.exchange.price,
      trend: p.exchange.trend,
      crashed: p.exchange.crashed,
      advertC: p.advertC,
      facilities: owners.length ? owners.join(', ') : '—',
      here: s.companies
        .map((co, ci) => (co.planet === i && !co.bankrupt ? `${ci}:${co.name}` : ''))
        .filter(Boolean)
        .join(', '),
    };
  });
}

export type Metric = 'price' | 'supply' | 'stock' | 'band';

export interface MarketCell {
  value: number;
  /** 0..1 position inside the commodity's own price band — drives the heat shading */
  heat: number;
  title: string;
}

export interface MarketRow {
  id: CommodityId;
  name: string;
  cells: MarketCell[];
}

/**
 * The commodity × planet grid. Prices are shaded against each commodity's own band for the
 * current level, which is the only way "is 480 a good price for Gems?" reads at a glance.
 */
export function marketGrid(s: GameState, metric: Metric): MarketRow[] {
  const difficulty = LEVEL_BY_ID(s.settings.level).difficulty;
  return s.commodities.map((id) => {
    const def = COMMODITY_BY_ID[id];
    const band = priceRange(def, difficulty);
    return {
      id,
      name: def.name,
      cells: s.planets.map((p) => {
        const price = p.price[id] ?? 0;
        const supply = p.supply[id] ?? 0;
        const stock = p.stock[id] ?? 0;
        const value =
          metric === 'price'
            ? price
            : metric === 'supply'
              ? supply
              : metric === 'stock'
                ? stock
                : 0;
        const heat =
          metric === 'price'
            ? clamp01((price - band.min) / Math.max(1, band.max - band.min))
            : metric === 'supply'
              ? clamp01(supply / 100)
              : clamp01(stock / 200);
        return {
          value,
          heat,
          title: `${def.name} on ${PLANET_BY_ID[p.id].name}: price ${price} (band ${band.min}–${band.max}), supply ${supply}, ${stock}t on the market`,
        };
      }),
    };
  });
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

/** Price band per commodity at this level — the reference the grid is shaded against. */
export function bands(s: GameState): { name: string; min: number; max: number }[] {
  const difficulty = LEVEL_BY_ID(s.settings.level).difficulty;
  return s.commodities.map((id) => {
    const def = COMMODITY_BY_ID[id];
    return { name: def.name, ...priceRange(def, difficulty) };
  });
}

export interface Sizes {
  json: number;
  link: number;
  log: number;
}

/**
 * How big the state is on the wire. The play-by-link URL carries the whole game, and browsers
 * and chat clients start mangling links past a couple of thousand characters, so this is a
 * number worth watching while the state grows.
 */
export function sizes(s: GameState): Sizes {
  return { json: serialize(s).length, link: encodeForLink(s).length, log: s.log.length };
}

/** A one-line name for an action, for the trace list. */
export function describeAction(a: Action): string {
  switch (a.type) {
    case 'buy':
    case 'sell':
    case 'store':
    case 'retrieve':
      return `${a.type} ${a.tons}t ${COMMODITY_BY_ID[a.commodity].name}`;
    case 'bankDeposit':
    case 'bankWithdraw':
    case 'unionBorrow':
    case 'unionRepay':
    case 'zinnRepay':
      return `${a.type} ${a.amount}`;
    case 'buyFuel':
      return `buyFuel ${a.tons}t`;
    case 'stockBuy':
    case 'stockSell':
      return `${a.type} ${a.shares}`;
    case 'setTicketPrice':
      return `setTicketPrice ${a.price}`;
    case 'advertise':
      return `advertise pax ${a.passenger} / goods ${a.commodity}`;
    case 'journey':
      return `journey -> ${a.to}`;
    case 'eventChoice':
      return `eventChoice ${a.choice}${a.amount === undefined ? '' : ` (${a.amount})`}`;
    default:
      return a.type;
  }
}
