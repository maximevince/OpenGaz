/**
 * The lockstep guards: who may act, in what order, and what happens when two engines disagree.
 * Trystero is replaced by a fake room, so a single Online instance can be fed messages by hand.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyAction, newGame, type Action, type GameState } from '../engine';

type Sent = { name: string; data: unknown; target?: string };
type FakeAction = {
  send: (data: unknown, options?: { target?: string }) => Promise<void>;
  onMessage: ((data: unknown, context: { peerId: string }) => void) | null;
};

const net = vi.hoisted(() => {
  const sent: Sent[] = [];
  const actions = new Map<string, FakeAction>();
  const room = {
    makeAction: (name: string) => {
      const a: FakeAction = {
        send: async (data, o) => void sent.push({ name, data, target: o?.target }),
        onMessage: null,
      };
      actions.set(name, a);
      return a;
    },
    leave: async () => {},
    onPeerJoin: null as ((peerId: string) => void) | null,
    onPeerLeave: null as ((peerId: string) => void) | null,
  };
  return {
    sent,
    actions,
    joinRoom: () => {
      sent.length = 0;
      actions.clear();
      return room;
    },
  };
});

vi.mock('trystero/nostr', () => ({ selfId: 'SELF', joinRoom: net.joinRoom }));

const { online } = await import('./online.svelte');

const HOST = 'HOST';
/** the game the room is playing: two humans, no rivals, so seat i drives company i */
const fresh = () =>
  newGame({
    seed: 'LOCKSTEP',
    level: 'novice',
    humans: [
      { name: 'Host Co.', ship: 1 },
      { name: 'Guest Co.', ship: 1 },
    ],
    ai: 0,
  });
const lobbyFor = (state: GameState) => ({
  host: HOST,
  seats: [
    { name: state.companies[0]!.name, ship: 1, peer: HOST, player: 'Hosty' },
    { name: state.companies[1]!.name, ship: 1, peer: 'SELF', player: 'Guest' },
  ],
  ai: 0,
  level: 'novice' as const,
  planets: null,
  seed: 'LOCKSTEP',
});

const deliver = (name: string, data: unknown, peerId: string) =>
  net.actions.get(name)!.onMessage?.(data, { peerId });
const syncRequests = () => net.sent.filter((m) => m.name === 'syncreq');

/** what the acting peer would put on the wire for `a`, having applied it to `state` */
const wire = (state: GameState, a: Action, n: number) => {
  const after = applyAction(state, a);
  return { action: a, week: after.week, turn: after.turnIndex, rng: after.rng, n };
};

const DEPOSIT: Action = { type: 'bankDeposit', amount: 100 };

describe('online lockstep guards', () => {
  let state: GameState;

  /** join a room as the guest and take the host's snapshot, as a live game would */
  beforeEach(() => {
    state = fresh();
    online.onRemoteAction = (a) => {
      state = applyAction(state, a);
    };
    online.onStart = (s) => void (state = s);
    online.onSync = (s) => void (state = s);
    online.getState = () => state;
    online.join('ABCDEF', 'Guest');
    deliver('start', { state, lobby: lobbyFor(state), seq: 0 }, HOST);
    net.sent.length = 0;
  });

  afterEach(() => online.leave());

  it('applies an action from the peer whose turn it is', () => {
    const before = state.companies[0]!.bank;
    deliver('act', wire(state, DEPOSIT, 1), HOST);
    expect(state.companies[0]!.bank).toBe(before + 100);
    expect(online.seq).toBe(1);
    expect(syncRequests()).toHaveLength(0);
  });

  it('ignores an action from a peer that does not hold the current seat', () => {
    const before = state.companies[0]!.bank;
    // company 0 is the host's seat; we are 'SELF' and must not be able to move it
    deliver('act', wire(state, DEPOSIT, 1), 'SELF');
    expect(state.companies[0]!.bank).toBe(before);
    expect(online.seq).toBe(0);
    expect(syncRequests()).toHaveLength(0); // a stray action is not a reason to resync
  });

  it('asks the host for a snapshot when an action is missing from the sequence', () => {
    const before = state.companies[0]!.bank;
    deliver('act', wire(state, DEPOSIT, 2), HOST); // #1 never arrived
    expect(state.companies[0]!.bank).toBe(before);
    expect(online.seq).toBe(0);
    expect(syncRequests()).toHaveLength(1);
    expect(syncRequests()[0]!.target).toBe(HOST);
  });

  it('asks the host for a snapshot when the two engines end up in different states', () => {
    const msg = wire(state, DEPOSIT, 1);
    deliver('act', { ...msg, rng: (msg.rng ^ 0xffff) >>> 0 }, HOST);
    expect(syncRequests()).toHaveLength(1);
  });

  it('keeps only one snapshot request in flight', () => {
    deliver('act', wire(state, DEPOSIT, 5), HOST);
    deliver('act', wire(state, DEPOSIT, 6), HOST);
    expect(syncRequests()).toHaveLength(1);
  });

  it('adopts the sequence number that comes with a snapshot', () => {
    const snapshot = fresh();
    deliver('sync', { state: snapshot, lobby: lobbyFor(snapshot), seq: 7 }, HOST);
    expect(online.seq).toBe(7);
    deliver('act', wire(state, DEPOSIT, 8), HOST);
    expect(online.seq).toBe(8);
    expect(syncRequests()).toHaveLength(0);
  });

  it('ignores lobby, start and sync from anyone but the host', () => {
    const other = fresh();
    other.week = 42;
    deliver('sync', { state: other, lobby: lobbyFor(other), seq: 99 }, 'IMPOSTOR');
    expect(state.week).toBe(1);
    expect(online.seq).toBe(0);

    deliver('lobby', { ...lobbyFor(state), ai: 6 }, 'IMPOSTOR');
    expect(online.lobby!.ai).toBe(0);
  });
});

describe('lobby seats', () => {
  afterEach(() => online.leave());

  it('drops the seats nobody took when the host starts', () => {
    online.host('Hosty', 'novice', 2);
    online.addSeat();
    online.addSeat();
    expect(online.lobby!.seats).toHaveLength(3);

    const seats = online.claimedSeats();
    expect(seats).toHaveLength(1);
    expect(seats[0]!.peer).toBe('SELF');
    expect(online.lobby!.seats).toHaveLength(1);
    expect(net.sent.filter((m) => m.name === 'lobby')).not.toHaveLength(0);
  });
});
