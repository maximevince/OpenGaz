/**
 * UI-side game store: holds the engine state, dispatches actions, drives AI turns, autosaves,
 * and decides which screen is showing. All rules live in src/engine — this file only glues.
 */
import { online } from '../net/online.svelte';
import { play } from './sound';
import { currentTrack, setTrack } from './music';
import { canPlotHistory } from './charts';
import { ACTION_SOUND, eventSound, SCREEN_SOUND, tradeSound } from './soundmap';
import {
  ActionError,
  applyAction,
  COMMODITY_BY_ID,
  currentCompany,
  currentIndex,
  decodeFromLink,
  deserialize,
  encodeForLink,
  LEVEL_BY_ID,
  newGame,
  priceRange,
  rivalNews,
  serialize,
  type Action,
  type GameState,
  type LogEntry,
  type NewGameOptions,
} from '../engine';

export type Screen =
  | 'title'
  | 'setup'
  | 'handoff'
  | 'report'
  | 'tutorial'
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
  | 'shortcuts'
  | 'soundtest'
  | 'credits'
  | 'map'
  | 'charts'
  | 'travel'
  | 'event'
  | 'dispatch'
  | 'arrival'
  | 'lobby'
  | 'waiting'
  | 'gameover';

const AUTOSAVE_KEY = 'opengaz.autosave';
const SLOT_KEY = (n: number) => `opengaz.save.${n}`;

/**
 * The noise a trade makes: the commodity's own, or the deal verdict when selling. Computed from
 * the state *before* the action, because selling wipes the average purchase price it compares to.
 */
function soundForTrade(s: GameState, a: Extract<Action, { type: 'buy' | 'sell' }>): string {
  const co = currentCompany(s);
  const p = s.planets[co.planet];
  const price = p?.price[a.commodity] ?? 0;
  const paid = co.cargo[a.commodity]?.paid ?? 0;
  const { max } = priceRange(
    COMMODITY_BY_ID[a.commodity],
    LEVEL_BY_ID(s.settings.level).difficulty,
  );
  return tradeSound(a, price, paid, max);
}

class GameStore {
  state = $state.raw<GameState | null>(null);
  screen = $state<Screen>('title');
  error = $state<string | null>(null);
  /** which screen's help dialog is open */
  helpFor = $state<Screen | null>(null);
  /** dev only: what produced the newest state, read and cleared by the debug panel's trace */
  lastCommit: { action: Action; ms: number } | null = null;
  /** company index the UI is currently showing (for hot-seat handoff detection) */
  private shownCompany = -1;
  /** last week whose standings report has been shown (once per week, not per player) */
  private reportedWeek = -1;
  /** which dispatch card is showing, and which pile it came from */
  cardIndex = $state(0);
  cardSource = $state<'arrival' | 'news'>('arrival');
  /** last week whose rival news has been dealt out (the pile is global, so once per week) */
  private newsShownWeek = -1;
  /** a departure owes the local player a flight, shown once the ship is actually in the air */
  private travelPending = false;
  /** which chart the flight ends on — the original alternated between the two */
  travelChart = $state<'history' | 'strength'>('history');

  constructor() {
    online.onRemoteAction = (a) => this.applyRemote(a);
    online.onStart = (s) => this.adopt(s);
    online.onSync = (s) => this.adopt(s);
    online.getState = () => this.state;
  }

  /** true when the local player may act for the current company */
  get canAct(): boolean {
    if (!this.state) return false;
    return !online.active || online.ownsCompany(currentIndex(this.state));
  }

  /** replace the state wholesale (online start / resync) */
  private adopt(s: GameState) {
    this.state = s;
    this.shownCompany = -1;
    this.reportedWeek = s.week;
    this.newsShownWeek = s.week;
    this.afterChange();
  }

  private applyRemote(a: Action) {
    if (!this.state) return;
    const t0 = import.meta.env.DEV ? performance.now() : 0;
    try {
      this.state = applyAction(this.state, a);
      if (import.meta.env.DEV) this.lastCommit = { action: a, ms: performance.now() - t0 };
    } catch (e) {
      // desync: ask the host for a fresh snapshot
      console.warn('remote action rejected, requesting sync', e);
      online.requestSync();
      return;
    }
    this.afterChange();
  }

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

  /* ------------------------------------------------------------- dispatch cards */

