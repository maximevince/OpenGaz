/**
 * Procedural fallback art — deterministic SVG data-URIs generated from asset ids, used when no
 * asset pack provides an image. Keeps the shipped game coherent (and GPL-clean) before real
 * recreated artwork lands in `assets/`.
 */
import { PLANETS, type PlanetId } from '../engine/data/planets';
import { SHIPS } from '../engine/data/ships';
import { seedFromString } from '../engine/rng';

const svgUri = (w: number, h: number, body: string, bg = 'none') =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${bg !== 'none' ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`,
  ).replace(/[()']/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`; // parens break CSS url()

function hsl(h: number, s: number, l: number) {
  return `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`;
}

/** Palette per planet, so a planet always looks the same everywhere. */
function planetPalette(id: string) {
  const seed = seedFromString(id);
  const hue = seed % 360;
  const hue2 = (hue + 40 + ((seed >> 8) % 80)) % 360;
  return { hue, hue2, ring: id === 'vexx' || (seed >> 16) % 5 === 0, bands: 3 + ((seed >> 4) % 4) };
}

function planetBody(id: string, size: number, cx: number, cy: number, r: number) {
  const { hue, hue2, ring, bands } = planetPalette(id);
  const gid = `g${id}${size}`;
  let bandsSvg = '';
  for (let i = 0; i < bands; i++) {
    const y = cy - r + ((i + 0.5) / bands) * 2 * r;
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    bandsSvg += `<ellipse cx="${cx}" cy="${y}" rx="${half}" ry="${r / (bands * 2.2)}" fill="${hsl(hue2 + i * 15, 60, 45 + (i % 2) * 15)}" opacity="0.45"/>`;
  }
  const ringSvg = ring
    ? `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.7}" ry="${r * 0.45}" fill="none" stroke="${hsl(hue2, 40, 75)}" stroke-width="${r * 0.18}" opacity="0.8" transform="rotate(-18 ${cx} ${cy})"/>`
    : '';
  return `<defs><radialGradient id="${gid}" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="${hsl(hue, 70, 75)}"/><stop offset="0.6" stop-color="${hsl(hue, 65, 45)}"/><stop offset="1" stop-color="${hsl(hue, 70, 12)}"/></radialGradient><clipPath id="c${gid}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${gid})"/><g clip-path="url(#c${gid})">${bandsSvg}</g>${ringSvg}`;
}

function stars(w: number, h: number, seed: number, n = 60) {
  let s = '';
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    const px = (x % 1000) / 1000;
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    const py = (x % 1000) / 1000;
    s += `<circle cx="${(px * w).toFixed(1)}" cy="${(py * h).toFixed(1)}" r="${0.6 + (x % 3) * 0.4}" fill="#fff" opacity="${0.4 + (x % 5) / 8}"/>`;
  }
  return s;
}

export function planetImage(id: PlanetId, kind: 'icon' | 'medium' | 'large' | 'surface'): string {
  const name = PLANETS.find((p) => p.id === id)?.name ?? id;
  const seed = seedFromString(id);
  switch (kind) {
    case 'icon':
      return svgUri(48, 48, planetBody(id, 48, 24, 24, 16));
    case 'medium':
      return svgUri(96, 96, planetBody(id, 96, 48, 48, 30));
    case 'large':
      return svgUri(640, 480, stars(640, 480, seed) + planetBody(id, 640, 220, 520, 360), '#000');
    case 'surface': {
      const { hue, hue2 } = planetPalette(id);
      // simple stylised skyline
      let towers = '';
      let x = seed;
      for (let i = 0; i < 14; i++) {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        const bw = 12 + (x % 30);
        const bh = 40 + ((x >> 8) % 140);
        const bx = (i * 240) / 14 + ((x >> 16) % 8);
        const dome = (x >> 20) % 3 === 0;
        towers += `<rect x="${bx}" y="${230 - bh}" width="${bw}" height="${bh}" fill="${hsl(hue2 + (x % 40), 45, 25 + (x % 20))}"/>`;
        if (dome)
          towers += `<ellipse cx="${bx + bw / 2}" cy="${230 - bh}" rx="${bw / 2}" ry="${bw / 3}" fill="${hsl(hue, 60, 60)}"/>`;
      }
      return svgUri(
        240,
        230,
        `<defs><linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(hue, 60, 20)}"/><stop offset="1" stop-color="${hsl(hue2, 70, 60)}"/></linearGradient></defs><rect width="240" height="230" fill="url(#sky${id})"/>${planetBody(id + '-moon', 60, 190, 50, 26)}${towers}<rect y="226" width="240" height="4" fill="#111"/><text x="8" y="22" font-family="Georgia,serif" font-size="20" font-weight="bold" fill="#fff" opacity="0.9">${name}</text>`,
      );
    }
  }
}

