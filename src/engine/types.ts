import type { CommodityId } from './data/commodities';
import type { Level } from './data/levels';
import type { AiStyle } from './data/opponents';
import type { PlanetId } from './data/planets';
import type { RngState } from './rng';

export const SAVE_VERSION = 5;

/** Rules whose original releases diverged in meaningful gameplay ways. */
export type Ruleset = 'deluxe1997' | 'steam';

/* ------------------------------------------------------------------ world */

export interface Exchange {
  /** current share price (this week's close) */
  price: number;
  /** weekly closes (oldest first), including current; the stock chart shows the last 15 */
  history: number[];
  /** integer 0..100: chance an up-week is rolled as fint(1,95) <= trend */
  trend: number;
  /** crashed this week: trading refused, shares wiped at turn start, reopens at 1,000 */
  crashed: boolean;
}

export interface Facility {
  id: string;
  name: string;
  /** landing fee charged to visiting rival companies */
  fee: number;
  /** owner company index */
  owner: number;
  /** uncollected revenue waiting for the owner */
  revenue: number;
}

export interface PlanetState {
  id: PlanetId;
  slot: number; // index into MAP_SLOTS
  /** supply rating comR 0..100 per commodity */
  supply: Partial<Record<CommodityId, number>>;
  /** tons currently on the market (comA) */
  stock: Partial<Record<CommodityId, number>>;
  /** current market price per ton (comP) */
  price: Partial<Record<CommodityId, number>>;
  fuelPrice: number;
  /** commodity-advertising tonnage pressure applied at the next weekly restock */
  advertC: number;
  exchange: Exchange;
  facilities: Facility[];
}

/* -------------------------------------------------------------- company */

export interface ShipState {
  defId: number; // SHIPS id
  /** capacities after upgrades / mechanic mods */
  cargo: number;
  seats: number;
  fuelCap: number;
  kuarps: number;
  crew: number;
  /** ship mass class: 400 at start, +200 per upgrade — scales costs & fuel burn */
  tons: number;
  fuel: number; // tons in tank
}

export interface CargoLot {
  tons: number;
  /** average price paid per ton */
  paid: number;
}

export interface CompanyState {
  id: string;
  name: string;
  isAI: boolean;
  aiStyle?: AiStyle;
  /** opponent iQ % (50..175 by level;) — cargo-quantity factor. 0 for humans. */
  aiIq: number;
  /** opponent index 1..6 into OPPONENTS (0 for humans) */
  aiIndex: number;
  /** the commodity the opponent carries / last carried (comTag) */
  aiTag: CommodityId | null;
  /** tons of `aiTag` the opponent is carrying (comS) */
  aiCargo: number;
  /** arrival reports are due at this company's next turn */
  arrivalPending: boolean;
  ship: ShipState;
  cash: number;
  /** savings account */
  bank: number;
  /** integer %/week (1..3) */
  savingsRate: number;
  savingsInterest: number;
  unionLoan: number;
  /** integer %/week */
  loanRate: number;
  loanInterest: number;
  unionLimit: number;
  zinnLoan: number;
  /** integer %/week */
  zinnRate: number;
  zinnInterest: number;
  zinnLimit: number;
  planet: number; // index into state.planets
  planetLast: number;
  /** travel time of the last journey, floored & delayed — orders arrivals */
  lastTravelTime: number;
  /** travel-delay multiplier for next week's travel time (init 1;) */
  travelDelayed: number;
  cargo: Partial<Record<CommodityId, CargoLot>>;
  /** warehouse tons per planet index */
  warehouse: Record<number, Partial<Record<CommodityId, CargoLot>>>;
  /** warehouse capacity — one scalar, the same on every planet */
  warehouseSpace: number;
  ticketPrice: number;
  /** passenger demand computed at the previous departure (passT) */
  paxWaiting: number;
  /** the frozen ticket price those passengers pay (profitPerPassenger) */
  paxPrice: number;
  /** passengers already picked up this stop (passFlag) */
  paxPickedUp: boolean;
  /** passengers on board (paid at pick-up) */
  passengers: number;
  /** chosen ad levels 0..6 (advertFixP / advertFixC) — persist across weeks */
  adPassenger: number;
  adCommodity: number;
  /** kubars actually invested this week (refunded when re-placing) */
  advertInvestedP: number;
  advertInvestedC: number;
  /** passenger-ad demand units = floor(advertInvestedP / 125) */
  advertP: number;
  crewSalary: number;
  wagesOwed: number;
  taxOwedPassenger: number;
  taxOwedTariff: number;
  insured: boolean;
  /** risk class: premium = fint(range, range*1000); grows with upgrades */
  insurancePriceRange: number;
  /** the quoted premium for the next trip (re-rolled every departure) */
  insuranceCost: number;
  /** shares per planet index */
  shares: Record<number, CargoLot>;
  /** one stock purchase per turn (stockFlag; reset at turn start) */
  stockBoughtThisWeek: boolean;
  /** good-event probability 15..85 with streaks */
  eventGood: number;
  eventLastGood: boolean;
  /** per-departure roll 1..100 (P.random) — seeds special prices */
  random: number;
  /** accumulated sabotage damage to show at next arrival (negative = paid by loan) */
  sabotageDamage: number;
  /** planet special already used this visit */
  specialUsed: boolean;
  bankrupt: boolean;
  netWorthHistory: number[];
  /** messages for this company, shown at its next arrival screen */
  inbox: LogEntry[];
  /** running profit shown on the marketplace (this visit) */
  visitProfit: number;
}

