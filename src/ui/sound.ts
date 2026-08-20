/**
 * Sound: `play('coins')` plays the pack sample `sfx.coins` if the active asset pack has one,
 * otherwise a built-in ZzFX synth preset (zero assets, MIT synth, GPL presets). Muted state is
 * persisted; audio is unlocked lazily on the first user gesture (browser autoplay policy).
 *
 * Presets are built from a handful of shapes (blip / chime / thud / sweep / noise) rather than
 * hand-tuned parameter arrays, so a new id is one line and the family stays coherent. Where a
 * sound belongs is in `soundmap.ts`; this file only decides what it sounds like.
 */
import { ZZFX } from 'zzfx';
import { COMMODITIES } from '../engine';
import { sfx } from './assets';
import { commoditySound } from './soundmap';

const MUTE_KEY = 'opengaz.muted';

/** ZzFX parameter array (see https://killedbyapixel.github.io/ZzFX/). */
type Preset = (number | undefined)[];
const _ = undefined;

/** ZzFX waveform: 0 sine, 1 triangle, 2 sawtooth, 3 tan, 4 noise. */
type Shape = 0 | 1 | 2 | 3 | 4;

/**
 * A ZzFX voice by name instead of by position. The parameter array is positional and 20 slots
 * long, which is unreadable and unreviewable; this is the one place that ordering appears.
 */
interface Voice {
  vol?: number;
  freq: number;
  attack?: number;
  sustain?: number;
  release?: number;
  shape?: Shape;
  curve?: number;
  slide?: number;
  /** pitch jumps by this much, `jumpAt` seconds in — how a two-note figure is made */
  jump?: number;
  jumpAt?: number;
  noise?: number;
  crush?: number;
  sustainVol?: number;
  decay?: number;
}

// prettier-ignore
const voice = (v: Voice): Preset => [
  v.vol ?? 0.6, _, v.freq, v.attack ?? 0.01, v.sustain ?? 0.05, v.release ?? 0.15,
  v.shape ?? 0, v.curve ?? 1.5, v.slide, _, v.jump, v.jumpAt, _, v.noise, _, v.crush, _,
  v.sustainVol ?? 0.6, v.decay ?? 0.04,
];

/** a short tonal tick — buttons, selections, page turns */
const blip = (freq: number, shape: Shape = 0, vol = 0.5): Preset =>
  voice({ freq, shape, vol, attack: 0, sustain: 0.01, release: 0.04, curve: 1.6, decay: 0.02 });

/** a two-note figure; positive `jump` rises, negative falls */
const chime = (freq: number, jump: number, shape: Shape = 0, vol = 0.6): Preset =>
  voice({ freq, shape, vol, jump, jumpAt: 0.05, sustain: 0.06, release: 0.17, sustainVol: 0.7 });

/** a low soft knock — money leaving your hands */
const thud = (freq: number, vol = 0.7): Preset =>
  voice({
    freq,
    vol,
    shape: 1,
    curve: 0.9,
    attack: 0.02,
    sustain: 0.09,
    release: 0.2,
    slide: -2,
    noise: 0.1,
    decay: 0.06,
  });

/** a glide, `slide` in ZzFX units — travel, opening a big screen */
const sweep = (freq: number, slide: number, shape: Shape = 0, vol = 0.6): Preset =>
  voice({
    freq,
    vol,
    shape,
    slide,
    curve: 1.2,
    attack: 0.04,
    sustain: 0.15,
    release: 0.3,
    noise: 0.1,
    decay: 0.08,
  });

/** filtered noise — weather, crowds, machinery */
const rush = (freq: number, noise: number, vol = 0.6): Preset =>
  voice({
    freq,
    vol,
    noise,
    shape: 4,
    curve: 0.8,
    attack: 0.06,
    sustain: 0.2,
    release: 0.35,
    crush: 0.2,
    sustainVol: 0.5,
    decay: 0.12,
  });

