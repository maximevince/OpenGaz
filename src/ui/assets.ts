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

export type PackName = 'opengaz' | 'original';

interface Manifest {
  gfx: string[];
  sfx: string[];
}

interface Pack {
  name: PackName;
  base: string;
  manifest: Manifest;
  /** map semantic id -> file stem within the pack (without extension) */
  gfxId(id: string): string | undefined;
  sfxId(id: string): string | undefined;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/* ---------- semantic ids ------------------------------------------------------------------- */
// Ids are dotted: `planet.<slug>.icon|medium|large|surface`, `ship.<n>.picture|icon`,
// `portrait.<slug>`, `screen.title|win|lose`, `bg.stars.<n>`, `sfx.<slug>`.

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
      return p[1];
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
const anySfx = (id: string) => id.replace(/^sfx\./, '');

/* ---------- loading ------------------------------------------------------------------------ */

let active: Pack | undefined;
let fallback: Pack | undefined;
const listeners = new Set<() => void>();

async function loadManifest(url: string): Promise<Manifest | undefined> {
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) return undefined;
    const m = (await r.json()) as Partial<Manifest>;
    return { gfx: m.gfx ?? [], sfx: m.sfx ?? [] };
  } catch {
    return undefined;
  }
}

/** Load packs. Prefers `original` when present (local dev) unless `preferred` says otherwise. */
export async function initAssets(preferred?: PackName): Promise<PackName> {
  const og = (await loadManifest(`${BASE}/assets/manifest.json`)) ?? { gfx: [], sfx: [] };
  fallback = {
    name: 'opengaz',
    base: `${BASE}/assets`,
    manifest: og,
    gfxId: opengazGfx,
    sfxId: anySfx,
  };
  active = fallback;
  if (preferred !== 'opengaz') {
    const orig = await loadManifest(`${BASE}/original/manifest.json`);
    if (orig) {
      active = {
        name: 'original',
        base: `${BASE}/original`,
        manifest: orig,
        gfxId: originalGfx,
        sfxId: anySfx,
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
      return `${pack.base}/${kind}/${stem}.${kind === 'gfx' ? 'png' : 'wav'}`;
    }
  }
  return undefined;
}

/** URL for an image id, or undefined if no pack provides it (draw a placeholder). */
export const img = (id: string) => resolve('gfx', id);
/** URL for a sound id, or undefined. */
export const sfx = (id: string) => resolve('sfx', id);
