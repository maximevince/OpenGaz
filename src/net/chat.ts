/**
 * Room chat, the pure parts: what a line looks like, how untrusted text is cleaned, the canned
 * taunts, and the system notices the lobby generates for itself.
 *
 * Chat is a side channel. It never touches `GameState` and never rides the lockstep action
 * sequence, so a lost or late line can not put two engines out of step. The sender's name is
 * never taken from the wire either: the room resolves it from the peer id it already knows.
 */
import { LEVEL_BY_ID } from '../engine';
import type { Lobby } from './online.svelte';

export interface ChatMsg {
  id: number;
  /** wall-clock ms when the line arrived here (for the HUD fade) */
  at: number;
  kind: 'say' | 'sys';
  /** Trystero peer id, null for system lines */
  peer: string | null;
  /** player name as known at the time — the peer table may change later */
  name: string;
  /** first seat the sender holds, for the colour; null for spectators and system lines */
  seat: number | null;
  text: string;
}

/** longest line accepted, sent or received */
export const CHAT_MAX_LEN = 200;
/** how many lines the room remembers */
export const CHAT_MAX = 200;
/** a peer sending more than this many lines inside `CHAT_FLOOD_MS` is muted for the window */
export const CHAT_FLOOD_N = 5;
export const CHAT_FLOOD_MS = 1000;

/**
 * Clean a line before it goes out or after it comes in: trim, one space between words, no
 * control characters, at most `CHAT_MAX_LEN` characters. Empty when nothing usable is left.
 */
export function sanitizeChat(text: unknown): string {
  if (typeof text !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const clean = text.replace(/[\x00-\x1f\x7f-\x9f\u200b-\u200f\u2028\u2029]/g, ' ');
  const one = clean.replace(/\s+/g, ' ').trim();
  return one.length > CHAT_MAX_LEN ? one.slice(0, CHAT_MAX_LEN) : one;
}

/** AoE's numbered taunts: `/1`…`/9` on their own expand to a canned line. */
export const TAUNTS: readonly string[] = [
  'Nice deal!',
  'Hurry up, the market is waiting!',
  'Good game.',
  'Ouch, that hurt.',
  'Watch out for pirates.',
  'All hail Mr. Zinn.',
  'Ready when you are.',
  'Be right back.',
  'Wololo.',
];

export function expandTaunt(text: string): string {
  const m = /^\/([1-9])$/.exec(text.trim());
  return m ? TAUNTS[Number(m[1]) - 1]! : text;
}

/**
 * The human-readable difference between two lobby snapshots, one sentence per change, in the
 * voice of a lobby ticker: "Nova took seat 2 (Acme Gas)", "Host set level to Trader".
 * `who` names a peer id; `host` is what to call the host when the change is theirs.
 */
export function lobbyChanges(
  prev: Lobby | null,
  next: Lobby,
  who: (peer: string) => string,
  host = 'Host',
): string[] {
  const out: string[] = [];
  if (!prev) return out;
  const seatLabel = (i: number, name: string) => `seat ${i + 1}${name ? ` (${name})` : ''}`;
  const n = Math.max(prev.seats.length, next.seats.length);
  for (let i = 0; i < n; i++) {
    const a = prev.seats[i];
    const b = next.seats[i];
    if (a && !b) {
      out.push(`${host} removed ${seatLabel(i, a.name)}`);
      continue;
    }
    if (!a && b) {
      out.push(`${host} added ${seatLabel(i, b.name)}`);
      continue;
    }
    if (!a || !b) continue;
    if (a.peer !== b.peer) {
      if (b.peer) out.push(`${b.player || who(b.peer)} took ${seatLabel(i, b.name)}`);
      else if (a.peer) out.push(`${a.player || who(a.peer)} left ${seatLabel(i, a.name)}`);
    }
    if (a.name !== b.name && a.name && b.name) out.push(`${host} renamed ${a.name} to ${b.name}`);
    if (a.ship !== b.ship) out.push(`${host} changed the ship of ${seatLabel(i, b.name)}`);
  }
  if (prev.ai !== next.ai) out.push(`${host} set computer opponents to ${next.ai}`);
  if (prev.level !== next.level) out.push(`${host} set level to ${levelName(next.level)}`);
  return out;
}

function levelName(id: Lobby['level']): string {
  try {
    return LEVEL_BY_ID(id).name;
  } catch {
    return id;
  }
}

/** Keep the newest `max` lines. */
export function trimChat(lines: ChatMsg[], max = CHAT_MAX): ChatMsg[] {
  return lines.length > max ? lines.slice(lines.length - max) : lines;
}

/**
 * Sliding-window flood guard: true when `peer` has already sent `CHAT_FLOOD_N` lines within
 * the last `CHAT_FLOOD_MS`. `stamps` is mutated (old entries dropped, the new one added).
 */
export function flooding(stamps: Map<string, number[]>, peer: string, now: number): boolean {
  const recent = (stamps.get(peer) ?? []).filter((t) => now - t < CHAT_FLOOD_MS);
  const over = recent.length >= CHAT_FLOOD_N;
  if (!over) recent.push(now);
  stamps.set(peer, recent);
  return over;
}