/**
 * A jingle: several voices fired at fixed offsets. One ZzFX call is one note, so anything with a
 * tune to it — a news sting, a fanfare — has to be a small schedule rather than a single preset.
 */
interface Jingle {
  seq: { at: number; p: Preset }[];
}
type Sound = Preset | Jingle;
const isJingle = (s: Sound): s is Jingle => 'seq' in s;

/** notes at `gap` ms apart, the last one held — brass-band shorthand */
const fanfare = (freqs: number[], gap: number, shape: Shape = 2, vol = 0.5): Jingle => ({
  seq: freqs.map((freq, i) => ({
    at: i * gap,
    p: voice({
      freq,
      shape,
      vol,
      attack: 0.005,
      sustain: i === freqs.length - 1 ? 0.1 : 0.03,
      release: i === freqs.length - 1 ? 0.25 : 0.08,
      curve: 1.8,
      sustainVol: 0.7,
      decay: 0.03,
    }),
  })),
});

const PRESETS: Record<string, Sound> = {
  /* --- generic UI --------------------------------------------------------------------- */
  click: [0.6, _, 1200, _, 0.01, 0.02, 1, 1.5, _, _, _, _, _, _, _, _, _, 0.6, 0.01],
  help: blip(980, 0, 0.45),
  ping: chime(880, 180, 0, 0.5),
  select: chime(1180, 240, 1, 0.5),
  error: [0.9, _, 180, 0.02, 0.08, 0.16, 2, 0.8, _, _, _, _, _, 0.4, _, 0.2, _, 0.6, 0.04],
  unlock: chime(520, 420, 1, 0.7),

  /* --- money -------------------------------------------------------------------------- */
  buy: [0.7, _, 520, 0.01, 0.05, 0.12, _, 1.4, _, _, 180, 0.04, _, _, _, _, _, 0.7, 0.03],
  sell: [0.7, _, 720, 0.01, 0.05, 0.12, _, 1.4, _, _, -180, 0.04, _, _, _, _, _, 0.7, 0.03],
  coins: [0.8, _, 1500, _, 0.04, 0.2, _, 2.5, _, _, 300, 0.05, 0.03, _, _, _, _, 0.6, 0.02],
  cash: [1, _, 900, 0.02, 0.15, 0.35, _, 1.8, _, _, 200, 0.08, 0.05, _, _, _, _, 0.7, 0.05],
  gooddeal: [0.9, _, 700, 0.01, 0.1, 0.26, _, 1.5, _, _, 320, 0.05, 0.04, _, _, _, _, 0.7, 0.04],
  baddeal: chime(420, -160, 2, 0.7),

  /* --- services (played when the screen opens, and again on the action) ---------------- */
  market: blip(660, 1, 0.45),
  warehouse: thud(200, 0.5),
  pickup: chime(760, 140, 1, 0.5),
  advert: chime(600, 300, 2, 0.5),
  crew: chime(340, 120, 1, 0.5),
  tax: chime(300, -90, 2, 0.55),
  insure: chime(560, 90, 0, 0.5),
  stock: chime(820, 160, 0, 0.5),
  stock2: chime(820, -160, 0, 0.5),
  money: chime(640, 200, 0, 0.5),
  bank: chime(480, 240, 0, 0.55),
  bank2: chime(720, -240, 0, 0.55),
  loan: chime(400, -120, 1, 0.55),
  zinn: chime(240, -80, 2, 0.6),
  fuel: rush(300, 0.5, 0.45),
  map: sweep(500, 3, 0, 0.45),
  special: chime(880, 320, 1, 0.55),

  /* --- explore -------------------------------------------------------------------------- */
  news: fanfare([587, 740, 988], 95), // three rising notes, like a bulletin opening
  weather: rush(420, 0.9, 0.45),
  clock: blip(1040, 0, 0.4),
  history: blip(360, 1, 0.45),

  /* --- travel and events ---------------------------------------------------------------- */
  rocket: [1, _, 60, 0.15, 0.4, 0.8, 4, 0.5, 2, _, _, _, 0.3, 1.2, _, 0.4, _, 0.5, 0.2],
  arrive: [0.8, _, 400, 0.05, 0.2, 0.3, 1, 1.5, _, _, 100, 0.1, _, _, _, _, _, 0.6, 0.1],
  'event.good': [0.9, _, 660, 0.02, 0.2, 0.3, _, 1.2, _, _, 220, 0.08, 0.06, _, _, _, _, 0.7, 0.05],
  'event.neutral': [0.8, _, 440, 0.02, 0.15, 0.25, _, 1.3, _, _, _, _, _, _, _, _, _, 0.6, 0.05],
  'event.bad': [
    0.9,
    _,
    220,
    0.03,
    0.25,
    0.4,
    2,
    0.9,
    -2,
    _,
    -60,
    0.1,
    _,
    0.3,
    _,
    0.1,
    _,
    0.6,
    0.08,
  ],
  'stock.crash': [1, _, 300, 0.05, 0.3, 0.6, 3, 0.7, -5, _, _, _, _, 0.6, _, 0.3, _, 0.5, 0.15],
  auction: [0.8, _, 800, 0.02, 0.06, 0.15, _, 2, _, _, 400, 0.03, _, _, _, _, _, 0.6, 0.02],

  /* --- endings ---------------------------------------------------------------------------- */
  win: [1, _, 523, 0.05, 0.4, 0.6, _, 1.2, _, _, 260, 0.12, 0.1, _, _, _, _, 0.7, 0.1],
  lose: [1, _, 330, 0.05, 0.4, 0.7, 1, 0.8, -3, _, -110, 0.15, _, 0.2, _, _, _, 0.6, 0.15],
  bankrupt: [1, _, 200, 0.1, 0.5, 0.9, 2, 0.6, -4, _, -80, 0.2, _, 0.4, _, 0.2, _, 0.5, 0.2],
};

