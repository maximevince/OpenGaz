/**
 * Music: one track at a time, on its own channel, and it never repeats.
 *
 * A planet's theme starts when you land and plays through once — across the welcome screen and
 * on into the main menu if you click on — then stops and stays stopped until something asks for
 * it again. Nothing loops: a 24-second cue running all turn wears out its welcome long before
 * the turn ends.
 *
 * Separate from `sound.ts` because the two behave differently — an effect is a one-shot that cuts
 * off whatever came before, a track plays under the game and has to get out of the way when an
 * effect fires. Two `<audio>` elements are kept so a planet change can fade across rather than cut.
 */

import { music } from './assets';
import { musicOn, onAudioModeChange } from './audio';

/** Under the game rather than over it, since it plays on past the screen that started it. */
const VOLUME = 0.4;
/** How far music ducks while an effect or a sting is playing. */
const DUCK = 0.35;
const FADE_MS = 700;
const STEP_MS = 40;

interface Deck {
  el: HTMLAudioElement;
  id: string | null;
  /** true once the track has played through: it will not start again on its own */
  spent: boolean;
  fade?: number;
}

const decks: Deck[] = [];
let front = 0;
let ducked = false;
let stinging = false;
let wanted: string | null = null;
let stingEl: HTMLAudioElement | undefined;

function deck(i: number): Deck | undefined {
  if (typeof Audio === 'undefined') return undefined;
  if (!decks[i]) {
    const el = new Audio();
    el.preload = 'auto';
    el.volume = 0;
    const d: Deck = { el, id: null, spent: false };
    el.onended = () => {
      d.spent = true;
    };
    decks[i] = d;
  }
  return decks[i];
}

const target = () => (ducked || stinging ? VOLUME * DUCK : VOLUME);

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
 * Ask for `id` (a semantic music id such as `planet.tilo`). `null` fades out.
 *
 * A different track crossfades in and plays once. The same track that is still playing is left
 * alone, so screens can call this on every change without restarting it. The same track that has
 * already finished stays finished unless `replay` is set — which is how landing on a planet you
 * are already standing on, or opening Explore, gets to hear it again.
 *
 * `cut` drops what was playing at once rather than fading it, for a moment that should not have
 * the last planet's theme trailing under it — the victory screen, above all.
 */
export function setTrack(id: string | null, { replay = false, cut = false } = {}): void {
  wanted = id;
  const cur = deck(front);
  if (!cur) return;
  if (cur.id === id) {
    if (id && replay && cur.spent) start(cur, id);
    return;
  }
  const url = id ? music(id) : undefined;
  if (id && !url) return; // no such track in the pack: leave what is playing alone

  if (cur.id) {
    if (cut) silence(cur);
    else ramp(cur, 0, () => cur.el.pause());
  }
  if (!url) {
    cur.id = null;
    return;
  }
  const next = deck(1 - front)!;
  start(next, id!);
  front = 1 - front;
}

/** Stop a deck dead, mid-note. */
function silence(d: Deck) {
  if (d.fade) window.clearInterval(d.fade);
  d.fade = undefined;
  d.el.pause();
  d.el.volume = 0;
  d.spent = true;
}

/** Put a track on a deck from the top and let it run once. */
function start(d: Deck, id: string) {
  const url = music(id);
  if (!url) return;
  if (d.fade) window.clearInterval(d.fade);
  d.el.src = url;
  d.el.currentTime = 0;
  d.el.volume = 0;
  d.id = id;
  d.spent = false;
  if (!musicOn()) return;
  void d.el.play().catch(() => {
    /* autoplay is blocked until the first gesture; the next call will get it */
  });
  ramp(d, target());
}

/** The track that should be sounding, whether or not the setting currently allows it. */
export const currentTrack = () => wanted;

/**
 * A one-shot over the bed: a rival's theme when its card comes up, which is how the original used
 * them. The bed ducks for the length of it rather than stopping, and a second sting replaces the
 * first.
 */
export function sting(id: string): void {
  const url = music(id);
  if (!url || !musicOn() || typeof Audio === 'undefined') return;
  if (!stingEl) stingEl = new Audio();
  const el = stingEl;
  el.src = url;
  el.currentTime = 0;
  el.volume = VOLUME;
  stinging = true;
  const d = deck(front);
  if (d?.id) ramp(d, target());
  const done = () => {
    stinging = false;
    const cur = deck(front);
    if (cur?.id && musicOn()) ramp(cur, target());
  };
  el.onended = done;
  void el.play().catch(done);
}

/** Cut a sting short — a screen leaving takes its rival card with it. */
export function stopSting(): void {
  if (!stingEl) return;
  stingEl.pause();
  stingEl.currentTime = 0;
  if (stinging) {
    stinging = false;
    const d = deck(front);
    if (d?.id && musicOn()) ramp(d, target());
  }
}

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
  if (!musicOn()) {
    ramp(d, 0, () => d.el.pause());
    return;
  }
  if (wanted && d.id !== wanted) {
    start(d, wanted); // switched on part-way through a planet: begin its theme
    return;
  }
  // a track that already played through stays finished; it waits for the next landing
  if (d.id && !d.spent) {
    void d.el.play().catch(() => {});
    ramp(d, target());
  }
}

onAudioModeChange(apply);

/** Browsers block audio until a gesture; call this from the first click. */
export function unlockMusic(): void {
  apply();
}
