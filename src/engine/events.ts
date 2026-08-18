/**
 * Travel events. M1 ships a small starter set; the full catalogue (~65 events, planet specials,
 * auctions) lands in M3. Everything here is deterministic through `r`.
 */
import type { CommodityId } from './data/commodities';
import { PLANET_BY_ID } from './data/planets';
import { cargoTons } from './economy';
import type { Rng } from './rng';
import type { CompanyState, GameState, LogEntry } from './types';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

function report(state: GameState, ci: number, kind: LogEntry['kind'], text: string): void {
  const e: LogEntry = { week: state.week, company: ci, kind, text };
  state.log.push(e);
  state.arrivalReports.push(e);
}

/** Roll 0–2 events for the trip. May set state.phase='event' + state.pending for a choice. */
export function rollTravelEvents(
  state: GameState,
  co: CompanyState,
  ci: number,
  _from: number,
  to: number,
  r: Rng,
): void {
  const dest = PLANET_BY_ID[state.planets[to]!.id].name;
  // ~55 % of trips are uneventful
  if (r.chance(0.55)) return;
  const good = r.chance(co.luck);
  if (good) {
    switch (r.int(1, 4)) {
      case 1: {
        const found = r.int(1, 6) * 1000;
        co.cash += found;
        report(
          state,
          ci,
          'good',
          `Your crew salvaged a drifting cargo pod on the way to ${dest} and sold the scrap for ${fmt(found)} kubars.`,
        );
        return;
      }
      case 2: {
        const win = r.int(3, 15) * 1000;
        co.cash += win;
        report(
          state,
          ci,
          'good',
          `Congratulations! Your Trader's Union lottery number came up. You win ${fmt(win)} kubars.`,
        );
        return;
      }
      case 3: {
        co.lastTravelTime *= 0.6;
        report(
          state,
          ci,
          'good',
          `A favourable solar wind pushed your ship along. You reach ${dest} well ahead of schedule.`,
        );
        return;
      }
      default: {
        const pay = r.int(3, 9) * 1000;
        state.pending = {
          id: 'hitchhiker',
          title: 'A stranded traveller',
          text: `Halfway to ${dest} you pick up a distress call. Snoz Lombardo, a travelling salesman, offers ${fmt(pay)} kubars for a lift. Take him aboard?`,
          choices: [
            { id: 'yes', label: 'Give him a lift' },
            { id: 'no', label: 'Leave him' },
          ],
          data: { pay },
        };
        state.phase = 'event';
        return;
      }
    }
  }
  switch (r.int(1, 4)) {
    case 1: {
      if (cargoTons(co) === 0) {
        report(
          state,
          ci,
          'bad',
          'You flew through a meteor storm. Luckily the cargo bay was empty.',
        );
        return;
      }
      const lostVal = damageCargo(co, 0.25, r);
      if (co.insured) {
        co.cash += lostVal;
        report(
          state,
          ci,
          'bad',
          `A meteor storm ruined a quarter of your cargo. Voyager's Insurance reimbursed you ${fmt(lostVal)} kubars.`,
        );
      } else {
        report(
          state,
          ci,
          'bad',
          `A meteor storm ruined a quarter of your cargo (worth ${fmt(lostVal)} kubars). You were not insured.`,
        );
      }
      return;
    }
    case 2: {
      const loot = Math.min(co.cash, r.int(5, 20) * 1000);
      if (loot <= 0) {
        report(
          state,
          ci,
          'bad',
          'The Bro Nap pirates boarded your ship, found no cash, and left in disgust.',
        );
        return;
      }
      co.cash -= loot;
      if (co.insured) {
        co.cash += loot;
        report(
          state,
          ci,
          'bad',
          `Bro Nap pirates stole ${fmt(loot)} kubars. Voyager's Insurance covered the loss.`,
        );
      } else {
        report(state, ci, 'bad', `Bro Nap pirates stole ${fmt(loot)} kubars from your safe.`);
      }
      return;
    }
    case 3: {
      const leak = Math.floor(co.ship.fuel / 2);
      co.ship.fuel -= leak;
      report(
        state,
        ci,
        'bad',
        `A fuel line ruptured near a Bobble Warp. You lost ${leak} tons of Ionic Fuel.`,
      );
      return;
    }
    default: {
      co.lastTravelTime *= 1.6;
      report(state, ci, 'bad', `Solar storms forced a long detour. You reach ${dest} late.`);
      return;
    }
  }
}

/** Resolve a choice for the pending event `id`. May chain by setting phase='event' again. */
export function resolveEventChoice(
  state: GameState,
  co: CompanyState,
  id: string,
  choice: string,
  data: Record<string, unknown>,
  r: Rng,
): void {
  const ci = state.companies.indexOf(co);
  switch (id) {
    case 'hitchhiker': {
      if (choice !== 'yes') return;
      const pay = Number(data.pay ?? 0);
      if (r.chance(0.8)) {
        co.cash += pay;
        report(
          state,
          ci,
          'good',
          `Snoz Lombardo paid the promised ${fmt(pay)} kubars and thanked you profusely.`,
        );
      } else {
        report(
          state,
          ci,
          'bad',
          'Snoz Lombardo slipped away on arrival without paying a single kubar.',
        );
      }
      return;
    }
    default:
      return;
  }
}

/** Destroy `frac` of every cargo lot; returns the value (at price paid) destroyed. */
function damageCargo(co: CompanyState, frac: number, r: Rng): number {
  let value = 0;
  for (const c of Object.keys(co.cargo) as CommodityId[]) {
    const lot = co.cargo[c]!;
    const lost = Math.min(
      lot.tons,
      Math.max(1, Math.round(lot.tons * frac * (0.7 + 0.6 * r.float()))),
    );
    value += lost * lot.paid;
    lot.tons -= lost;
    if (lot.tons <= 0) delete co.cargo[c];
  }
  return Math.round(value);
}
