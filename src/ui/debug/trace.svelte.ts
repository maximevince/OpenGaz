/**
 * The commit ring: every state the game has been in lately, and what changed on the way.
 *
 * The engine is pure — `applyAction` clones the state and returns a new one, and nothing
 * mutates it afterwards — so keeping the last few states costs nothing but memory and buys
 * real time travel: pick a commit, see the diff the action produced, restore it and play on
 * from there. `game.state` is `$state.raw`, so one effect over it catches every commit,
 * whether it came from a click, from a remote player, from a load or from a cheat.
 */
import { game } from '../game.svelte';
import { diffStates, type Change } from './diff';
import { describeAction } from './inspect';
import type { GameState } from '../../engine';

/** Snapshots kept. Fifty is a few turns of history at a few hundred KB a state. */
export const RING = 50;

export type CommitKind = 'action' | 'debug' | 'other';

export interface Commit {
  seq: number;
  label: string;
  kind: CommitKind;
  /** ms spent inside `applyAction` (0 when the commit did not come from a dispatch) */
  ms: number;
  week: number;
  phase: string;
  state: GameState;
  changes: Change[];
}

/** Set by a cheat just before it assigns the state, so the ring can name what did it. */
let nextLabel: { label: string; kind: CommitKind } | null = null;

export function labelNextCommit(label: string, kind: CommitKind = 'debug'): void {
  nextLabel = { label, kind };
}

class Trace {
  /**
   * Raw on purpose. A plain `$state` array deep-proxies everything put into it, which would
   * both wrap fifty whole game states in proxies and break `structuredClone` when one is
   * restored. The array is only ever replaced, never mutated, so raw reactivity is enough.
   */
  commits = $state.raw<Commit[]>([]);
  /** seq the Trace tab has selected, or null for "follow the newest" */
  selected = $state<number | null>(null);
  /** flips the moment a cheat edits the state, and never flips back for this game */
  handEdited = $state(false);

  private seq = 0;
  private last: GameState | null = null;

  /** Called from the panel's effect on every `game.state` identity change. */
  record(s: GameState | null): void {
    if (!s || s === this.last) return;
    const prev = this.last;
    this.last = s;

    const commit = game.lastCommit;
    game.lastCommit = null;
    const named = nextLabel;
    nextLabel = null;

    const label = named
      ? named.label
      : commit?.action
        ? describeAction(commit.action)
        : prev
          ? 'state replaced'
          : 'new game';
    const kind: CommitKind = named ? named.kind : commit?.action ? 'action' : 'other';
    if (kind === 'debug') this.handEdited = true;

    const entry: Commit = {
      seq: this.seq++,
      label,
      kind,
      ms: commit?.ms ?? 0,
      week: s.week,
      phase: s.phase,
      state: s,
      // a brand-new game diffs against nothing: the whole state would be noise
      changes: prev ? diffStates(prev, s) : [],
    };
    this.commits = [...this.commits, entry].slice(-RING);
  }

  get newest(): Commit | null {
    return this.commits[this.commits.length - 1] ?? null;
  }

  get current(): Commit | null {
    if (this.selected === null) return this.newest;
    return this.commits.find((c) => c.seq === this.selected) ?? this.newest;
  }

  /** Put the game back into the state a commit left it in. */
  restore(seq: number): void {
    const c = this.commits.find((x) => x.seq === seq);
    if (!c) return;
    labelNextCommit(`restore #${seq} (${c.label})`);
    // a fresh clone, so the assignment is a new identity even when restoring the newest
    // commit — and so the ring can diff what going back actually undid
    game.state = structuredClone(c.state);
    this.selected = null;
  }

  clear(): void {
    this.commits = [];
    this.selected = null;
  }
}

export const trace = new Trace();

/* ------------------------------------------------------------------ prefs */

const PREFS_KEY = 'opengaz.debug';

export type Tab =
  | 'game'
  | 'companies'
  | 'planets'
  | 'market'
  | 'events'
  | 'trace'
  | 'log'
  | 'rng'
  | 'raw'
  | 'cheats';

interface Stored {
  open: boolean;
  tab: Tab;
  width: number;
  watches: string[];
}

function read(): Stored {
  const fallback: Stored = { open: false, tab: 'game', width: 380, watches: [] };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Stored>) } : fallback;
  } catch {
    return fallback;
  }
}

/** Panel layout and the watch list, remembered across reloads (dev convenience only). */
class Prefs {
  #s = $state<Stored>(read());

  get open() {
    return this.#s.open;
  }
  set open(v: boolean) {
    this.#s = { ...this.#s, open: v };
    this.save();
  }
  get tab() {
    return this.#s.tab;
  }
  set tab(v: Tab) {
    this.#s = { ...this.#s, tab: v };
    this.save();
  }
  get width() {
    return this.#s.width;
  }
  set width(v: number) {
    this.#s = { ...this.#s, width: Math.max(280, Math.min(900, Math.round(v))) };
    this.save();
  }
  get watches(): readonly string[] {
    return this.#s.watches;
  }

  addWatch(path: string): void {
    const p = path.trim();
    if (!p || this.#s.watches.includes(p)) return;
    this.#s = { ...this.#s, watches: [...this.#s.watches, p] };
    this.save();
  }
  removeWatch(path: string): void {
    this.#s = { ...this.#s, watches: this.#s.watches.filter((w) => w !== path) };
    this.save();
  }

  private save(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.#s));
    } catch {
      // private browsing: the layout just doesn't stick
    }
  }
}

export const prefs = new Prefs();
