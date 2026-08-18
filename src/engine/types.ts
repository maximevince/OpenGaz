import type { CommodityId } from './data/commodities';
import type { Level } from './data/levels';
import type { AiStyle } from './data/opponents';
import type { PlanetId } from './data/planets';
import type { RngState } from './rng';

export const SAVE_VERSION = 1;

/* ------------------------------------------------------------------ world */

export interface Exchange {
  price: number;
  /** last N weekly closes (oldest first), including current */
  history: number[];
  /** momentum 0..1: probability next move is up */
  trend: number;
  /** weeks the exchange stays closed after a crash */
  closedFor: number;
}

export interface Facility {
  id: string;
  name: string;
  /** landing fee charged to visiting rival companies */
  fee: number;
  /** owner company index or -1 (government) */
  owner: number;
  /** uncollected revenue waiting for the owner */
  revenue: number;
}

export interface PlanetState {
  id: PlanetId;
  slot: number; // index into MAP_SLOTS
  /** supply rating 0..100 per commodity (only for commodities in play) */
  supply: Partial<Record<CommodityId, number>>;
  /** tons currently on the market */
  stock: Partial<Record<CommodityId, number>>;
  /** current market price per ton */
  price: Partial<Record<CommodityId, number>>;
  fuelPrice: number;
  exchange: Exchange;
  facilities: Facility[];
}

/* -------------------------------------------------------------- company */

export interface ShipState {
  defId: number; // SHIPS id
  /** capacities after class upgrades / mechanic mods */
  cargo: number;
  seats: number;
  fuelCap: number;
  kuarps: number;
  crew: number;
  /** ship class multiplier: 1 = 400-ton, 1.5 = upgraded */
  klass: number;
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
  aiIq: number; // 0..1
  ship: ShipState;
  cash: number;
  bank: number;
  bankRate: number;
  unionLoan: number;
  unionRate: number;
  unionLimit: number;
  zinnLoan: number;
  zinnRate: number;
  zinnLimit: number;
  planet: number; // index into state.planets
  /** last journey travel time (for arrival ordering) */
  lastTravelTime: number;
  cargo: Partial<Record<CommodityId, CargoLot>>;
  /** warehouse tons per planet index */
  warehouse: Record<number, Partial<Record<CommodityId, CargoLot>>>;
  warehouseCap: Record<number, number>;
  ticketPrice: number;
  /** passenger demand rolled on arrival: base and ad bonus (at 1,000 kubars) */
  paxBase: number;
  paxAdBonus: number;
  /** passengers boarded for the next trip */
  passengers: number;
  /** ads bought this week for the next planet (tier index 0..6) */
  adPassenger: number;
  adCommodity: number;
  crewSalary: number;
  wagesOwed: number;
  onStrike: boolean;
  taxOwedPassenger: number;
  taxOwedTariff: number;
  weeksTaxUnpaid: number;
  insured: boolean;
  insurancePremium: number;
  /** shares per planet index */
  shares: Record<number, CargoLot>;
  stockBoughtThisWeek: boolean;
  /** hidden luck 0..1 (probability of a good travel event) */
  luck: number;
  blessed: boolean;
  bankrupt: boolean;
  netWorthHistory: number[];
  /** running profit shown on the marketplace (this visit) */
  visitProfit: number;
  /** tons bought this visit per commodity (sold back at cost = full refund) */
  visitBought: Partial<Record<CommodityId, CargoLot>>;
}

/* ---------------------------------------------------------------- game */

export type Phase =
  | 'onPlanet' // current company acts freely
  | 'travel' // journey animation / event resolution
  | 'event' // waiting for a choice on a travel event
  | 'arrival' // reports before the next company
  | 'gameOver';

export interface LogEntry {
  week: number;
  company: number; // -1 = world news
  kind: 'news' | 'event' | 'info' | 'warn' | 'good' | 'bad';
  text: string;
}

export interface PendingEvent {
  id: string;
  title: string;
  text: string;
  /** choices offered; empty = just acknowledge */
  choices: { id: string; label: string }[];
  /** free-form data the event resolver needs later */
  data?: Record<string, unknown>;
}

export interface GameSettings {
  level: Level;
  targetNetWorth: number;
}

export interface GameState {
  version: number;
  rng: RngState;
  settings: GameSettings;
  week: number;
  /** commodities in play (subset of the 18) */
  commodities: CommodityId[];
  planets: PlanetState[]; // 7
  companies: CompanyState[];
  /** turn order this week (company indices) and cursor */
  order: number[];
  turnIndex: number;
  phase: Phase;
  /** destination during travel/arrival */
  destination: number | null;
  pending: PendingEvent | null;
  /** messages queued for the current company's arrival screen */
  arrivalReports: LogEntry[];
  log: LogEntry[];
  winner: number | null;
  /** global economy modifiers (mutable by news/specials) */
  econ: {
    importTariff: number;
    exportTariff: number;
    passengerTax: number;
  };
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
  | { type: 'eventChoice'; choice: string }
  | { type: 'continue' }; // dismiss arrival reports -> next company

export type ActionType = Action['type'];

export class ActionError extends Error {}