/* ---------------------------------------------------------------- game */

export type Phase =
  | 'onPlanet' // current company acts freely
  | 'travel' // journey animation / event resolution
  | 'event' // waiting for a choice on a travel event
  | 'arrival' // reports before the next company
  | 'winner' // a winner may continue the escalating competition or retire
  | 'gameOver';

export interface LogEntry {
  week: number;
  company: number; // -1 = world news
  kind: 'news' | 'event' | 'info' | 'warn' | 'good' | 'bad';
  text: string;
  /** the company this entry is *about*, when that is someone other than its owner */
  about?: number;
}

export interface PendingEvent {
  id: string;
  title: string;
  text: string;
  /** choices offered; empty = just acknowledge */
  choices: { id: string; label: string }[];
  /** optional numeric input (e.g. an auction bid) — sent back as `amount` */
  input?: { label: string; min: number; max: number; initial: number };
  /** portrait id for the UI (semantic asset id without the `portrait.` prefix) */
  portrait?: string;
  /** mood colours the dialog: good (navy), bad (red), neutral (green) */
  mood?: 'good' | 'bad' | 'neutral';
  /** travel events resume the journey afterwards; planet events return to the menu */
  context: 'travel' | 'planet';
  /** free-form data the event resolver needs later */
  data?: Record<string, unknown>;
}

/** In-flight event chain bookkeeping. Lives only while phase='travel'/'event'. */
export interface TravelCtx {
  from: number;
  to: number;
  /** good or bad chain */
  good: boolean;
  /** next event id to test (2..47 ascending / -2..-19 descending) */
  cursor: number;
  /** at least one event fired (streak rule applies only then) */
  fired: boolean;
  /** delay-adding events this chain (for the -19 summary) */
  delays: number;
  /** one of -12..-18 already fired (mutually exclusive) */
  badExclusiveDone: boolean;
  /** good 43 fired — skip 44..47 */
  block4447: boolean;
  /** a bad chain triggered by strike/fuel/audit still counts for the streak */
  badChainForced: boolean;
  /** commodity rolled by good event 34 (Squowk) */
  squowk?: CommodityId;
}

/** Emperor's weekly auction. */
export interface AuctionState {
  kind: 'ship' | 'facility';
  /** facility: planet index; ship: -1 */
  planet: number;
  /** facility: landing fee it will charge */
  fee: number;
  /** facility type 1..100 (names the lot) */
  facilityType: number;
  highBid: number;
  highCompany: number;
  nextBid: number;
  nextCompany: number;
  /** company indices that already placed (or declined) a bid this week */
  responded: number[];
}

