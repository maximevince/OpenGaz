/**
 * Online rooms over WebRTC (Trystero, signalling via public Nostr relays — no server of ours).
 *
 * Model: lockstep. Every peer runs the same deterministic engine; only the player who owns the
 * current company may act, and their actions are broadcast and applied by everyone in order.
 * AI turns are computed locally by each peer (deterministic from the shared state).
 * Late joiners / reconnects ask the host for a full state snapshot.
 *
 * Peers are not trusted to be correct (nor honest), so every inbound message is checked:
 *   - an action is only accepted from the peer sitting in the seat whose turn it is;
 *   - actions form one global sequence, so a gap means we missed one — snapshot instead;
 *   - each action carries the sender's post-action week/turn/rng, which must match ours after
 *     we apply it, otherwise the two engines have silently diverged — snapshot instead;
 *   - lobby/start/sync only count when they come from the host.
 * Every one of those failures resolves the same way: ask the host for a fresh snapshot.
 */
import { joinRoom, selfId, type Room } from 'trystero/nostr';
import { currentIndex, type Action, type GameState, type Level, type PlanetId } from '../engine';

const APP_ID = 'opengaz-v1';

export interface Seat {
  name: string; // company name
  ship: number;
  peer: string | null; // Trystero peer id controlling this seat
  player: string; // human-readable player name
}

export interface Lobby {
  host: string; // peer id
  seats: Seat[];
  ai: number;
  level: Level;
  planets: PlanetId[] | null; // null = random
  seed: string;
}

interface MessageAction<T> {
  send: (data: T, options?: { target?: string | string[] | null }) => Promise<void>;
  onMessage: ((data: T, context: { peerId: string }) => void) | null;
}

type Hello = { name: string };
type Claim = { seat: number | null; name: string };
/** `week`/`turn`/`rng` are the sender's state *after* applying `action` — our divergence check. */
type Act = { action: Action; week: number; turn: number; rng: number; n: number };
type Sync = { state: GameState; lobby: Lobby; seq: number };

export type OnlineStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'error';

function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  for (const b of buf) s += alphabet[b % alphabet.length];
  return s;
}

class Online {
  status = $state<OnlineStatus>('idle');
  code = $state<string | null>(null);
  error = $state<string | null>(null);
  myName = $state('');
  lobby = $state<Lobby | null>(null);
  peers = $state<Record<string, string>>({}); // peerId -> player name
  /** number of actions applied so far this game — one global counter, same on every peer */
  seq = 0;

  private room: Room | null = null;
  /** a snapshot has been asked for and not arrived yet (stops resync storms) */
  private syncPending = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private send: {
    hello?: (d: Hello) => Promise<void>;
    lobby?: (d: Lobby) => Promise<void>;
    claim?: (d: Claim, o?: { target: string }) => Promise<void>;
    start?: (d: Sync) => Promise<void>;
    act?: (d: Act) => Promise<void>;
    sync?: (d: Sync, o?: { target: string }) => Promise<void>;
    syncReq?: (d: Hello, o?: { target: string }) => Promise<void>;
  } = {};

  /** hooks wired by the game store */
  onRemoteAction: ((a: Action) => void) | null = null;
  onStart: ((state: GameState) => void) | null = null;
  onSync: ((state: GameState) => void) | null = null;
  getState: (() => GameState | null) | null = null;

  get selfId() {
    return selfId;
  }
  get isHost() {
    return !!this.lobby && this.lobby.host === selfId;
  }
  get active() {
    return this.status === 'playing';
  }
  /** company indices this browser controls (seat order == human company order) */
  mySeats(): number[] {
    return (this.lobby?.seats ?? [])
      .map((s, i) => (s.peer === selfId ? i : -1))
      .filter((i) => i >= 0);
  }
  ownsCompany(ci: number): boolean {
    return this.mySeats().includes(ci);
  }
  peerNameFor(ci: number): string {
    const seat = this.lobby?.seats[ci];
    if (!seat) return 'computer';
    return seat.peer ? (this.peers[seat.peer] ?? seat.player) : `${seat.player} (away)`;
  }

  /* ------------------------------------------------------------ connect */

  host(playerName: string, level: Level = 'novice', ai = 3): void {
    const code = makeCode();
    this.connect(code, playerName);
    this.lobby = {
      host: selfId,
      seats: [{ name: `${playerName}'s Trading Co.`, ship: 1, peer: selfId, player: playerName }],
      ai,
      level,
      planets: null,
      seed: makeCode(),
    };
    this.status = 'lobby';
  }

  join(code: string, playerName: string): void {
    this.connect(code.trim().toUpperCase(), playerName);
    this.status = 'connecting';
  }

