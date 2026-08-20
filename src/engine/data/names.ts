/**
 * Placeholder company and player names for the setup screens.
 *
 * Cosmetic only: the player is expected to type over them and no rule ever reads them back.
 * They live here so the hot-seat setup screen and the online host can share one generator,
 * and because driving them off an `Rng` keeps the engine's no-ambient-randomness rule intact
 * (callers seed; see `Rng`). The tone follows the rival companies in `opponents.ts`
 * — "Gizzy Shipping", "Vandergriff Ltd.", "Trading Corp. IV".
 */
import { Rng } from '../rng';

/** Company inputs are capped at 24 characters, so generated names must fit. */
export const COMPANY_NAME_MAX = 24;

/** Brandable nonsense, in the vein of Gizzy / Puffer / Roke. Kept short so pairs still fit. */
const STEMS = [
  'Blurb',
  'Bopp',
  'Chugg',
  'Drozz',
  'Fribb',
  'Gorb',
  'Grix',
  'Hodd',
  'Jolt',
  'Klup',
  'Krill',
  'Lorn',
  'Morv',
  'Nurb',
  'Ossik',
  'Plonk',
  'Quib',
  'Rusk',
  'Skiv',
  'Slev',
  'Snug',
  'Thrup',
  'Vorn',
  'Wobb',
  'Yark',
  'Zibb',
  'Zorp',
] as const;

const SURNAMES = [
  'Ashcroft',
  'Braddock',
  'Cazale',
  'Dunmore',
  'Fennick',
  'Garrick',
  'Halloway',
  'Hoffmeister',
  'Ivers',
  'Jessup',
  'Lomax',
  'Merrivale',
  'Northcott',
  'Ossler',
  'Pettigrew',
  'Quill',
  'Ransom',
  'Stroud',
  'Thackeray',
  'Underhill',
  'Vandergriff',
  'Vosper',
  'Wexley',
  'Yarrow',
  'Zangwill',
] as const;

const ADJECTIVES = [
  'Astral',
  'Blazing',
  'Brisk',
  'Cosmic',
  'Crimson',
  'Deep',
  'Dogged',
  'Eternal',
  'Fearless',
  'Golden',
  'Grand',
  'Honest',
  'Humble',
  'Jolly',
  'Lucky',
  'Mighty',
  'Nimble',
  'Prompt',
  'Quantum',
  'Reckless',
  'Royal',
  'Shiny',
  'Sincere',
  'Solar',
  'Stellar',
  'Sudden',
  'Thrifty',
  'Turbo',
  'Vast',
  'Velvet',
] as const;

const NOUNS = [
  'Anvil',
  'Badger',
  'Beacon',
  'Bucket',
  'Comet',
  'Compass',
  'Crate',
  'Ferret',
  'Gecko',
  'Gizzard',
  'Kipper',
  'Lantern',
  'Lobster',
  'Meteor',
  'Moth',
  'Nebula',
  'Nozzle',
  'Orbit',
  'Otter',
  'Pelican',
  'Pylon',
  'Quasar',
  'Rooster',
  'Sprocket',
  'Starling',
  'Teapot',
  'Thistle',
  'Trolley',
  'Walrus',
  'Wrench',
  'Yak',
] as const;

const TRADES = [
  'Shipping',
  'Transport',
  'Freight',
  'Haulage',
  'Cartage',
  'Trading',
  'Traders',
  'Exports',
  'Imports',
  'Logistics',
  'Merchants',
  'Supply',
  'Ventures',
  'Holdings',
  'Interstellar',
  'Distribution',
  'Consignments',
  'Commodities',
  'Bulk Goods',
  'Transit',
  'Cargo',
  'Lines',
  'Runs',
] as const;

/** Guaranteed-short trades, for the last-resort fallback. */
const SHORT_TRADES = ['Shipping', 'Freight', 'Trading', 'Supply', 'Cargo', 'Lines'] as const;

const SUFFIXES = [
  'Inc.',
  'Ltd.',
  '& Sons',
  '& Daughters',
  '& Co.',
  'Bros.',
  'Group',
  'Corp.',
  'Unlimited',
  'Consolidated',
  'Amalgamated',
  'Partners',
  'plc',
] as const;

const NUMERALS = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XIV', 'XL'] as const;

