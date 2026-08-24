/**
 * Asset packs.
 *
 * The UI never hard-codes file names. It asks for a semantic asset id (e.g. `planet.bass.large`)
 * and the active pack resolves it to a URL, or `undefined` if the pack lacks it — callers then
 * draw a placeholder.
 *
 * Packs:
 *  - `opengaz`  : recreated, GPL art/sound in `public/assets/` (shipped).
 *  - `original` : dev-only pack in `public/original/` (git-ignored, imported from the owner's
 *                 CD with `pnpm assets:original`). If its manifest is not present the app just
 *                 falls back to `opengaz`. Never committed, never deployed.
 */

import { procImage } from './procgen';

export type PackName = 'opengaz' | 'original';

interface Manifest {
  gfx: string[];
  sfx: string[];
  music: string[];
}

interface Pack {
  name: PackName;
  base: string;
  manifest: Manifest;
  /** sound file extension used by this pack */
  sfxExt: 'ogg' | 'wav';
  /** map semantic id -> file stem within the pack (without extension) */
  gfxId(id: string): string | undefined;
  sfxId(id: string): string | undefined;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/* ---------- semantic ids ------------------------------------------------------------------- */
// Ids are dotted: `planet.<slug>.icon|medium|large|surface`, `ship.<n>.picture|icon`,
// `portrait.<slug>`, `screen.title|win|lose`, `bg.stars.<n>`, `sfx.<slug>`.

// semantic portrait id -> original file stem
const PORTRAIT_MAP: Record<string, string> = {
  union: 'loan1',
  bank: 'bank',
  zinn: 'zinn',
  insurance: 'insure',
  tax: 'tax',
  crew: 'crew',
  broker: 'broker1',
  dealer: 'dealer1',
  pilot: 'pilot',
  news: 'news',
  weather: 'weather',
  dred: 'dred',
  mechanic: 'mechan1',
  sooth: 'sooth1',
  police: 'police',
  warehouse: 'warehous',
  clock: 'clock',
  history: 'history',
  repair: 'repair',
  meteor: 'meteor',
  storm: 'storm',
  fire: 'fire',
  bandits: 'bandits',
  pirates: 'bronap',
  rebels: 'rebels',
  snoz: 'snoz',
  magistrate: 'dred',
  ltech: 'mech',
  zobrok: 'zobrok1',
  peelia: 'peelia',
  casino: 'yoyo',
  cornucopia: 'cornu1',
  scooter: 'scooter',
  nectum: 'nectum',
  yoyo: 'yoyo',
  sabotage: 'sabotage',
  gurttle: 'gurttle',
  quaso: 'quaso',
  op1: 'op1',
  op2: 'op2',
  op3: 'op3',
  op4: 'op4',
  op5: 'op5',
  op6: 'op6',
};

const originalGfx = (id: string): string | undefined => {
  const p = id.split('.');
  switch (p[0]) {
    case 'planet': {
      const [, slug, kind] = p;
      return { icon: `${slug}1`, medium: `${slug}2`, large: `${slug}3`, surface: slug }[kind!];
    }
    case 'ship': {
      const [, n, kind] = p;
      return kind === 'icon' ? `ship${n}a` : `ship${n}`;
    }
    case 'portrait':
      return PORTRAIT_MAP[p[1]!] ?? p[1];
    case 'screen':
      return { title: 'title', win: 'win', lose: 'lose', planets: 'planets', history: 'history' }[
        p[1]!
      ];
    case 'bg':
      return p[1] === 'stars' ? `stars${p[2] ?? 1}` : undefined;
    default:
      return undefined;
  }
};

// Recreated pack uses the semantic id directly as file path: `planet.bass.large` -> `planet/bass/large`.
const opengazGfx = (id: string) => id.replace(/\./g, '/');
const opengazSfx = (id: string) => id.replace(/^sfx\./, '');

/**
 * Semantic sound id -> original file stem, for the dev-only pack. Most ids happen to match, so
 * only the ones that differ are listed. Ids with no original equivalent (there was no click, no
 * error buzz, no screen greeting for the market or the map) are absent and fall back to the
 * synth — which is exactly what the sound-test screen shows.
 */
const SFX_MAP: Record<string, string> = {
  ping: 'ping1',
  select: 'ping3',
  cash: 'coins',
  rocket: 'rocket1',
  'event.good': 'good',
  'event.neutral': 'neutral',
  'event.bad': 'bad',
  'stock.crash': 'stokcrsh',
  win: 'loro',
  'commodity.cantaloupe': 'cantalou',
  'commodity.jellybeans': 'jellybea',
  'commodity.moonferns': 'moonfern',
  'commodity.froglegs': 'frogleg',
  'commodity.whipcream': 'whipcrem',
  'commodity.babelseeds': 'babel',
  'commodity.umbrellas': 'umbrella',
  'commodity.polyester': 'polyestr',
  'commodity.hairtonic': 'tonic',
  'commodity.lavalamps': 'lavalamp',
  'commodity.ogglesand': 'oggle',
  'commodity.kryptoons': 'kryptoon',
  'commodity.xfuels': 'xfuel',
};

const originalSfx = (id: string): string => {
  const short = id.replace(/^sfx\./, '');
  return SFX_MAP[short] ?? short.replace(/^commodity\./, '');
};

/* ---------- loading ------------------------------------------------------------------------ */

let active: Pack | undefined;
let fallback: Pack | undefined;
const listeners = new Set<() => void>();

async function loadManifest(url: string): Promise<Manifest | undefined> {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) return undefined;
    const m = (await r.json()) as Partial<Manifest>;
    return { gfx: m.gfx ?? [], sfx: m.sfx ?? [], music: m.music ?? [] };
  } catch {
    return undefined;
  }
}

