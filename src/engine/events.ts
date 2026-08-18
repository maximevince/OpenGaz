/**
 * Travel events — the catalogue of misfortunes, windfalls and shady offers that hit a ship
 * between planets. Data-driven: each entry has a weight and an `apply` that mutates the
 * company/world and reports text. Some events pause for a choice (state.pending).
 * Everything is deterministic through `r`.
 */
import { COMMODITY_BY_ID, priceRange, type CommodityId } from './data/commodities';
import { PLANET_BY_ID } from './data/planets';
import { cargoTons } from './economy';
import type { Rng } from './rng';
import type { CompanyState, GameState, LogEntry, PendingEvent } from './types';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export interface EventCtx {
  state: GameState;
  co: CompanyState;
  ci: number;
  from: number;
  to: number;
  dest: string;
  r: Rng;
  report: (kind: LogEntry['kind'], text: string) => void;
  /** take an insurable loss: returns text suffix and applies the money */
  loss: (amount: number, insurable?: boolean) => string;
  ask: (ev: Omit<PendingEvent, 'context'>) => void;
}

interface EventDef {
  id: string;
  kind: 'good' | 'bad' | 'neutral';
  weight: number;
  /** minimum week */
  minWeek?: number;
  apply: (c: EventCtx) => void;
}

/* ------------------------------------------------------------------ helpers */

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

function biggestLot(co: CompanyState): [CommodityId, { tons: number; paid: number }] | null {
  let best: [CommodityId, { tons: number; paid: number }] | null = null;
  for (const c of Object.keys(co.cargo) as CommodityId[]) {
    const lot = co.cargo[c]!;
    if (!best || lot.tons * lot.paid > best[1].tons * best[1].paid) best = [c, lot];
  }
  return best;
}

function k(n: number) {
  return n * 1000;
}

/* --------------------------------------------------------------- catalogue */