const FIRST_NAMES = [
  'Ace',
  'Ada',
  'Bex',
  'Cass',
  'Dex',
  'Echo',
  'Fitz',
  'Gus',
  'Hex',
  'Iris',
  'Juno',
  'Kit',
  'Lark',
  'Mox',
  'Nova',
  'Orin',
  'Pip',
  'Quin',
  'Rook',
  'Sol',
  'Tam',
  'Uma',
  'Vega',
  'Wren',
  'Xan',
  'Yuri',
  'Zed',
] as const;

const LAST_NAMES = [
  'Bell',
  'Cray',
  'Dune',
  'Fenn',
  'Gale',
  'Holt',
  'Kade',
  'Lund',
  'Marsh',
  'Nix',
  'Ovar',
  'Pike',
  'Quist',
  'Rell',
  'Stray',
  'Thorne',
  'Vance',
  'Wisp',
  'Yorke',
  'Zane',
] as const;

/** Two different entries, so we never emit "Vosper & Vosper". */
function pair(rng: Rng, pool: readonly string[]): [string, string] {
  const a = rng.pick(pool);
  let b = rng.pick(pool);
  // pools are >= 20 long, so a couple of retries is plenty
  for (let i = 0; i < 4 && b === a; i++) b = rng.pick(pool);
  return [a, b];
}

const PATTERNS: readonly ((rng: Rng) => string)[] = [
  (r) => `${r.pick(STEMS)} ${r.pick(TRADES)}`, // Gorb Shipping
  (r) => `${r.pick(SURNAMES)} ${r.pick(SUFFIXES)}`, // Vosper & Sons
  (r) => `${r.pick(ADJECTIVES)} ${r.pick(NOUNS)} ${r.pick(TRADES)}`, // Lucky Walrus Freight
  (r) => `${r.pick(ADJECTIVES)} ${r.pick(NOUNS)} ${r.pick(SUFFIXES)}`, // Thrifty Sprocket Ltd.
  (r) => pair(r, SURNAMES).join(' & '), // Lomax & Yarrow
  (r) => `${r.pick(TRADES)} Corp. ${r.pick(NUMERALS)}`, // Cartage Corp. IX
  (r) => `${r.pick(NOUNS)} ${r.pick(TRADES)}`, // Teapot Logistics
  (r) => pair(r, STEMS).join(' & '), // Skiv & Plonk
  (r) => `${r.pick(ADJECTIVES)} ${r.pick(NOUNS)}`, // Velvet Nebula
  (r) => `${r.pick(STEMS)} ${r.pick(SUFFIXES)}`, // Zorp Amalgamated
];

export interface CompanyNameOptions {
  /** Names already in use; the generator will avoid them. */
  taken?: readonly string[];
  /** Longest acceptable name (default `COMPANY_NAME_MAX`). */
  maxLen?: number;
}

/**
 * A fun placeholder company name, e.g. "Lucky Walrus Freight" or "Cartage Corp. IX".
 * Never longer than `maxLen`, never one of `taken`.
 */
export function randomCompanyName(rng: Rng, opts: CompanyNameOptions = {}): string {
  const { taken = [], maxLen = COMPANY_NAME_MAX } = opts;
  const used = new Set(taken.map((t) => t.trim().toLowerCase()));
  const free = (n: string) => n.length <= maxLen && !used.has(n.toLowerCase());

  // Most patterns fit on the first try; the loop only re-rolls the long or already-taken ones.
  for (let i = 0; i < 50; i++) {
    const n = rng.pick(PATTERNS)(rng);
    if (free(n)) return n;
  }
  // Fallback: the shortest shape there is, clipped to fit and numbered if it still collides.
  // Everything here must respect `maxLen`, or a tight limit would spin forever.
  const base = clip(`${rng.pick(STEMS)} ${rng.pick(SHORT_TRADES)}`, maxLen);
  if (free(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const tag = ` ${i}`;
    const n = `${clip(base, maxLen - tag.length)}${tag}`;
    if (free(n)) return n;
  }
  return base; // pathologically small maxLen: a duplicate beats not returning
}

/** Trim to at most `n` characters without leaving a dangling space. */
function clip(s: string, n: number): string {
  return n <= 0 ? '' : s.slice(0, n).trim();
}

/** `n` distinct company names. */
export function randomCompanyNames(rng: Rng, n: number, opts: CompanyNameOptions = {}): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++)
    out.push(randomCompanyName(rng, { ...opts, taken: [...(opts.taken ?? []), ...out] }));
  return out;
}

/** A generic pilot handle, e.g. "Nova Pike". Always well under any sane input limit. */
export function randomPlayerName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}