/** Last week's auction outcome, reported at the next arrivals. */
export interface AuctionResult {
  /** 1 ship paid, 3 ship on loan, 2 facility paid, 4 facility on loan, -1/-2 tie redo, 0 none */
  code: number;
  kind: 'ship' | 'facility';
  planet: number;
  fee: number;
  facilityType: number;
  highBid: number;
  highCompany: number;
  nextBid: number;
  nextCompany: number;
}

export interface GameSettings {
  level: Level;
  ruleset: Ruleset;
  /** Tutorial level only: features arrive one at a time and their rules stay off until then. */
  tutorial: boolean;
  /** The active win threshold. It increases when a player continues after winning. */
  targetNetWorth: number;
}

export interface GameState {
  version: number;
  rng: RngState;
  settings: GameSettings;
  week: number;
  /** commodities in play — all 18 */
  commodities: CommodityId[];
  planets: PlanetState[]; // 7
  companies: CompanyState[];
  /** turn order this week (human company indices; opponents run inside the week rollover) */
  order: number[];
  turnIndex: number;
  phase: Phase;
  /** destination during travel/arrival */
  destination: number | null;
  pending: PendingEvent | null;
  /** in-flight event chain state */
  travel: TravelCtx | null;
  /** running secret-bid auction, if any */
  auction: AuctionState | null;
  /** last week's auction outcome (for arrival reports / tie redo) */
  auctionLast: AuctionResult | null;
  /** messages queued for the current company's arrival screen */
  arrivalReports: LogEntry[];
  /** the open 'arrival' screen ends the turn (a departure summary) rather than starting one */
  awaitingHandoff: boolean;
  /** profit made on the market since the last departure — shared by everyone */
  sellingProfit: number;
  log: LogEntry[];
  winner: number | null;
  /** global economy state (integer percents; mutable by news/specials) */
  econ: {
    importTariff: number; // % 1..15
    exportTariff: number; // % 1..15
    passTax: number; // % 0..50
    fuelPriceRange: number; // planet fuel price = fint(range, range*10)
  };
  /** how far up the tutorial ladder this game has climbed (1..17); irrelevant once off */
  tutorStage: number;
  /** the current player is owed this week's lesson before the main menu opens */
  tutorPending: boolean;
  /** highest stage whose lesson has actually been read — a re-show is a short recap */
  tutorTaught: number;
  /** weekly news / weather state */
  news: number; // 1..124 (or 1000..1003 stock stories)
  newsData: number; // 1..100 — the week's deterministic seed
  newsPlanet: number; // 0..6
  weather: number; // 1..70
  weatherPlanet: number; // 0..6
  /** weekly market event roll 1..20; hits planet (week % 7) */
  gameEvent: number;
}

/* -------------------------------------------------------------- actions */

export type Action =
  | { type: 'buy'; commodity: CommodityId; tons: number }
  | { type: 'sell'; commodity: CommodityId; tons: number }
  | { type: 'store'; commodity: CommodityId; tons: number } // ship -> warehouse
  | { type: 'retrieve'; commodity: CommodityId; tons: number } // warehouse -> ship
  | { type: 'setTicketPrice'; price: number }
  | { type: 'pickupPassengers' }
  | { type: 'advertise'; passenger: number; commodity: number }
  | { type: 'payCrew' }
  | { type: 'payTaxes' }
  | { type: 'buyInsurance' }
  | { type: 'bankDeposit'; amount: number }
  | { type: 'bankWithdraw'; amount: number }
  | { type: 'unionBorrow'; amount: number }
  | { type: 'unionRepay'; amount: number }
  | { type: 'zinnRepay'; amount: number }
  | { type: 'buyFuel'; tons: number }
  | { type: 'stockBuy'; shares: number }
  | { type: 'stockSell'; shares: number }
  | { type: 'journey'; to: number }
  | { type: 'continueCompetition' }
  | { type: 'retireCompetition' }
  | { type: 'special' } // use this planet's special institution
  | { type: 'eventChoice'; choice: string; amount?: number }
  | { type: 'continue' } // dismiss arrival reports -> next company
  | { type: 'tutorialContinue' } // dismiss this week's lesson
  | { type: 'tutorialAdvance' }; // "Add New Feature" — solo player takes the next stage early

export type ActionType = Action['type'];

export class ActionError extends Error {}
