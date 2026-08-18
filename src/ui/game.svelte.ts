/**
 * UI-side game store: holds the engine state, dispatches actions, drives AI turns, autosaves,
 * and decides which screen is showing. All rules live in src/engine — this file only glues.
 */
import {
  ActionError,
  applyAction,
  currentCompany,
  currentIndex,
  decodeFromLink,
  deserialize,
  encodeForLink,
  isAiTurn,
  newGame,
  runAi,
  serialize,
  type Action,
  type GameState,
  type NewGameOptions,
} from '../engine';

export type Screen =
  | 'title'
  | 'setup'
  | 'handoff'
  | 'menu'
  | 'market'
  | 'supply'
  | 'warehouse'
  | 'passengers'
  | 'advertise'
  | 'crew'
  | 'taxes'
  | 'insurance'
  | 'explore'
  | 'stock'
  | 'money'
  | 'bank'
  | 'loan'
  | 'zinn'
  | 'fuel'
  | 'file'
  | 'map'
  | 'travel'
  | 'event'
  | 'arrival'
  | 'gameover';

const AUTOSAVE_KEY = 'opengaz.autosave';
const SLOT_KEY = (n: number) => `opengaz.save.${n}`;

class GameStore {
  state = $state.raw<GameState | null>(null);
  screen = $state<Screen>('title');
  error = $state<string | null>(null);
  /** company index the UI is currently showing (for hot-seat handoff detection) */
  private shownCompany = -1;

  get s(): GameState {
    if (!this.state) throw new Error('no game');
    return this.state;
  }
  get co() {
    return currentCompany(this.s);
  }
  get ci() {
    return currentIndex(this.s);
  }
  get planet() {
    return this.s.planets[this.co.planet]!;
  }

  go(screen: Screen) {
    this.error = null;
    this.screen = screen;
  }

  start(opts: NewGameOptions) {
    this.state = newGame(opts);
    this.shownCompany = -1;
    this.afterChange();
  }

  /** Apply an action; on rule violation show the message and keep the state. Returns success. */
  dispatch(a: Action): boolean {
    if (!this.state) return false;
    try {
      this.state = applyAction(this.state, a);
      this.error = null;
    } catch (e) {
      this.error = e instanceof ActionError ? e.message : String(e);
      return false;
    }
    this.afterChange();
    return true;
  }

  /** Route to the right screen after the state changed, run AI turns, autosave. */
  private afterChange() {
    let s = this.s;
    if (s.phase === 'gameOver') {
      this.state = s;
      this.screen = 'gameover';
      this.autosave();
      return;
    }
    if (s.phase === 'event') {
      this.screen = 'event';
      this.autosave();
      return;
    }
    if (s.phase === 'arrival' && !isAiTurn(s)) {
      this.screen = 'arrival';
      this.autosave();
      return;
    }
    if (isAiTurn(s)) {
      s = runAi(s);
      this.state = s;
      if (s.phase === 'gameOver') {
        this.screen = 'gameover';
        this.autosave();
        return;
      }
    }
    // human on planet
    const ci = currentIndex(s);
    const humans = s.companies.filter((c) => !c.isAI && !c.bankrupt).length;
    if (ci !== this.shownCompany && humans > 1) {
      this.shownCompany = ci;
      this.screen = 'handoff';
    } else {
      this.shownCompany = ci;
      if (
        ['event', 'arrival', 'travel', 'handoff', 'gameover', 'title', 'setup'].includes(
          this.screen,
        )
      ) {
        this.screen = 'menu';
      }
    }
    this.autosave();
  }

  /* ---------------------------------------------------------- persistence */

  autosave() {
    try {
      if (this.state) localStorage.setItem(AUTOSAVE_KEY, serialize(this.state));
    } catch {
      /* ignore quota errors */
    }
  }
  hasAutosave(): boolean {
    return !!localStorage.getItem(AUTOSAVE_KEY);
  }
  loadAutosave(): boolean {
    const j = localStorage.getItem(AUTOSAVE_KEY);
    if (!j) return false;
    return this.loadJson(j);
  }
  saveSlot(n: number) {
    if (this.state) localStorage.setItem(SLOT_KEY(n), serialize(this.state));
  }
  slotInfo(n: number): { week: number; names: string } | null {
    const j = localStorage.getItem(SLOT_KEY(n));
    if (!j) return null;
    try {
      const s = deserialize(j);
      return {
        week: s.week,
        names: s.companies
          .filter((c) => !c.isAI)
          .map((c) => c.name)
          .join(', '),
      };
    } catch {
      return null;
    }
  }
  loadSlot(n: number): boolean {
    const j = localStorage.getItem(SLOT_KEY(n));
    return !!j && this.loadJson(j);
  }
  private loadJson(j: string): boolean {
    try {
      this.state = deserialize(j);
      this.shownCompany = -1;
      this.afterChange();
      return true;
    } catch (e) {
      this.error = String(e);
      return false;
    }
  }
  exportLink(): string {
    const base = `${location.origin}${location.pathname}`;
    return `${base}#g=${encodeForLink(this.s)}`;
  }
  importLink(link: string): boolean {
    const m =
      /#g=([A-Za-z0-9+\-$_.!*'()]+)/.exec(link) ?? /^([A-Za-z0-9+\-$_.!*'()]+)$/.exec(link.trim());
    if (!m) {
      this.error = 'That does not look like a game link.';
      return false;
    }
    try {
      this.state = decodeFromLink(m[1]!);
      this.shownCompany = -1;
      history.replaceState(null, '', location.pathname);
      this.afterChange();
      return true;
    } catch (e) {
      this.error = String(e);
      return false;
    }
  }
}

export const game = new GameStore();
