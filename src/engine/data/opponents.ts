export type AiStyle = 'chaotic' | 'bythebook' | 'cautious' | 'naive' | 'risky' | 'ruthless';

/**
 * The six rival companies. Array order = the original's opponent index i = 1..6;
 * every per-personality table below is keyed on that index.
 */
export interface OpponentDef {
  id: string;
  name: string;
  style: AiStyle;
  blurb: string;
  /** starting engine speed (kuarps) — 5,5,5,4,5,6 for i=1..6 */
  engine: number;
  /** weekly running-cost factor k_i: cash -= k * (shipTons/4) * L (the original,/) */
  weeklyCostK: number;
  /** share-trading: sell everything when the local stockTrend drops below this */
  stockTrendMin: number;
  /** share-trading buy-fraction multiplier (the original: 0.75 for i=1, 0.5 for i=4, else 1) */
  stockMult: number;
  /** ship-purchase odds 1-in-D when 600 t or more behind the human average */
  shipOddsFar: number;
  /** ship-purchase odds 1-in-D when behind but within 600 t */
  shipOddsNear: number;
}

const mk = (
  id: string,
  name: string,
  style: AiStyle,
  blurb: string,
  engine: number,
  weeklyCostK: number,
  stockTrendMin: number,
  stockMult: number,
  shipOddsFar: number,
  shipOddsNear: number,
): OpponentDef => ({
  id,
  name,
  style,
  blurb,
  engine,
  weeklyCostK,
  stockTrendMin,
  stockMult,
  shipOddsFar,
  shipOddsNear,
});

export const OPPONENTS: readonly OpponentDef[] = [
  mk(
    'gizzy',
    'Gizzy Shipping',
    'chaotic',
    'Freewheeling and unpredictable. Nobody knows what Gizzy will do next — least of all Gizzy.',
    5,
    12,
    65,
    0.75,
    13,
    20,
  ),
  mk(
    'tradingcorp',
    'Trading Corp. IV',
    'bythebook',
    'Does everything by the book. Solid, boring, occasionally very rich.',
    5,
    13,
    60,
    1,
    12,
    19,
  ),
  mk(
    'vandergriff',
    'Vandergriff Ltd.',
    'cautious',
    'Old money. Cautious to a fault, but never in debt.',
    5,
    14,
    75,
    1,
    14,
    21,
  ),
  mk(
    'puffer',
    'Puffer Inc.',
    'naive',
    'A plucky start-up that learns from its mistakes. Eventually.',
    4,
    15,
    60,
    0.5,
    15,
    22,
  ),
  mk(
    'roke',
    'Roke Transport',
    'risky',
    'Loves a gamble: fast ships, big bets, wild swings.',
    5,
    11,
    65,
    1,
    11,
    18,
  ),
  mk(
    'hoff',
    'Hoff Meister',
    'ruthless',
    'Ruthless and efficient. The one to beat.',
    6,
    10,
    70,
    1,
    10,
    17,
  ),
];

export const OPPONENT_BY_ID = (id: string): OpponentDef | undefined =>
  OPPONENTS.find((o) => o.id === id);

/**
 * Throwaway lines a rival drops when a human lands on a planet it is already parked on.
 * Picked by the arriving player's weekly `random` roll, so the same week always reads the same.
 */
export const RIVAL_TAUNTS: readonly string[] = [
  'They wave from the next landing pad, a little too cheerfully.',
  'Their loadmaster makes a show of checking a very full manifest.',
  'They offer you a cup of something warm and refuse to say what is in it.',
  'Their pilot asks, loudly, whether your engine has always sounded like that.',
  'They have already booked the good berth, the shaded one, near the gate.',
  'Their agent is on the comm to the market before your ramp is down.',
  'They congratulate you on making it here at all, which is somehow not a compliment.',
  'Someone in their crew is taking notes on what you unload.',
  'They ask after your loan, by name, and by amount.',
  'Their captain smiles the smile of a company that bought cheap this morning.',
];
