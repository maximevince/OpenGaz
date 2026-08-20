/**
 * Which sound belongs where.
 *
 * Kept apart from `sound.ts` so the mapping is plain data with no browser or audio dependency:
 * it can be unit-tested, and the sound-test screen can enumerate it. `sound.ts` turns an id into
 * an actual noise (pack sample, else a synth preset).
 */
import type { Action, ActionType, CommodityId } from '../engine';

/** Sound played when a screen opens. Mirrors the service characters greeting you. */
export const SCREEN_SOUND: Record<string, string> = {
  market: 'market',
  supply: 'market',
  warehouse: 'warehouse',
  passengers: 'pickup',
  advertise: 'advert',
  crew: 'crew',
  taxes: 'tax',
  insurance: 'insure',
  explore: 'special',
  stock: 'stock',
  money: 'money',
  bank: 'bank',
  loan: 'loan',
  zinn: 'zinn',
  fuel: 'fuel',
  map: 'map',
  charts: 'map',
};

/** Sound played after an action is accepted. Falls through to nothing when unlisted. */
export const ACTION_SOUND: Partial<Record<ActionType, string>> = {
  store: 'warehouse',
  retrieve: 'warehouse',
  setTicketPrice: 'pickup',
  pickupPassengers: 'pickup',
  advertise: 'advert',
  payCrew: 'crew',
  payTaxes: 'tax',
  buyInsurance: 'insure',
  bankDeposit: 'bank',
  bankWithdraw: 'bank2',
  unionBorrow: 'loan',
  unionRepay: 'coins',
  zinnRepay: 'zinn',
  buyFuel: 'fuel',
  stockBuy: 'stock',
  stockSell: 'stock2',
  journey: 'rocket',
  special: 'special',
  tutorialAdvance: 'unlock',
};

/**
 * The sound an event dialog opens with. Auctions and the two credit gates have a voice of their
 * own; everything else is coloured by the event's mood.
 */
export function eventSound(id: string | undefined, mood: string | undefined): string {
  if (id?.startsWith('auction:')) return 'auction';
  if (id === 'gate:zinn') return 'zinn';
  if (id === 'gate:union') return 'loan';
  return `event.${mood ?? 'neutral'}`;
}

/** Explore tab -> sound. The tabs are separate rooms of the city in all but name. */
export const EXPLORE_SOUND: Record<string, string> = {
  special: 'special',
  news: 'news',
  weather: 'weather',
  time: 'clock',
  history: 'history',
};

/**
 * The trade sound, per the original's rule: selling below what you paid is a bad deal, selling
 * near the top of the commodity's band for a profit is a good deal, and anything else just
 * makes that commodity's own noise.
 *
 * @param price what the market pays per ton right now
 * @param paid  the weighted average you paid per ton (0 when the lot is new)
 * @param max   the top of this commodity's price band
 */
export function dealSound(price: number, paid: number, max: number): 'gooddeal' | 'baddeal' | null {
  if (paid > 0 && price < paid) return 'baddeal';
  if (price >= 0.9 * max && price > paid) return 'gooddeal';
  return null;
}

/** Per-commodity trade sound id — `commodity.gems` and friends. */
export const commoditySound = (c: CommodityId) => `commodity.${c}`;

/**
 * The sound a buy or sell should make. Buying is always the commodity's own noise; selling is
 * the deal verdict when there is one, and the commodity's noise otherwise.
 */
export function tradeSound(
  a: Extract<Action, { type: 'buy' | 'sell' }>,
  price: number,
  paid: number,
  max: number,
): string {
  if (a.type === 'buy') return commoditySound(a.commodity);
  return dealSound(price, paid, max) ?? commoditySound(a.commodity);
}
