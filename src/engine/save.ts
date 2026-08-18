import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { SAVE_VERSION, type GameState } from './types';

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState {
  const s = JSON.parse(json) as GameState;
  if (typeof s !== 'object' || s === null || s.version !== SAVE_VERSION) {
    throw new Error(`unsupported save version ${(s as { version?: unknown })?.version}`);
  }
  return s;
}

/** Compact URL-safe string (for play-by-link). */
export function encodeForLink(state: GameState): string {
  return compressToEncodedURIComponent(serialize(state));
}

export function decodeFromLink(s: string): GameState {
  const json = decompressFromEncodedURIComponent(s);
  if (!json) throw new Error('could not decode game link');
  return deserialize(json);
}
