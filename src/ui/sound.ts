/**
 * Sound: `play('coins')` plays the pack sample `sfx.coins` if the active asset pack has one,
 * otherwise a built-in ZzFX synth preset (zero assets, MIT synth, GPL presets). Muted state is
 * persisted; audio is unlocked lazily on the first user gesture (browser autoplay policy).
 */
import { ZZFX } from 'zzfx';
import { sfx } from './assets';

const MUTE_KEY = 'opengaz.muted';

/** ZzFX presets: id -> parameter array (see https://killedbyapixel.github.io/ZzFX/). */
const _ = undefined;
const PRESETS: Record<string, (number | undefined)[]> = {
  click: [0.6, _, 1200, _, 0.01, 0.02, 1, 1.5, _, _, _, _, _, _, _, _, _, 0.6, 0.01],
  buy: [0.7, _, 520, 0.01, 0.05, 0.12, _, 1.4, _, _, 180, 0.04, _, _, _, _, _, 0.7, 0.03],
  sell: [0.7, _, 720, 0.01, 0.05, 0.12, _, 1.4, _, _, -180, 0.04, _, _, _, _, _, 0.7, 0.03],
  coins: [0.8, _, 1500, _, 0.04, 0.2, _, 2.5, _, _, 300, 0.05, 0.03, _, _, _, _, 0.6, 0.02],
  cash: [1, _, 900, 0.02, 0.15, 0.35, _, 1.8, _, _, 200, 0.08, 0.05, _, _, _, _, 0.7, 0.05],
  error: [0.9, _, 180, 0.02, 0.08, 0.16, 2, 0.8, _, _, _, _, _, 0.4, _, 0.2, _, 0.6, 0.04],
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
  win: [1, _, 523, 0.05, 0.4, 0.6, _, 1.2, _, _, 260, 0.12, 0.1, _, _, _, _, 0.7, 0.1],
  lose: [1, _, 330, 0.05, 0.4, 0.7, 1, 0.8, -3, _, -110, 0.15, _, 0.2, _, _, _, 0.6, 0.15],
  bankrupt: [1, _, 200, 0.1, 0.5, 0.9, 2, 0.6, -4, _, -80, 0.2, _, 0.4, _, 0.2, _, 0.5, 0.2],
  help: [0.5, _, 980, 0.01, 0.03, 0.08, _, 1.6, _, _, 120, 0.03, _, _, _, _, _, 0.5, 0.02],
};

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
    if (p) {
      ZZFX.volume = 0.3 * volume;
      ZZFX.play(...p);
    }
  } catch {
    /* audio not available */
  }
}