  private connect(code: string, playerName: string): void {
    this.leave();
    this.myName = playerName;
    this.code = code;
    this.error = null;
    this.peers = { [selfId]: playerName };
    let room: Room;
    try {
      room = joinRoom({ appId: APP_ID }, `room-${code}`, {
        onJoinError: (e) => {
          this.error = e.error;
          this.status = 'error';
        },
      });
    } catch (e) {
      this.status = 'error';
      this.error = String(e);
      return;
    }
    this.room = room;
    // Trystero types payloads as JsonValue; our plain data objects qualify at runtime.
    const mk = <T>(name: string) => room.makeAction(name) as unknown as MessageAction<T>;
    const hello = mk<Hello>('hello');
    const lobby = mk<Lobby>('lobby');
    const claim = mk<Claim>('claim');
    const start = mk<Sync>('start');
    const act = mk<Act>('act');
    const sync = mk<Sync>('sync');
    const syncReq = mk<Hello>('syncreq');
    this.send = {
      hello: hello.send,
      lobby: lobby.send,
      claim: (d, o) => claim.send(d, o),
      start: start.send,
      act: act.send,
      sync: (d, o) => sync.send(d, o),
      syncReq: (d, o) => syncReq.send(d, o),
    };

    room.onPeerJoin = (peerId) => {
      hello.send({ name: this.myName }, { target: peerId });
      if (this.isHost && this.lobby) {
        if (this.status === 'playing') {
          const state = this.getState?.();
          if (state) sync.send({ state, lobby: this.lobby, seq: this.seq }, { target: peerId });
        } else lobby.send(this.lobby, { target: peerId });
      }
    };
    room.onPeerLeave = (peerId) => {
      const { [peerId]: _gone, ...rest } = this.peers;
      void _gone;
      this.peers = rest;
      if (this.isHost && this.lobby) {
        // free the seat but remember the player name so they can reclaim it
        let changed = false;
        for (const s of this.lobby.seats) {
          if (s.peer === peerId) {
            s.peer = null;
            changed = true;
          }
        }
        if (changed) this.broadcastLobby();
      }
    };
    hello.onMessage = (d, { peerId }) => {
      this.peers = { ...this.peers, [peerId]: d.name };
      if (this.isHost && this.lobby) {
        // reconnecting player: rebind their old seat by player name
        let changed = false;
        for (const s of this.lobby.seats) {
          if (!s.peer && s.player === d.name) {
            s.peer = peerId;
            changed = true;
          }
        }
        if (changed) {
          this.broadcastLobby();
          if (this.status === 'playing') {
            const state = this.getState?.();
            if (state) sync.send({ state, lobby: this.lobby, seq: this.seq }, { target: peerId });
          }
        }
      }
    };
    lobby.onMessage = (d, { peerId }) => {
      if (d.host !== peerId) return; // only the host owns the lobby
      this.lobby = d;
      if (this.status === 'connecting') this.status = 'lobby';
    };
    claim.onMessage = (d, { peerId }) => {
      if (!this.isHost || !this.lobby || this.status !== 'lobby') return;
      for (const s of this.lobby.seats) if (s.peer === peerId) s.peer = null;
      if (d.seat !== null && this.lobby.seats[d.seat] && !this.lobby.seats[d.seat]!.peer) {
        const s = this.lobby.seats[d.seat]!;
        s.peer = peerId;
        s.player = d.name;
        s.name = s.name || `${d.name}'s Trading Co.`;
      }
      this.broadcastLobby();
    };
    start.onMessage = (d, { peerId }) => {
      if (d.lobby.host !== peerId) return;
      this.lobby = d.lobby;
      this.status = 'playing';
      this.syncSettled();
      this.seq = d.seq;
      this.onStart?.(d.state);
    };
    sync.onMessage = (d, { peerId }) => {
      if (d.lobby.host !== peerId) return;
      this.lobby = d.lobby;
      this.status = 'playing';
      this.syncSettled();
      // adopt the host's counter with its state, or every later action would look like a gap
      this.seq = d.seq;
      this.onSync?.(d.state);
    };
    act.onMessage = (d, { peerId }) => {
      if (this.status !== 'playing') return;
      const before = this.getState?.();
      if (!before) return this.desync('an action arrived before we had a game state');
      // only the peer holding the seat whose turn it is may move that company
      const seat = this.lobby?.seats[currentIndex(before)];
      if (!seat || seat.peer !== peerId) {
        console.warn('[online] ignoring an action from a peer that does not hold the current seat');
        return;
      }
      if (d.n !== this.seq + 1)
        return this.desync(`action #${d.n} arrived with #${this.seq} applied`);
      this.seq = d.n;
      this.onRemoteAction?.(d.action);
      // the rng word is a cheap whole-state fingerprint: it moves on every roll the engine makes
      const after = this.getState?.();
      if (!after || after.week !== d.week || after.turnIndex !== d.turn || after.rng !== d.rng)
        this.desync('our engine ended up somewhere else than the acting peer');
    };
    syncReq.onMessage = (_d, { peerId }) => {
      if (!this.isHost || !this.lobby) return;
      const state = this.getState?.();
      if (state) sync.send({ state, lobby: this.lobby, seq: this.seq }, { target: peerId });
    };
  }

