/**
 * Music: one looping track at a time, on its own channel.
 *
 * Separate from `sound.ts` because the two behave differently — an effect is a one-shot that cuts
 * off whatever came before, a track loops until something replaces it and has to get out of the
 * way when an effect fires. Two `<audio>` elements are kept so a change can fade across rather
 * than cut, which matters when the planet changes mid-screen.
 */

import { music } from './assets';
import { musicOn, onAudioModeChange } from './audio';

/** How loud music sits under the effects channel. */
const VOLUME = 0.55;
/** How far music ducks while an effect is playing. */
const DUCK = 0.35;
const FADE_MS = 700;
const STEP_MS = 40;

interface Deck {
  el: HTMLAudioElement;
  id: string | null;
  fade?: number;
}

const decks: Deck[] = [];
let front = 0;
let ducked = false;
let wanted: string | null = null;

function deck(i: number): Deck | undefined {
  if (typeof Audio === 'undefined') return undefined;
  if (!decks[i]) {
    const el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    decks[i] = { el, id: null };
  }
  return decks[i];
}

const target = () => (ducked ? VOLUME * DUCK : VOLUME);

function ramp(d: Deck, to: number, done?: () => void) {
  if (d.fade) window.clearInterval(d.fade);
  const step = ((to - d.el.volume) * STEP_MS) / FADE_MS;
  d.fade = window.setInterval(() => {
    const next = d.el.volume + step;
    const arrived = step >= 0 ? next >= to : next <= to;
    d.el.volume = Math.min(1, Math.max(0, arrived ? to : next));
    if (arrived) {
      window.clearInterval(d.fade);
      d.fade = undefined;
      done?.();
    }
  }, STEP_MS);
}

/**
 * Play `id` (a semantic music id such as `planet.tilo`), crossfading from whatever is playing.
 * `null` fades out. Repeating the current id does nothing, so screens can call this freely.
 */
export function setTrack(id: string | null): void {
  wanted = id;
  const cur = deck(front);
  if (!cur || cur.id === id) return;
  const url = id ? music(id) : undefined;
  if (id && !url) return; // no such track in the pack: leave what is playing alone

  const next = deck(1 - front)!;
  if (cur.id) ramp(cur, 0, () => cur.el.pause());
  if (!url) {
    cur.id = null;
    return;
  }
  next.el.src = url;
  next.el.currentTime = 0;
  next.id = id;
  next.el.volume = 0;
  if (musicOn()) {
    void next.el.play().catch(() => {
      /* autoplay is blocked until the first gesture; the next call will get it */
    });
    ramp(next, target());
  }
  front = 1 - front;
}

/** The track that should be sounding, whether or not the setting currently allows it. */
export const currentTrack = () => wanted;

/** Pull music down while an effect plays, then let it back up. */
export function duck(on: boolean): void {
  if (ducked === on) return;
  ducked = on;
  const d = deck(front);
  if (d?.id && musicOn()) ramp(d, target());
}

function apply() {
  const d = deck(front);
  if (!d) return;
  if (musicOn()) {
    if (wanted && d.id !== wanted) {
      const url = music(wanted);
      if (url) {
        d.el.src = url;
        d.id = wanted;
      }
    }
    if (d.id) {
      void d.el.play().catch(() => {});
      ramp(d, target());
    }
  } else {
    ramp(d, 0, () => d.el.pause());
  }
}

onAudioModeChange(apply);

/** Browsers block audio until a gesture; call this from the first click. */
export function unlockMusic(): void {
  apply();
}
