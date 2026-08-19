/**
 * Balance simulation (not a real test). Run with:  SIM=1 pnpm vitest run sim
 *
 * A deliberately simple scripted trader plays out full games so we can watch the economy's
 * shape: how long a game lasts, how the rivals' wealth curve behaves, how often the trader
 * is driven under. It is a yardstick for tuning, not an assertion of correctness.
 */
import { describe, it } from 'vitest';
import {
  Rng,
  applyAction,
  cargoTons,
  currentCompany,
  netWorth,
  newGame,
  type Action,
  type CommodityId,
  type GameState,
} from './index';

const enabled = !!process.env.SIM;

/** Play one human turn with a plain buy-low/sell-high heuristic. */
function playTurn(state: GameState, r: Rng): GameState {
  let s = state;
  const act = (a: Action): boolean => {
    try {
      s = applyAction(s, a);
      return true;
    } catch {
      return false;
    }
  };
  const co = () => currentCompany(s);
  const here = () => s.planets[co().planet]!;

  // 1. sell anything that turns a profit here
  for (const c of Object.keys(co().cargo) as CommodityId[]) {
    const lot = co().cargo[c]!;
    if ((here().price[c] ?? 0) > lot.paid) act({ type: 'sell', commodity: c, tons: lot.tons });
  }
  // 2. bills first — an audit costs three times as much
  if (co().wagesOwed > 0) act({ type: 'payCrew' });
  if (co().taxOwedPassenger + co().taxOwedTariff > 0) act({ type: 'payTaxes' });
  // 2b. Mr. Zinn compounds at 4 %/week and forecloses at his limit: pay him down relentlessly,
  //     and empty the tills for him once the debt gets close to that limit.
  const urgent = co().zinnLoan > co().zinnLimit * 0.8;
  const reserve = urgent ? 2_000 : 30_000;
  if (co().unionLoan > 0 && !urgent && co().cash > 40_000) {
    act({ type: 'unionRepay', amount: Math.min(co().unionLoan, co().cash - reserve) });
  }
  if (co().zinnLoan > 0 && co().cash > reserve) {
    if (urgent && co().bank > 0) act({ type: 'bankWithdraw', amount: co().bank });
    act({ type: 'zinnRepay', amount: Math.min(co().zinnLoan, co().cash - reserve) });
  }

  // 2c. no cash means no trade: the Union is the only way to open the game at higher levels
  if (co().cash < 10_000 && co().unionLoan < co().unionLimit) {
    act({ type: 'unionBorrow', amount: Math.min(40_000, co().unionLimit - co().unionLoan) });
  }

  // 3. pick the destination with the best spread on one commodity
  let dest = (co().planet + 1) % s.planets.length;
  let bestGain = -Infinity;
  for (let d = 0; d < s.planets.length; d++) {
    if (d === co().planet) continue;
    for (const c of s.commodities) {
      const gain = (s.planets[d]!.price[c] ?? 0) - (here().price[c] ?? 0);
      if (gain > bestGain && (here().stock[c] ?? 0) > 0) {
        bestGain = gain;
        dest = d;
      }
    }
  }
  // 4. fuel for the trip
  const room = co().ship.fuelCap - co().ship.fuel;
  if (room > 0) act({ type: 'buyFuel', tons: room });

  // 5. fill the hold with the best spread toward that destination
  const wanted = s.commodities
    .map((c) => ({ c, gain: (s.planets[dest]!.price[c] ?? 0) - (here().price[c] ?? 0) }))
    .filter((x) => x.gain > 0)
    .sort((a, b) => b.gain - a.gain);
  for (const { c } of wanted) {
    const price = here().price[c] ?? 1;
    const tons = Math.min(
      co().ship.cargo - cargoTons(co()),
      here().stock[c] ?? 0,
      Math.floor(co().cash / Math.max(1, price)),
    );
    if (tons > 0) act({ type: 'buy', commodity: c, tons });
  }
  // 6. passengers and a modest ad budget
  act({ type: 'setTicketPrice', price: 2000 });
  act({ type: 'advertise', passenger: 3, commodity: 0 });
  act({ type: 'pickupPassengers' });
  if (co().cash > 30_000) act({ type: 'buyInsurance' });

  // 7. go
  if (!act({ type: 'journey', to: dest })) return s;
  let guard = 0;
  while (s.pending && guard++ < 40) {
    const ev = s.pending;
    const ids = ev.choices.map((c) => c.id);
    // never volunteer for bankruptcy at the credit gate; otherwise take a coin flip on offers
    const choice = ev.id.startsWith('gate:')
      ? 'yes'
      : ids.length === 0
        ? 'ok'
        : ids.includes('yes') && r.chance(0.5)
          ? 'yes'
          : ids[ids.length - 1]!;
    if (!act({ type: 'eventChoice', choice, amount: ev.input?.initial })) break;
  }
  if (s.phase === 'arrival') act({ type: 'continue' });
  return s;
}

describe.skipIf(!enabled)('simulation', () => {
  it('plays a scripted trader against the six rivals', { timeout: 600_000 }, () => {
    const N = Number(process.env.SIM_N ?? 20);
    const r = new Rng(12345);
    const lengths: number[] = [];
    let humanWins = 0;
    let humanBust = 0;
    const worths: number[] = [];
    for (let i = 0; i < N; i++) {
      let s: GameState = newGame({
        seed: `sim-${i}`,
        level: (process.env.SIM_LEVEL as 'novice') ?? 'novice',
        humans: [{ name: 'Sim Trading', ship: 1 }],
        ai: 6,
      });
      let guard = 0;
      while (s.phase !== 'gameOver' && s.phase !== 'winner' && s.week < 300 && guard++ < 4000) {
        if (s.phase === 'arrival') {
          s = applyAction(s, { type: 'continue' });
          continue;
        }
        if (s.phase !== 'onPlanet') break;
        const before = s.week * 1000 + s.turnIndex;
        s = playTurn(s, r);
        if (s.week * 1000 + s.turnIndex === before && s.phase === 'onPlanet') break; // stuck
      }
      lengths.push(s.week);
      const h = s.companies[0]!;
      worths.push(netWorth(s, h));
      if (h.bankrupt) humanBust++;
      if (s.winner === 0) humanWins++;
      if (i === 0) {
        console.log(
          'sample final:',
          s.companies
            .map((c) => `${c.name} nw=${netWorth(s, c)}${c.bankrupt ? ' BUST' : ''}`)
            .join(' | '),
        );
      }
    }
    lengths.sort((a, b) => a - b);
    worths.sort((a, b) => a - b);
    console.log(
      `games=${N} weeks min/median/max=${lengths[0]}/${lengths[Math.floor(N / 2)]}/${lengths[N - 1]} ` +
        `humanWins=${humanWins} humanBust=${humanBust} ` +
        `netWorth median=${worths[Math.floor(N / 2)]}`,
    );
  });
});
