/**
 * Dev cheats: edits that reach past the rules straight into the state.
 *
 * They exist to get to an interesting position in seconds instead of forty turns. Every one
 * of them goes through `patch`, which clones the state, applies the edit, labels the commit
 * and raises the "hand-edited" flag for good — a state that has been poked is no longer
 * evidence about the engine, and the panel says so from then on.
 *
 * Nothing here is broadcast to other players: editing the state in an online game desyncs the
 * room, and the panel warns about that where the buttons are.
 */
import { seedFromString, type Action, type GameState, type PendingEvent } from '../../engine';
import { game } from '../game.svelte';
import { setPath } from './path';
import { labelNextCommit } from './trace.svelte';

/** Clone, edit, commit. Returns false when there is no game to edit. */
export function patch(label: string, fn: (s: GameState) => void): boolean {
  const s = game.state;
  if (!s) return false;
  const next = structuredClone(s);
  fn(next);
  labelNextCommit(label);
  game.state = next;
  return true;
}

/**
 * Re-run the store's screen routing after a hand edit.
 *
 * `closeReport()` is the store's public "the state changed, work out where we should be"
 * entry point; a cheat that sets `phase` or bankrupts the current company needs it, or the
 * UI keeps showing a screen the state no longer supports.
 */
export function reroute(): void {
  game.closeReport();
}

export function setNumber(ci: number, field: 'cash' | 'bank', value: number): void {
  patch(`${field} of #${ci} = ${value}`, (s) => {
    const co = s.companies[ci];
    if (co) co[field] = value;
  });
}

export function clearDebts(ci: number): void {
  patch(`clear debts of #${ci}`, (s) => {
    const co = s.companies[ci];
    if (!co) return;
    co.unionLoan = 0;
    co.zinnLoan = 0;
    co.loanInterest = 0;
    co.zinnInterest = 0;
  });
}

export function clearBills(ci: number): void {
  patch(`clear wages and taxes of #${ci}`, (s) => {
    const co = s.companies[ci];
    if (!co) return;
    co.wagesOwed = 0;
    co.taxOwedPassenger = 0;
    co.taxOwedTariff = 0;
  });
}

export function fillTank(ci: number): void {
  patch(`fill the tank of #${ci}`, (s) => {
    const co = s.companies[ci];
    if (co) co.ship.fuel = co.ship.fuelCap;
  });
}

export function setBankrupt(ci: number, value: boolean): void {
  patch(`#${ci} bankrupt = ${value}`, (s) => {
    const co = s.companies[ci];
    if (co) co.bankrupt = value;
  });
  reroute();
}

/** Open every gate on the tutorial ladder without walking up it. */
export function finishTutorial(): void {
  patch('finish the tutorial ladder', (s) => {
    s.tutorStage = 17;
    s.tutorTaught = 17;
    s.tutorPending = false;
    s.settings.tutorial = false;
  });
  reroute();
}

export function setRng(seed: string): void {
  const value = /^\d+$/.test(seed.trim()) ? Number(seed.trim()) >>> 0 : seedFromString(seed);
  patch(`rng = ${value}`, (s) => {
    s.rng = value;
  });
}

export function setWeek(week: number): void {
  patch(`week = ${week}`, (s) => {
    s.week = Math.max(1, Math.round(week));
  });
}

export function setTarget(target: number): void {
  patch(`target net worth = ${target}`, (s) => {
    s.settings.targetNetWorth = Math.round(target);
  });
}

/** Drop a dialog on the screen — the quickest way to look at an event's layout and choices. */
export function injectEvent(event: PendingEvent): void {
  patch(`inject event ${event.id}`, (s) => {
    s.pending = event;
    s.phase = event.context === 'travel' ? 'event' : s.phase;
  });
  reroute();
}

export function clearEvent(): void {
  patch('clear the pending event', (s) => {
    s.pending = null;
    if (s.phase === 'event') s.phase = 'onPlanet';
  });
  reroute();
}

/** Generic escape hatch: write any value anywhere in the state. */
export function editPath(path: string, json: string): string | null {
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch (e) {
    return `not JSON: ${String(e)}`;
  }
  let ok = false;
  patch(`${path} = ${json.slice(0, 40)}`, (s) => {
    ok = setPath(s, path, value);
  });
  return ok ? null : `no such path: ${path}`;
}

/** Replace the whole state. Accepts anything `JSON.parse` likes; the engine validates nothing. */
export function replaceState(json: string): string | null {
  let parsed: GameState;
  try {
    parsed = JSON.parse(json) as GameState;
  } catch (e) {
    return `not JSON: ${String(e)}`;
  }
  labelNextCommit('replace the whole state');
  game.state = parsed;
  reroute();
  return null;
}

/** Send an action the ordinary way, rules and all — useful for driving a turn from the panel. */
export function dispatchJson(json: string): string | null {
  let action: Action;
  try {
    action = JSON.parse(json) as Action;
  } catch (e) {
    return `not JSON: ${String(e)}`;
  }
  return game.dispatch(action) ? null : (game.error ?? 'refused');
}