  /**
   * The pile the dispatch screen is dealing from: this arrival's reports, or the week's rival
   * news. One fact per card, the way the original showed them.
   */
  get cards(): LogEntry[] {
    if (!this.state) return [];
    return this.cardSource === 'news' ? rivalNews(this.state) : this.state.arrivalReports;
  }
  get card(): LogEntry | undefined {
    return this.cards[this.cardIndex];
  }
  /** the rival a card is about, when it is about one — the face and the theme that go with it */
  get cardRival() {
    const about = this.card?.about;
    const c = about === undefined ? undefined : this.state?.companies[about];
    return c?.isAI && c.aiIndex > 0 ? c : undefined;
  }

  /** OK on a card: the next one, or on past the last of them. */
  nextCard() {
    if (this.cardIndex + 1 < this.cards.length) {
      this.cardIndex++;
      this.cueMusic();
      return;
    }
    if (this.cardSource === 'news') {
      this.afterChange(); // the news is dealt; route on to whatever this turn actually is
      return;
    }
    // an arrival that ends the turn has no planet to welcome you to
    if (this.s.awaitingHandoff) {
      // your own departure: the card was the flight plan, so now fly it
      if (this.travelPending) {
        this.screen = 'travel';
        this.cueMusic();
        return;
      }
      this.dispatch({ type: 'continue' });
    } else this.go('arrival');
  }

  private dealCards(source: 'arrival' | 'news') {
    this.cardSource = source;
    this.cardIndex = 0;
    this.screen = 'dispatch';
  }

  go(screen: Screen) {
    this.error = null;
    if (screen !== this.screen) play(SCREEN_SOUND[screen] ?? '', 0.7);
    this.screen = screen;
    this.cueMusic();
  }

  /**
   * One track at a time, and only three things ever start one.
   *
   * A rival's dispatch card takes the channel for its theme, solo — it is the only sound while
   * that face is on screen. The welcome screen and Explore start the planet's theme, which plays
   * once and carries on into the main menu; when it ends it stays ended. Every other screen
   * leaves the channel alone, except to make sure a rival's theme does not follow its card out.
   */
  cueMusic() {
    if (!this.state || this.screen === 'title' || this.screen === 'setup') {
      setTrack(null);
      return;
    }
    if (this.screen === 'gameover') {
      // Victory music from the moment "wins!!!" appears, not after clicking through — and it cuts
      // the planet theme rather than playing over its tail. Loro's theme is what the original used.
      const w = this.state.winner;
      const wonByHuman = w !== null && !this.state.companies[w]!.isAI;
      setTrack(wonByHuman ? 'planet.loro' : null, { replay: true, cut: true });
      return;
    }
    if (this.screen === 'dispatch') {
      const rival = this.cardRival;
      if (rival) setTrack(`op${rival.aiIndex}`, { replay: true, cut: true });
      else this.dropRivalTheme();
      return;
    }
    if (this.screen === 'arrival' || this.screen === 'explore') {
      setTrack(`planet.${this.planet.id}`, { replay: true });
      return;
    }
    this.dropRivalTheme();
  }

  /** A rival's theme belongs to its card. Anywhere else, cut it; leave a planet theme running. */
  private dropRivalTheme() {
    if (currentTrack()?.startsWith('op')) setTrack(null, { cut: true });
  }

  /** the flight is flown: hand over, and route on to whatever this week holds */
  endTravel() {
    this.travelPending = false;
    if (!this.state) return;
    if (this.s.awaitingHandoff) this.dispatch({ type: 'continue' });
    else this.afterChange();
  }

  /** dismiss the weekly standings and route on to whatever comes next */
  closeReport() {
    this.error = null;
    if (this.state) this.afterChange();
  }

  help(screen?: Screen) {
    play('help');
    this.helpFor = screen ?? this.screen;
  }

  start(opts: NewGameOptions) {
    this.state = newGame(opts);
    this.shownCompany = -1;
    this.reportedWeek = this.state.week;
    this.newsShownWeek = this.state.week;
    this.afterChange();
  }

  /** host: create the game and broadcast it to the room */
  startOnline(opts: NewGameOptions) {
    const s = newGame(opts);
    online.startGame(s);
    this.adopt(s);
  }