export const EVENTS: EventDef[] = [
  /* ---------------- bad ---------------- */
  {
    id: 'meteor',
    kind: 'bad',
    weight: 10,
    apply: (c) => {
      if (cargoTons(c.co) === 0)
        return c.report(
          'bad',
          'A meteor storm peppered the hull. Luckily the cargo bay was empty.',
        );
      const v = damageCargo(c.co, 0.25, c.r);
      c.report(
        'bad',
        `A meteor storm ruined a quarter of your cargo (worth ${fmt(v)} kubars). ${c.loss(v)}`,
      );
    },
  },
  {
    id: 'pirates',
    kind: 'bad',
    weight: 8,
    apply: (c) => {
      const loot = Math.min(c.co.cash, k(c.r.int(5, 20)));
      if (loot <= 0)
        return c.report(
          'bad',
          'The Bro Nap pirates boarded, found an empty safe, and left in disgust.',
        );
      c.report(
        'bad',
        `Bro Nap pirates boarded your ship and emptied the safe of ${fmt(loot)} kubars. ${c.loss(loot)}`,
      );
    },
  },
  {
    id: 'bandits',
    kind: 'bad',
    weight: 7,
    apply: (c) => {
      const lot = biggestLot(c.co);
      if (!lot)
        return c.report(
          'bad',
          'The Baid-Rowel bandits stopped your ship, found nothing worth taking, and stole the coffee instead.',
        );
      const tons = Math.max(1, Math.round(lot[1].tons * 0.5));
      const v = tons * lot[1].paid;
      lot[1].tons -= tons;
      if (lot[1].tons <= 0) delete c.co.cargo[lot[0]];
      c.report(
        'bad',
        `The Baid-Rowel bandits made off with ${tons} tons of ${COMMODITY_BY_ID[lot[0]].name} (worth ${fmt(v)}). ${c.loss(v)}`,
      );
    },
  },
  {
    id: 'rebels',
    kind: 'bad',
    weight: 5,
    apply: (c) => {
      const fine = k(c.r.int(3, 12));
      c.co.lastTravelTime *= 1.4;
      c.report(
        'bad',
        `Chichi Bobo's rebels commandeered your ship for a "revolutionary detour" and demanded ${fmt(fine)} kubars for the fuel. ${c.loss(fine)}`,
      );
    },
  },
  {
    id: 'smugglers',
    kind: 'bad',
    weight: 5,
    apply: (c) => {
      const fine = k(c.r.int(5, 15));
      c.report(
        'bad',
        `Darleen's smugglers hid contraband in your hold. The Galaxy Police found it on arrival and fined you ${fmt(fine)} kubars. ${c.loss(fine, false)}`,
      );
    },
  },
  {
    id: 'solarstorm',
    kind: 'bad',
    weight: 8,
    apply: (c) => {
      c.co.lastTravelTime *= 1.6;
      c.report(
        'bad',
        `Solar storms forced a long detour. You reach ${c.dest} late — the others get to the market first.`,
      );
    },
  },
  {
    id: 'hurricane',
    kind: 'bad',
    weight: 5,
    apply: (c) => {
      const v = damageCargo(c.co, 0.15, c.r);
      c.co.lastTravelTime *= 1.3;
      c.report(
        'bad',
        `A space hurricane tossed the ship around for days. Cargo worth ${fmt(v)} kubars was smashed. ${c.loss(v)}`,
      );
    },
  },
  {
    id: 'fuelleak',
    kind: 'bad',
    weight: 6,
    apply: (c) => {
      const leak = Math.floor(c.co.ship.fuel / 2);
      c.co.ship.fuel -= leak;
      c.report(
        'bad',
        `A fuel line ruptured near a Bobble Warp. You lost ${leak} tons of Ionic Fuel.`,
      );
    },
  },
  {
    id: 'breakdown',
    kind: 'bad',
    weight: 6,
    apply: (c) => {
      const cost = k(c.r.int(4, 14));
      c.report(
        'bad',
        `The engine coughed, sputtered and died. A passing mechanic from Xeen fixed it for ${fmt(cost)} kubars. ${c.loss(cost)}`,
      );
    },
  },
  {
    id: 'rotten',
    kind: 'bad',
    weight: 5,
    apply: (c) => {
      const agri = (Object.keys(c.co.cargo) as CommodityId[]).filter(
        (x) => COMMODITY_BY_ID[x].agri,
      );
      if (agri.length === 0)
        return c.report(
          'bad',
          'The cargo hold overheated. Nothing perishable aboard, so no harm done — this time.',
        );
      const x = c.r.pick(agri);
      const lot = c.co.cargo[x]!;
      const v = lot.tons * lot.paid;
      delete c.co.cargo[x];
      c.report(
        'bad',
        `The cargo hold overheated and your ${COMMODITY_BY_ID[x].name} went rotten — ${lot.tons} tons dumped into space (worth ${fmt(v)}). ${c.loss(v)}`,
      );
    },
  },
  {
    id: 'lawsuit',
    kind: 'bad',
    weight: 3,
    minWeek: 6,
    apply: (c) => {
      const cost = k(c.r.int(6, 20));
      c.report(
        'bad',
        `A passenger sued you over a "traumatic in-flight meal". The Imperial Magistrate awarded them ${fmt(cost)} kubars. ${c.loss(cost, false)}`,
      );
    },
  },
  {
    id: 'uniondemand',
    kind: 'bad',
    weight: 4,
    minWeek: 5,
    apply: (c) => {
      c.co.crewSalary += 100;
      c.report(
        'bad',
        `The Space Workers' Union negotiated a raise: crew salaries are now ${fmt(c.co.crewSalary)} per person per week.`,
      );
    },
  },
  {
    id: 'insuranceup',
    kind: 'bad',
    weight: 4,
    apply: (c) => {
      c.co.mods.insurance = Math.min(3, c.co.mods.insurance * 1.3);
      c.report(
        'bad',
        "Voyager's Insurance reviewed your accident record and raised your premiums by 30 %.",
      );
    },
  },
  {
    id: 'zinnhalf',
    kind: 'bad',
    weight: 3,
    minWeek: 8,
    apply: (c) => {
      if (c.co.zinnLoan < 20000)
        return c.report(
          'bad',
          'Mr. Zinn sent his enforcer Nibble to remind you who owns your ship. Nibble ate your lunch and left.',
        );
      const due = Math.round(c.co.zinnLoan * 0.25);
      c.co.zinnLoan -= due;
      c.co.cash -= due;
      if (c.co.cash < 0) {
        c.co.unionLoan += -c.co.cash;
        c.co.cash = 0;
      }
      c.report(
        'bad',
        `Mr. Zinn's enforcer Nibble demanded a quarter of your debt on the spot: ${fmt(due)} kubars, paid.`,
      );
    },
  },
  {
    id: 'ratehike',
    kind: 'bad',
    weight: 4,
    apply: (c) => {
      c.co.unionRate = Math.min(0.1, c.co.unionRate + 0.01);
      c.report(
        'bad',
        `The Trader's Union raised your loan interest to ${Math.round(c.co.unionRate * 100)} % per week.`,
      );
    },
  },
  {
    id: 'dreddonation',
    kind: 'bad',
    weight: 5,
    apply: (c) => {
      const amt = k(c.r.int(3, 10));
      c.ask({
        id: 'dreddonation',
        title: 'A request from the Emperor',
        text: `An Imperial courier intercepts your ship. Supreme Commander Dred Nicolson is building a new statue of himself and requests a voluntary donation of ${fmt(amt)} kubars. Refusing is, of course, entirely permitted.`,
        choices: [
          { id: 'yes', label: 'Donate (sigh)' },
          { id: 'no', label: 'Refuse' },
        ],
        portrait: 'dred',
        mood: 'bad',
        data: { amt },
      });
    },
  },
  {
    id: 'warehousefire',
    kind: 'bad',
    weight: 3,
    minWeek: 4,
    apply: (c) => {
      const stocked = Object.entries(c.co.warehouse).filter(([, w]) =>
        Object.values(w).some((l) => (l?.tons ?? 0) > 0),
      );
      if (stocked.length === 0)
        return c.report(
          'bad',
          'A warehouse fire on a distant planet made the news. Yours were empty, so you slept fine.',
        );
      const [pi, w] = c.r.pick(stocked);
      let v = 0;
      for (const [cid, lot] of Object.entries(w) as [
        CommodityId,
        { tons: number; paid: number },
      ][]) {
        v += lot.tons * lot.paid;
        delete w[cid];
      }
      c.report(
        'bad',
        `Fire! Your warehouse on ${PLANET_BY_ID[c.state.planets[Number(pi)]!.id].name} burned to the ground with goods worth ${fmt(v)} kubars inside. ${c.loss(v)}`,
      );
    },
  },
  {
    id: 'mindbuggers',
    kind: 'bad',
    weight: 3,
    apply: (c) => {
      const wrong = c.r.pick(
        c.state.planets.map((_, i) => i).filter((i) => i !== c.from && i !== c.to),
      );
      c.state.destination = wrong;
      c.co.lastTravelTime *= 1.5;
      c.report(
        'bad',
        `The Cylet Mind Buggers scrambled your navigator's brain. You end up on ${PLANET_BY_ID[c.state.planets[wrong]!.id].name} instead of ${c.dest}.`,
      );
    },
  },
  {
    id: 'spacewhales',
    kind: 'bad',
    weight: 3,
    apply: (c) => {
      const drink = Math.min(c.co.ship.fuel, c.r.int(3, 8));
      c.co.ship.fuel -= drink;
      c.report(
        'bad',
        `A pod of Lippo Jungies latched onto the hull and drank ${drink} tons of Ionic Fuel as an aperitif.`,
      );
    },
  },

  /* ---------------- good ---------------- */
  {
    id: 'salvage',
    kind: 'good',
    weight: 8,
    apply: (c) => {
      const found = k(c.r.int(1, 6));
      c.co.cash += found;
      c.report(
        'good',
        `Your crew salvaged a drifting cargo pod and sold the scrap on ${c.dest} for ${fmt(found)} kubars.`,
      );
    },
  },
  {
    id: 'lottery',
    kind: 'good',
    weight: 5,
    apply: (c) => {
      const win = k(c.r.int(3, 15));
      c.co.cash += win;
      c.report('good', `Your Trader's Union lottery number came up! You win ${fmt(win)} kubars.`);
    },
  },
  {
    id: 'solarwind',
    kind: 'good',
    weight: 8,
    apply: (c) => {
      c.co.lastTravelTime *= 0.6;
      c.report(
        'good',
        `A favourable solar wind pushed the ship along. You reach ${c.dest} well ahead of the pack.`,
      );
    },
  },
  {
    id: 'hitchhiker',
    kind: 'good',
    weight: 7,
    apply: (c) => {
      const pay = k(c.r.int(3, 9));
      c.ask({
        id: 'hitchhiker',
        title: 'A stranded traveller',
        text: `You pick up a distress call. Snoz Lombardo, travelling salesman, offers ${fmt(pay)} kubars for a lift to ${c.dest}. Take him aboard?`,
        choices: [
          { id: 'yes', label: 'Give him a lift' },
          { id: 'no', label: 'Leave him' },
        ],
        portrait: 'snoz',
        mood: 'good',
        data: { pay },
      });
    },
  },
  {
    id: 'inheritance',
    kind: 'good',
    weight: 2,
    minWeek: 6,
    apply: (c) => {
      const amt = k(c.r.int(15, 40));
      c.co.cash += amt;
      c.report(
        'good',
        `A distant aunt on Zile left you ${fmt(amt)} kubars and a collection of ceramic frogs. You keep the kubars.`,
      );
    },
  },
  {
    id: 'warehouseoffer',
    kind: 'good',
    weight: 5,
    minWeek: 3,
    apply: (c) => {
      const pi = c.to;
      const tons = 50;
      const price = k(c.r.int(15, 40));
      c.ask({
        id: 'warehouseoffer',
        title: "Trader's Union warehouse lottery",
        text: `Your name came up in the Trader's Union warehouse lottery! You may buy ${tons} extra tons of warehouse space on ${c.dest} for ${fmt(price)} kubars (and your credit limit rises by 25,000).`,
        choices: [
          { id: 'yes', label: 'Buy the space' },
          { id: 'no', label: 'No thanks' },
        ],
        portrait: 'warehouse',
        mood: 'good',
        data: { pi, tons, price },
      });
    },
  },
  {
    id: 'shipoffer',
    kind: 'good',
    weight: 3,
    minWeek: 8,
    apply: (c) => {
      if (c.co.ship.klass > 1)
        return c.report(
          'good',
          'The ship dealer Q’zad-Tezslat hailed you to admire your upgraded ship. Nice.',
        );
      const price = k(c.r.int(40, 100));
      c.ask({
        id: 'shipoffer',
        title: 'A bigger ship',
        text: `Ship dealer Q’zad-Tezslat has a 600-ton class version of your ship on the lot: +50 % cargo, passengers and fuel, +50 % crew, higher running costs, +25,000 credit limit. One-time price: ${fmt(price)} kubars.`,
        choices: [
          { id: 'yes', label: 'Buy it' },
          { id: 'no', label: 'Not now' },
        ],
        portrait: 'dealer',
        mood: 'neutral',
        data: { price },
      });
    },
  },
  {
    id: 'crewforgive',
    kind: 'good',
    weight: 4,
    apply: (c) => {
      if (c.co.wagesOwed <= 0)
        return c.report('good', 'Your crew threw a party in the cargo bay. Morale is excellent.');
      const w = c.co.wagesOwed;
      c.co.wagesOwed = 0;
      c.co.onStrike = false;
      c.report(
        'good',
        `Touched by your leadership, the crew agreed to forget the ${fmt(w)} kubars in back wages. Don't push your luck.`,
      );
    },
  },
  {
    id: 'taxbreak',
    kind: 'good',
    weight: 4,
    apply: (c) => {
      const owed = c.co.taxOwedPassenger + c.co.taxOwedTariff;
      if (owed <= 0)
        return c.report(
          'good',
          'The Imperial Tax Office sent you a thank-you card for paying on time. Framed.',
        );
      c.co.taxOwedPassenger = 0;
      c.co.taxOwedTariff = 0;
      c.co.weeksTaxUnpaid = 0;
      c.report('good', `An Imperial amnesty wiped out your ${fmt(owed)} kubars in unpaid taxes.`);
    },
  },
  {
    id: 'freeengine',
    kind: 'good',
    weight: 2,
    minWeek: 5,
    apply: (c) => {
      c.co.ship.kuarps += 1;
      c.report(
        'good',
        `An L-Tech salesman from Pyke fitted a demo engine to your ship and forgot to take it back. Speed is now ${c.co.ship.kuarps} kuarps!`,
      );
    },
  },
  {
    id: 'insurancedown',
    kind: 'good',
    weight: 4,
    apply: (c) => {
      c.co.mods.insurance = Math.max(0.4, c.co.mods.insurance * 0.75);
      c.report(
        'good',
        "Voyager's Insurance found a clerical error in your file. Premiums drop by 25 %.",
      );
    },
  },
  {
    id: 'ratecut',
    kind: 'good',
    weight: 4,
    apply: (c) => {
      c.co.zinnRate = Math.max(0.01, c.co.zinnRate - 0.01);
      c.report(
        'good',
        `Mr. Zinn is in a generous mood: your interest with him drops to ${Math.round(c.co.zinnRate * 100)} % per week.`,
      );
    },
  },
  {
    id: 'creditraise',
    kind: 'good',
    weight: 4,
    apply: (c) => {
      c.co.unionLimit += 25000;
      c.report(
        'good',
        `The Trader's Union raised your credit limit to ${fmt(c.co.unionLimit)} kubars.`,
      );
    },
  },
  {
    id: 'scooterjay',
    kind: 'good',
    weight: 4,
    apply: (c) => {
      const lot = biggestLot(c.co);
      if (!lot)
        return c.report(
          'good',
          'Scooter Jay, a dealer of "slightly irregular" goods, hailed you — but your hold was empty. He shrugged and sped off.',
        );
      const offer = Math.round(lot[1].tons * lot[1].paid * 4);
      c.ask({
        id: 'scooterjay',
        title: 'Scooter Jay',
        text: `Scooter Jay, dealer in goods of uncertain provenance, offers ${fmt(offer)} kubars — four times what you paid — for your ${lot[1].tons} tons of ${COMMODITY_BY_ID[lot[0]].name}. No paperwork. The Galaxy Police frown on this kind of thing.`,
        choices: [
          { id: 'yes', label: 'Deal' },
          { id: 'no', label: 'No deal' },
        ],
        portrait: 'scooter',
        mood: 'neutral',
        data: { c: lot[0], offer },
      });
    },
  },
  {
    id: 'lord104',
    kind: 'good',
    weight: 3,
    apply: (c) => {
      const lot = biggestLot(c.co);
      if (!lot)
        return c.report(
          'good',
          'Lord 104 of Hork wished to buy your cargo, but you had none. He bought your pilot a drink instead.',
        );
      const pay = Math.round(lot[1].tons * lot[1].paid * 3);
      c.co.cash += pay;
      delete c.co.cargo[lot[0]];
      c.report(
        'good',
        `Lord 104 of Hork took a fancy to your ${COMMODITY_BY_ID[lot[0]].name} and bought all ${lot[1].tons} tons for ${fmt(pay)} kubars — three times what you paid.`,
      );
    },
  },
  {
    id: 'tatilus',
    kind: 'good',
    weight: 3,
    apply: (c) => {
      const empty = c.co.ship.seats - c.co.passengers;
      if (empty <= 0)
        return c.report(
          'good',
          'Tatilus the tour operator wanted to book your empty seats — but the ship was full. Good problem to have.',
        );
      const pay = empty * 5000;
      c.co.cash += pay;
      c.report(
        'good',
        `Tatilus the tour operator booked your ${empty} empty seats for a party of Veggie Piddles: ${fmt(pay)} kubars, tax free.`,
      );
    },
  },
  {
    id: 'nectum',
    kind: 'good',
    weight: 3,
    apply: (c) => {
      const room = c.co.ship.cargo - cargoTons(c.co);
      if (room < 5 || !c.state.commodities.includes('exotic'))
        return c.report(
          'good',
          'A trader named Nectum offered you cheap Exotic, but you had no room (or no market for it). He drifted off.',
        );
      const tons = Math.min(room, c.r.int(5, 20));
      const price = 100;
      const cost = tons * price;
      c.ask({
        id: 'nectum',
        title: 'Nectum',
        text: `Nectum, a trader with an improbable moustache, offers ${tons} tons of Exotic at ${price} kubars a ton (market range ${priceRange(COMMODITY_BY_ID.exotic).min}–${priceRange(COMMODITY_BY_ID.exotic).max}). Total ${fmt(cost)}.`,
        choices: [
          { id: 'yes', label: 'Buy' },
          { id: 'no', label: 'Pass' },
        ],
        portrait: 'nectum',
        mood: 'good',
        data: { tons, price },
      });
    },
  },
  {
    id: 'teeter',
    kind: 'good',
    weight: 3,
    apply: (c) => {
      const kind = c.r.int(1, 3);
      if (kind === 1) {
        c.co.ship.cargo += 10;
        c.report(
          'good',
          'Teeter the tinker welded an extra 10 tons of cargo space onto your ship for free. It only rattles a little.',
        );
      } else if (kind === 2) {
        c.co.ship.seats += 1;
        c.report(
          'good',
          'Teeter the tinker bolted an extra passenger seat into the galley. Free of charge.',
        );
      } else {
        c.co.ship.fuelCap += 5;
        c.report(
          'good',
          'Teeter the tinker fitted a spare 5-ton fuel tank he had lying around. Free.',
        );
      }
    },
  },
  {
    id: 'mulls',
    kind: 'good',
    weight: 4,
    apply: (c) => {
      const p = c.r.pick(c.state.planets.map((_, i) => i).filter((i) => i !== c.to));
      const cid = c.r.pick(c.state.commodities);
      const q = c.state.planets[p]!;
      const s = q.supply[cid] ?? 50;
      c.report(
        'good',
        `Mulls the wandering sage shares a tip: on ${PLANET_BY_ID[q.id].name}, ${COMMODITY_BY_ID[cid].name} is ${s < 30 ? 'scarce — prices are high' : s > 70 ? 'everywhere — prices are low' : 'unremarkable'} (supply ${Math.round(s)} %).`,
      );
    },
  },
  {
    id: 'yoyo',
    kind: 'good',
    weight: 3,
    apply: (c) => {
      const stake = Math.min(c.co.cash, k(c.r.int(2, 8)));
      if (stake <= 0)
        return c.report(
          'good',
          'Yoyo the gambler wanted to flip a coin for money. You had none. He flipped it anyway and won.',
        );
      c.ask({
        id: 'yoyo',
        title: 'Yoyo',
        text: `Yoyo the gambler docks alongside and proposes a coin flip for ${fmt(stake)} kubars. Heads you double it, tails you lose it. He supplies the coin.`,
        choices: [
          { id: 'yes', label: 'Flip!' },
          { id: 'no', label: 'No thanks' },
        ],
        portrait: 'yoyo',
        mood: 'neutral',
        data: { stake },
      });
    },
  },
  {
    id: 'meeg',
    kind: 'good',
    weight: 2,
    minWeek: 6,
    apply: (c) => {
      if (c.co.ship.crew <= 2)
        return c.report(
          'good',
          'Meeg the automation guru looked at your tiny crew and admitted there was nothing left to automate.',
        );
      c.co.ship.crew -= 1;
      c.report(
        'good',
        `Meeg the automation guru installed a robot that replaces one crew member. Crew is now ${c.co.ship.crew} — lower wages every week.`,
      );
    },
  },
  {
    id: 'brow',
    kind: 'good',
    weight: 3,
    minWeek: 6,
    apply: (c) => {
      const rivals = c.state.companies
        .map((x, i) => i)
        .filter((i) => i !== c.ci && !c.state.companies[i]!.bankrupt);
      if (rivals.length === 0) return;
      const target = c.r.pick(rivals);
      const fee = k(c.r.int(5, 12));
      c.ask({
        id: 'brow',
        title: 'Brow the saboteur',
        text: `A shady character called Brow offers to "arrange some engine trouble" for ${c.state.companies[target]!.name} — for ${fmt(fee)} kubars. If the Galaxy Police trace it back, the fine would be steep.`,
        choices: [
          { id: 'yes', label: 'Pay him' },
          { id: 'no', label: 'Certainly not' },
        ],
        portrait: 'sabotage',
        mood: 'neutral',
        data: { target, fee },
      });
    },
  },
  {
    id: 'gurttle',
    kind: 'good',
    weight: 3,
    apply: (c) => {
      const tons = Math.floor(c.co.ship.fuel / 2);
      if (tons < 2)
        return c.report(
          'good',
          'Gurttle the fuel trader wanted to buy half your fuel, but the tank was nearly dry anyway.',
        );
      const pay = tons * c.r.int(900, 1600);
      c.ask({
        id: 'gurttle',
        title: 'Gurttle',
        text: `Gurttle, stranded with an empty tank, offers ${fmt(pay)} kubars for ${tons} tons of your Ionic Fuel — well above market. You would arrive on fumes.`,
        choices: [
          { id: 'yes', label: 'Sell the fuel' },
          { id: 'no', label: 'Keep it' },
        ],
        portrait: 'gurttle',
        mood: 'neutral',
        data: { tons, pay },
      });
    },
  },
  {
    id: 'quaso',
    kind: 'neutral',
    weight: 3,
    apply: (c) => {
      const alt = c.r.pick(
        c.state.planets.map((_, i) => i).filter((i) => i !== c.from && i !== c.to),
      );
      c.ask({
        id: 'quaso',
        title: 'The Quaso Mutta',
        text: `A silent Quaso Mutta materialises on the bridge and vibrates a warning: continue to ${c.dest} and your luck will sour. It suggests ${PLANET_BY_ID[c.state.planets[alt]!.id].name} instead.`,
        choices: [
          { id: 'yes', label: `Divert to ${PLANET_BY_ID[c.state.planets[alt]!.id].name}` },
          { id: 'no', label: `Continue to ${c.dest}` },
        ],
        portrait: 'quaso',
        mood: 'neutral',
        data: { alt },
      });
    },
  },
];