  leave(): void {
    this.syncSettled();
    this.room?.leave();
    this.room = null;
    this.status = 'idle';
    this.lobby = null;
    this.code = null;
    this.peers = {};
    this.seq = 0;
  }

  /* -------------------------------------------------------------- lobby */

  private broadcastLobby(): void {
    if (this.lobby) {
      this.lobby = { ...this.lobby, seats: this.lobby.seats.map((s) => ({ ...s })) };
      void this.send.lobby?.(this.lobby);
    }
  }

  /** host: edit lobby settings */
  updateLobby(patch: Partial<Pick<Lobby, 'ai' | 'level' | 'planets' | 'seed'>>): void {
    if (!this.isHost || !this.lobby) return;
    Object.assign(this.lobby, patch);
    this.broadcastLobby();
  }
  addSeat(): void {
    if (!this.isHost || !this.lobby || this.lobby.seats.length >= 6) return;
    this.lobby.seats.push({
      name: `Company ${this.lobby.seats.length + 1}`,
      ship: 1 + (this.lobby.seats.length % 12),
      peer: null,
      player: '',
    });
    this.broadcastLobby();
  }
  removeSeat(i: number): void {
    if (!this.isHost || !this.lobby || this.lobby.seats.length <= 1) return;
    this.lobby.seats.splice(i, 1);
    this.broadcastLobby();
  }
  renameSeat(i: number, name: string, ship?: number): void {
    if (!this.lobby) return;
    const s = this.lobby.seats[i];
    if (!s) return;
    if (this.isHost) {
      s.name = name;
      if (ship) s.ship = ship;
      this.broadcastLobby();
    }
  }
  claimSeat(i: number | null): void {
    if (!this.lobby) return;
    if (this.isHost) {
      for (const s of this.lobby.seats) if (s.peer === selfId) s.peer = null;
      if (i !== null && this.lobby.seats[i] && !this.lobby.seats[i]!.peer) {
        this.lobby.seats[i]!.peer = selfId;
        this.lobby.seats[i]!.player = this.myName;
      }
      this.broadcastLobby();
    } else void this.send.claim?.({ seat: i, name: this.myName });
  }

  /**
   * Host, on start: drop the seats nobody took, and return the ones that are played.
   *
   * An unclaimed seat would still become a human company, and the turn order would stop dead on
   * it the moment it came round — no browser owns it, so nobody can end its turn.
   */
  claimedSeats(): Seat[] {
    if (!this.lobby) return [];
    if (!this.isHost) return this.lobby.seats;
    const claimed = this.lobby.seats.filter((s) => s.peer);
    if (claimed.length !== this.lobby.seats.length) {
      this.lobby.seats = claimed;
      this.broadcastLobby();
    }
    return this.lobby.seats;
  }

  /** host: start the game with the given initial state and tell everyone */
  startGame(state: GameState): void {
    if (!this.isHost || !this.lobby) return;
    this.status = 'playing';
    this.seq = 0;
    void this.send.start?.({ state, lobby: this.lobby, seq: 0 });
  }

  /* -------------------------------------------------------------- play */

  /** `state` is the state *after* `a` was applied here — the peers check theirs against it. */
  broadcastAction(a: Action, state: GameState): void {
    if (this.status !== 'playing') return;
    this.seq++;
    void this.send.act?.({
      action: a,
      week: state.week,
      turn: state.turnIndex,
      rng: state.rng,
      n: this.seq,
    });
  }

  /** we cannot trust our own state any more: say why, and get a fresh one from the host */
  private desync(why: string): void {
    console.warn(`[online] out of step — ${why}; asking the host for a snapshot`);
    this.requestSync();
  }

  private syncSettled(): void {
    this.syncPending = false;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = null;
  }

  requestSync(): void {
    if (!this.lobby || this.syncPending) return;
    this.syncPending = true;
    // a snapshot can go missing (host gone, message lost); let the next attempt through
    this.syncTimer = setTimeout(() => this.syncSettled(), 5000);
    void this.send.syncReq?.({ name: this.myName }, { target: this.lobby.host });
  }

  inviteLink(): string {
    return `${location.origin}${location.pathname}?room=${this.code}`;
  }
}

export const online = new Online();