/** Load packs. Prefers `original` when present (local dev) unless `preferred` says otherwise. */
export async function initAssets(preferred?: PackName): Promise<PackName> {
  const og = (await loadManifest(`${BASE}/assets/manifest.json`)) ?? {
    gfx: [],
    sfx: [],
    music: [],
  };
  fallback = {
    name: 'opengaz',
    base: `${BASE}/assets`,
    manifest: og,
    sfxExt: 'ogg',
    gfxId: opengazGfx,
    sfxId: opengazSfx,
  };
  active = fallback;
  if (preferred !== 'opengaz') {
    const orig = await loadManifest(`${BASE}/original/manifest.json`);
    if (orig) {
      active = {
        name: 'original',
        base: `${BASE}/original`,
        manifest: orig,
        sfxExt: 'wav',
        gfxId: originalGfx,
        sfxId: originalSfx,
      };
    }
  }
  listeners.forEach((l) => l());
  return active.name;
}

export function activePack(): PackName {
  return active?.name ?? 'opengaz';
}

export function onPackChange(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function resolve(kind: 'gfx' | 'sfx', id: string): string | undefined {
  for (const pack of [active, fallback]) {
    if (!pack) continue;
    const stem = kind === 'gfx' ? pack.gfxId(id) : pack.sfxId(id);
    if (stem && pack.manifest[kind].includes(stem)) {
      return `${pack.base}/${kind}/${stem}.${kind === 'gfx' ? 'png' : pack.sfxExt}`;
    }
  }
  return undefined;
}

/**
 * URL for a music id (`planet.tilo`, `op3`), or undefined. Music lives only in the recreated
 * pack, so this resolves against the fallback whichever pack is active — playing the shipped
 * planet themes while the dev-only art pack is on is the useful behaviour, not a bug.
 */
export function music(id: string): string | undefined {
  const pack = fallback ?? active;
  return pack && pack.manifest.music.includes(id) ? `${pack.base}/music/${id}.ogg` : undefined;
}

/** Every music id the shipped pack carries. */
export const musicIds = (): string[] => (fallback ?? active)?.manifest.music.slice() ?? [];

/** URL for an image id: from the active pack, else the fallback pack, else procedural art. */
export const img = (id: string) => resolve('gfx', id) ?? procImage(id);
/** URL for a sound id, or undefined. */
export const sfx = (id: string) => resolve('sfx', id);