/* ------------------------------------------------------------ resolution */

function makeCtx(
  state: GameState,
  co: CompanyState,
  ci: number,
  from: number,
  to: number,
  r: Rng,
): EventCtx {
  const report = (kind: LogEntry['kind'], text: string) => {
    const e: LogEntry = { week: state.week, company: ci, kind, text };
    state.log.push(e);
    state.arrivalReports.push(e);
  };
  return {
    state,
    co,
    ci,
    from,
    to,
    dest: PLANET_BY_ID[state.planets[to]!.id].name,
    r,
    report,
    loss: (amount, insurable = true) => {
      if (amount <= 0) return '';
      if (insurable && co.insured) return "Voyager's Insurance covered the loss.";
      co.cash -= amount;
      if (co.cash < 0) {
        co.unionLoan += -co.cash;
        co.cash = 0;
        return "You were not insured; the Trader's Union lent you the shortfall.";
      }
      return insurable ? 'You were not insured.' : '';
    },
    ask: (ev) => {
      state.pending = { ...ev, context: 'travel' };
      state.phase = 'event';
    },
  };
}

/** Roll the trip's events. May set state.phase='event' + state.pending for a choice. */
export function rollTravelEvents(
  state: GameState,
  co: CompanyState,
  ci: number,
  from: number,
  to: number,
  r: Rng,
): void {
  if (r.chance(0.5)) return; // half of all trips are uneventful
  const ctx = makeCtx(state, co, ci, from, to, r);
  const good = r.chance(co.luck);
  const pool = EVENTS.filter(
    (e) => (good ? e.kind !== 'bad' : e.kind === 'bad') && (e.minWeek ?? 0) <= state.week,
  );
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let x = r.float() * total;
  for (const e of pool) {
    x -= e.weight;
    if (x <= 0) {
      e.apply(ctx);
      break;
    }
  }
  // luck drifts back toward the middle
  co.luck = co.luck + (0.5 - co.luck) * 0.1;
}