/**
 * Every commodity gets its own trade noise, as in the original — but derived rather than hand
 * written: pitch climbs with the commodity's rank (cantaloupe low, exotic high) and the waveform
 * comes from its category, so the three aisles of the market sound different from each other.
 */
const CAT_SHAPE: Record<0 | 1 | 2, Shape> = { 0: 1, 1: 2, 2: 0 };
for (const c of COMMODITIES) {
  PRESETS[commoditySound(c.id)] = chime(
    Math.round(300 * Math.pow(2, (c.rank - 1) / 12)),
    120 + 20 * c.rank,
    CAT_SHAPE[c.cat],
    0.55,
  );
}

/** Every id `play()` knows about — used by the sound-test screen. */
export const soundIds = (): string[] => Object.keys(PRESETS);

let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();
const listeners = new Set<() => void>();
export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
export const toggleMuted = () => setMuted(!muted);
export function onMuteChange(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

const cache = new Map<string, HTMLAudioElement>();

/** True when the active pack has a real sample for this id (the synth is the fallback). */
export const hasSample = (id: string) => !!sfx(`sfx.${id}`);

/** Play a sound by short id (without the `sfx.` prefix). Silent when muted or unknown. */
export function play(id: string, volume = 1): void {
  if (muted) return;
  const url = sfx(`sfx.${id}`);
  try {
    if (url) {
      let a = cache.get(url);
      if (!a) {
        a = new Audio(url);
        cache.set(url, a);
      }
      a.volume = volume;
      a.currentTime = 0;
      void a.play().catch(() => {});
      return;
    }
    const p = PRESETS[id];
    if (!p) return;
    // the volume is global to ZzFX, so each note has to set it again when its turn comes
    const fire = (n: Preset) => {
      if (muted) return;
      ZZFX.volume = 0.3 * volume;
      ZZFX.play(...n);
    };
    if (isJingle(p)) for (const n of p.seq) setTimeout(() => fire(n.p), n.at);
    else fire(p);
  } catch {
    /* audio not available */
  }
}
