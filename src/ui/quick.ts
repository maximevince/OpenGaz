/**
 * What each shortcut actually does.
 *
 * Every branch ends in the same engine action the sub-screen would have dispatched, so a
 * shortcut can never reach a state the long way round could not. Rule violations are left to
 * the reducer: its refusal message ("nothing owed", "the tank is full") is what the player
 * sees, which keeps one copy of each rule. Only cases the reducer would reject with a
 * technical message get a friendlier one here.
 */
import { game } from './game.svelte';
import type { QuickFlag } from './shortcuts.svelte';

/** Run a shortcut. Returns false when it bounced the player to the full screen instead. */
export function runQuick(flag: QuickFlag): boolean {
  const co = game.co;
  switch (flag) {
    case 'passengers':
      game.dispatch({ type: 'pickupPassengers' });
      return true;

    case 'advertising':
      if (co.adPassenger === 0 && co.adCommodity === 0) {
        // nothing to repeat yet — the player has to choose a campaign once
        game.go('advertise');
        return false;
      }
      game.dispatch({
        type: 'advertise',
        passenger: co.adPassenger,
        commodity: co.adCommodity,
      });
      return true;

    case 'crew':
      game.dispatch({ type: 'payCrew' });
      return true;

    case 'tax':
      game.dispatch({ type: 'payTaxes' });
      return true;

    case 'insurance':
      game.dispatch({ type: 'buyInsurance' });
      return true;

    case 'fuel': {
      const room = co.ship.fuelCap - co.ship.fuel;
      const price = game.planet.fuelPrice;
      const afford = Math.floor(co.cash / Math.max(1, price));
      if (room <= 0) {
        // the reducer checks the amount before the tank, so it would say "tons must be positive"
        game.error = 'The tank is already full.';
        return true;
      }
      if (afford <= 0) {
        game.error = 'Not enough cash for a single ton of fuel.';
        return true;
      }
      game.dispatch({ type: 'buyFuel', tons: Math.min(room, afford) });
      return true;
    }

    case 'bank':
      if (co.cash >= co.bank) {
        if (co.cash <= 0) {
          game.error = 'No cash to deposit.';
          return true;
        }
        game.dispatch({ type: 'bankDeposit', amount: co.cash });
      } else {
        game.dispatch({ type: 'bankWithdraw', amount: co.bank });
      }
      return true;

    case 'loan':
      if (co.cash > 0 && co.unionLoan > 0) {
        game.dispatch({ type: 'unionRepay', amount: Math.min(co.cash, co.unionLoan) });
      } else {
        const room = co.unionLimit - co.unionLoan;
        if (room <= 0) {
          game.error = 'You are already at your credit limit.';
          return true;
        }
        game.dispatch({ type: 'unionBorrow', amount: room });
      }
      return true;

    case 'explore':
      game.dispatch({ type: 'special' });
      return true;

    // handled where they happen: the two grids, and the map
    case 'buy':
    case 'warehouse':
    case 'deposit':
    case 'travel':
      return false;
  }
}