/** Stylised ship silhouettes: each ship gets a distinct simple shape. */
export function shipImage(defId: number, kind: 'picture' | 'icon'): string {
  const def = SHIPS.find((s) => s.id === defId);
  const seed = seedFromString(`ship${defId}`);
  const hue = seed % 360;
  const w = kind === 'icon' ? 64 : 300;
  const h = kind === 'icon' ? 40 : 200;
  const body = `<defs><linearGradient id="s${defId}${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(hue, 30, 80)}"/><stop offset="1" stop-color="${hsl(hue, 30, 30)}"/></linearGradient></defs>
    <g transform="scale(${w / 300})">
      <ellipse cx="150" cy="105" rx="${90 + (def?.cargo ?? 100) / 4}" ry="${35 + (def?.seats ?? 8) * 2}" fill="url(#s${defId}${kind})" stroke="#000" stroke-width="3"/>
      <polygon points="60,105 20,70 30,105 20,140" fill="${hsl(hue + 40, 60, 50)}" stroke="#000" stroke-width="3"/>
      <circle cx="215" cy="95" r="14" fill="#9ff" stroke="#000" stroke-width="3"/>
      <rect x="120" y="60" width="${(def?.kuarps ?? 5) * 8}" height="14" fill="${hsl(hue + 180, 60, 45)}" stroke="#000" stroke-width="2"/>
      ${Array.from({ length: def?.crew ?? 4 }, (_, i) => `<circle cx="${100 + i * 12}" cy="120" r="4" fill="#ffd"/>`).join('')}
    </g>`;
  return svgUri(w, h, body, kind === 'icon' ? 'none' : '#000');
}

/** Portrait placeholder: a friendly blob with the character's initials. */
export function portraitImage(id: string): string {
  const seed = seedFromString(id);
  const hue = seed % 360;
  const initials = id
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
  return svgUri(
    200,
    300,
    `<rect width="200" height="300" fill="#fff"/>
     <ellipse cx="100" cy="190" rx="70" ry="90" fill="${hsl(hue, 55, 55)}" stroke="#000" stroke-width="3"/>
     <circle cx="100" cy="90" r="55" fill="${hsl(hue + 30, 60, 65)}" stroke="#000" stroke-width="3"/>
     <circle cx="80" cy="80" r="9" fill="#fff" stroke="#000" stroke-width="2"/><circle cx="120" cy="80" r="9" fill="#fff" stroke="#000" stroke-width="2"/>
     <circle cx="82" cy="82" r="4" fill="#000"/><circle cx="122" cy="82" r="4" fill="#000"/>
     <path d="M78 112 Q100 130 122 112" stroke="#000" stroke-width="3" fill="none"/>
     <text x="100" y="205" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" font-weight="bold" fill="#fff" stroke="#000" stroke-width="1">${initials}</text>`,
  );
}

export function titleImage(): string {
  return svgUri(
    640,
    480,
    `${stars(640, 480, 12345, 120)}${planetBody('opengaz', 640, 200, 420, 260)}<text x="320" y="120" text-anchor="middle" font-family="Georgia,serif" font-size="72" font-weight="bold" fill="#fff" stroke="#8080ff" stroke-width="2">OpenGaz</text><text x="320" y="160" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#c0c0ff">an open-source homage to Gazillionaire Deluxe</text>`,
    '#000',
  );
}

/** Resolve a semantic id to procedural art, or undefined. */
export function procImage(id: string): string | undefined {
  const p = id.split('.');
  switch (p[0]) {
    case 'planet':
      return planetImage(p[1] as PlanetId, p[2] as 'icon');
    case 'ship':
      return shipImage(Number(p[1]), p[2] as 'picture');
    case 'portrait':
      return portraitImage(p[1]!);
    case 'screen':
      return p[1] === 'title' ? titleImage() : undefined;
    case 'bg':
      return svgUri(640, 480, stars(640, 480, Number(p[2] ?? 1) * 7919, 150), '#000');
    default:
      return undefined;
  }
}
