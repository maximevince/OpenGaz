/**
 * The one audio setting, shared by the effects channel and the music channel.
 *
 * Three states rather than a mute toggle, because music and effects want to be refusable
 * separately: someone who wants the coin sounds does not necessarily want a planet theme looping
 * under them. `sound.ts` reads it for effects, `music.ts` for music.
 */

const KEY = 'opengaz.audio';
const LEGACY_MUTE_KEY = 'opengaz.muted';

/** `off` silences everything, `effects` keeps sfx but no music, `all` plays both. */
export type AudioMode = 'off' | 'effects' | 'all';

export const AUDIO_MODES: AudioMode[] = ['all', 'effects', 'off'];

function load(): AudioMode {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'off' || stored === 'effects' || stored === 'all') return stored;
    // migrate the old boolean: muted stays silent, everything else gains music
    return localStorage.getItem(LEGACY_MUTE_KEY) === '1' ? 'off' : 'all';
  } catch {
    return 'all';
  }
}

let mode: AudioMode = load();
const listeners = new Set<() => void>();

export const audioMode = (): AudioMode => mode;
export const effectsOn = () => mode !== 'off';
export const musicOn = () => mode === 'all';

export function setAudioMode(next: AudioMode): void {
  if (next === mode) return;
  mode = next;
  try {
    localStorage.setItem(KEY, next);
    localStorage.setItem(LEGACY_MUTE_KEY, next === 'off' ? '1' : '0');
  } catch {
    /* private mode: the setting just does not persist */
  }
  listeners.forEach((l) => l());
}

/** Step through all → effects → off → all, which is what the toggle button does. */
export function cycleAudioMode(): AudioMode {
  const next = AUDIO_MODES[(AUDIO_MODES.indexOf(mode) + 1) % AUDIO_MODES.length]!;
  setAudioMode(next);
  return next;
}

export function onAudioModeChange(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