  /** Apply an action; on rule violation show the message and keep the state. Returns success. */
  dispatch(a: Action): boolean {
    if (!this.state) return false;
    if (!this.canAct) {
      this.error = 'It is not your turn.';
      return false;
    }
    const trade = a.type === 'buy' || a.type === 'sell' ? soundForTrade(this.state, a) : '';
    const t0 = import.meta.env.DEV ? performance.now() : 0;
    try {
      this.state = applyAction(this.state, a);
      if (import.meta.env.DEV) this.lastCommit = { action: a, ms: performance.now() - t0 };
      this.error = null;
    } catch (e) {
      this.error = e instanceof ActionError ? e.message : String(e);
      play('error');
      return false;
    }
    play(trade || ACTION_SOUND[a.type] || '');
    if (online.active) online.broadcastAction(a, this.state);
    if (a.type === 'journey') {
      this.travelPending = true;
      // the history line needs two recordings to be a line; before that only the pie can be drawn
      this.travelChart =
        canPlotHistory(this.state) && this.s.week % 3 !== 0 ? 'history' : 'strength';
    }
    this.afterChange();
    return true;
  }

  /** Route to the right screen after the state changed, run AI turns, autosave. */
  private afterChange() {
    this.route();
    // after routing, not before: the music follows the screen this change lands on
    this.cueMusic();
  }

  private route() {
    const s = this.s;
    if (s.phase === 'gameOver' || s.phase === 'winner') {
      this.travelPending = false;
      this.state = s;
      this.screen = 'gameover';
      if (s.phase === 'gameOver') {
        const humans = s.companies.filter((c) => !c.isAI);
        const wonByHuman = s.winner !== null && !s.companies[s.winner]!.isAI;
        // a win gets music instead (see cueMusic); a loss gets the sting and silence
        if (!wonByHuman) play(humans.every((c) => c.bankrupt) ? 'bankrupt' : 'lose');
      }
      this.autosave();
      return;
    }
    if (online.active && !online.ownsCompany(currentIndex(s))) {
      // someone else's turn: spectate
      this.shownCompany = currentIndex(s);
      this.screen = 'waiting';
      this.autosave();
      return;
    }
    // the week rolled over: everyone sees the standings once before play resumes
    if (s.week !== this.reportedWeek) {
      this.reportedWeek = s.week;
      this.screen = 'report';
      this.autosave();
      return;
    }
    // the rollover's rival news, dealt once for the week before anyone's turn starts
    if (this.newsShownWeek !== s.week && rivalNews(s).length) {
      this.newsShownWeek = s.week;
      this.dealCards('news');
      this.autosave();
      return;
    }
    // the week's lesson is owed before this player may act
    if (s.tutorPending && s.phase === 'onPlanet') {
      this.shownCompany = currentIndex(s);
      this.screen = 'tutorial';
      this.autosave();
      return;
    }
    if (s.phase === 'event') {
      if (this.screen !== 'event') play(eventSound(s.pending?.id, s.pending?.mood));
      this.screen = 'event';
      this.autosave();
      return;
    }
    if (s.phase === 'arrival') {
      if (this.screen !== 'dispatch' && this.screen !== 'arrival') play('arrive');
      // a quiet landing has nothing to deal and goes straight to the welcome screen
      if (s.arrivalReports.length) this.dealCards('arrival');
      else this.screen = 'arrival';
      this.autosave();
      return;
    }
    // human on planet
    const ci = currentIndex(s);
    if (online.active && !online.ownsCompany(ci)) {
      this.shownCompany = ci;
      this.screen = 'waiting';
      this.autosave();
      return;
    }
    const humans = s.companies.filter((c) => !c.isAI && !c.bankrupt).length;
    if (ci !== this.shownCompany && humans > 1 && !online.active) {
      this.shownCompany = ci;
      this.screen = 'handoff';
    } else {
      this.shownCompany = ci;
      if (
        [
          'event',
          'dispatch',
          'arrival',
          'report',
          'travel',
          'handoff',
          'gameover',
          'title',
          'setup',
          'lobby',
          'waiting',
          'tutorial',
        ].includes(this.screen)
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
    const j = localStorage.getItem(AUTOSAVE_KEY);
    if (!j) return false;
    try {
      deserialize(j);
      return true;
    } catch {
      return false;
    }
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
      this.reportedWeek = this.state.week;
      this.newsShownWeek = this.state.week;
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
      this.reportedWeek = this.state.week;
      this.newsShownWeek = this.state.week;
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