/** Resolve a choice for the pending TRAVEL event `id`. */
export function resolveEventChoice(
  state: GameState,
  co: CompanyState,
  id: string,
  choice: string,
  data: Record<string, unknown>,
  r: Rng,
): void {
  const ci = state.companies.indexOf(co);
  const to = state.destination ?? co.planet;
  const c = makeCtx(state, co, ci, co.planet, to, r);
  const yes = choice === 'yes';
  switch (id) {
    case 'hitchhiker': {
      if (!yes) return;
      const pay = Number(data.pay);
      if (r.chance(0.8)) {
        co.cash += pay;
        c.report(
          'good',
          `Snoz Lombardo paid the promised ${fmt(pay)} kubars and thanked you profusely.`,
        );
      } else
        c.report('bad', 'Snoz Lombardo slipped away on arrival without paying a single kubar.');
      return;
    }
    case 'dreddonation': {
      const amt = Number(data.amt);
      if (yes) {
        c.report(
          'bad',
          `You donated ${fmt(amt)} kubars to the Emperor's statue fund. ${c.loss(amt, false)}`,
        );
      } else if (r.chance(0.5)) {
        const fee = Math.round(amt * 1.5);
        c.report(
          'bad',
          `You refused. Two days later a "special one-time landing fee" of ${fmt(fee)} kubars arrived, signed by the Emperor himself. ${c.loss(fee, false)}`,
        );
      } else c.report('good', 'You refused, and nothing happened. The Emperor has a short memory.');
      return;
    }
    case 'warehouseoffer': {
      if (!yes) return;
      const pi = Number(data.pi);
      const price = Number(data.price);
      const tons = Number(data.tons);
      if (co.cash < price)
        return c.report('bad', 'You could not afford the warehouse space after all.');
      co.cash -= price;
      co.warehouseCap[pi] = (co.warehouseCap[pi] ?? 0) + tons;
      co.unionLimit += 25000;
      c.report(
        'good',
        `You bought ${tons} tons of warehouse space on ${PLANET_BY_ID[state.planets[pi]!.id].name} for ${fmt(price)}. Credit limit now ${fmt(co.unionLimit)}.`,
      );
      return;
    }
    case 'shipoffer': {
      if (!yes) return;
      const price = Number(data.price);
      if (co.cash < price)
        return c.report(
          'bad',
          'Your cash did not cover the bigger ship. Q’zad-Tezslat was polite about it.',
        );
      co.cash -= price;
      upgradeShipClass(co);
      c.report(
        'good',
        `You bought the 600-ton class ship for ${fmt(price)} kubars! Cargo ${co.ship.cargo} t, ${co.ship.seats} seats, ${co.ship.fuelCap} t fuel, crew ${co.ship.crew}.`,
      );
      return;
    }
    case 'scooterjay': {
      if (!yes) return;
      const cid = data.c as CommodityId;
      const offer = Number(data.offer);
      const lot = co.cargo[cid];
      if (!lot) return;
      if (r.chance(0.2)) {
        const fine = Math.round(offer * 1.75);
        delete co.cargo[cid];
        c.report(
          'bad',
          `The Galaxy Police were watching Scooter Jay. Your ${COMMODITY_BY_ID[cid].name} was confiscated and you were fined ${fmt(fine)} kubars. ${c.loss(fine, false)}`,
        );
      } else {
        delete co.cargo[cid];
        co.cash += offer;
        c.report(
          'good',
          `Scooter Jay paid ${fmt(offer)} kubars in unmarked bills and vanished. Nobody saw anything.`,
        );
      }
      return;
    }
    case 'nectum': {
      if (!yes) return;
      const tons = Number(data.tons);
      const price = Number(data.price);
      if (co.cash < tons * price)
        return c.report('bad', 'You could not pay Nectum. He took it well.');
      co.cash -= tons * price;
      const lot = co.cargo.exotic;
      if (lot) {
        lot.paid = Math.round((lot.paid * lot.tons + price * tons) / (lot.tons + tons));
        lot.tons += tons;
      } else co.cargo.exotic = { tons, paid: price };
      c.report(
        'good',
        `You bought ${tons} tons of Exotic from Nectum for ${fmt(tons * price)} kubars.`,
      );
      return;
    }
    case 'yoyo': {
      if (!yes) return;
      const stake = Number(data.stake);
      if (r.chance(0.35)) {
        co.cash += stake;
        c.report('good', `Heads! Yoyo grumbled and paid you ${fmt(stake)} kubars.`);
      } else {
        co.cash -= stake;
        c.report(
          'bad',
          `Tails. Yoyo pocketed your ${fmt(stake)} kubars. That coin looked heavier on one side.`,
        );
      }
      return;
    }
    case 'brow': {
      if (!yes) return;
      const target = Number(data.target);
      const fee = Number(data.fee);
      if (co.cash < fee) return c.report('bad', 'You could not pay Brow. He left, muttering.');
      co.cash -= fee;
      const victim = state.companies[target]!;
      if (r.chance(0.25)) {
        const fine = fee * 4;
        c.report(
          'bad',
          `Brow was caught red-handed and named you. The Galaxy Police fined you ${fmt(fine)} kubars. ${c.loss(fine, false)}`,
        );
      } else {
        victim.ship.fuel = Math.floor(victim.ship.fuel / 3);
        victim.lastTravelTime *= 1.5;
        state.log.push({
          week: state.week,
          company: -1,
          kind: 'news',
          text: `${victim.name} reports mysterious engine trouble. Sabotage suspected.`,
        });
        c.report('good', `Brow did his work: ${victim.name} will be limping along for a while.`);
      }
      return;
    }
    case 'gurttle': {
      if (!yes) return;
      const tons = Number(data.tons);
      const pay = Number(data.pay);
      co.ship.fuel = Math.max(0, co.ship.fuel - tons);
      co.cash += pay;
      c.report('good', `You sold ${tons} tons of fuel to Gurttle for ${fmt(pay)} kubars.`);
      return;
    }
    case 'quaso': {
      if (yes) {
        state.destination = Number(data.alt);
        co.luck = Math.min(0.85, co.luck + 0.15);
        c.report(
          'good',
          `You followed the Quaso Mutta's advice and set course for ${PLANET_BY_ID[state.planets[state.destination]!.id].name}. Something feels lucky.`,
        );
      } else {
        co.luck = Math.max(0.15, co.luck - 0.25);
        c.report(
          'bad',
          'You ignored the Quaso Mutta. It vibrated sadly and vanished. Your luck feels… thinner.',
        );
      }
      return;
    }
    default:
      return;
  }
}

/** Upgrade to the 600-ton class: +50 % base capacities, crew +50 % (rounded up), +25k credit. */
export function upgradeShipClass(co: CompanyState): void {
  const f = 1.5 / co.ship.klass;
  co.ship.klass = 1.5;
  co.ship.cargo = Math.round(co.ship.cargo * f);
  co.ship.seats = Math.round(co.ship.seats * f);
  co.ship.fuelCap = Math.round(co.ship.fuelCap * f);
  co.ship.crew = Math.ceil(co.ship.crew * f);
  co.unionLimit += 25000;
}
