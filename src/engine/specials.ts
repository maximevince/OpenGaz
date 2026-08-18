/**
 * Planet specials — each planet's unique institution (Explore Planet → Special).
 * `startSpecial` posts a planet-context pending event; `resolveSpecialChoice` applies the answer.
 * One use per visit.
 */
import { COMMODITY_BY_ID, type CommodityId } from './data/commodities';
import { PLANET_BY_ID } from './data/planets';
import { cargoTons } from './economy';
import type { Rng } from './rng';
import {
  ActionError,
  type CompanyState,
  type GameState,
  type LogEntry,
  type PendingEvent,
} from './types';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

function say(
  state: GameState,
  ci: number,
  kind: LogEntry['kind'],
  text: string,
  title = 'Result',
  portrait?: string,
): void {
  state.log.push({ week: state.week, company: ci, kind, text });
  state.pending = {
    id: 'notice',
    title,
    text,
    choices: [],
    context: 'planet',
    portrait,
    mood: kind === 'bad' ? 'bad' : kind === 'good' ? 'good' : 'neutral',
  };
}

function ask(state: GameState, ev: Omit<PendingEvent, 'context'>): void {
  state.pending = { ...ev, context: 'planet' };
}

export function startSpecial(state: GameState, co: CompanyState, ci: number, r: Rng): void {
  const p = state.planets[co.planet]!;
  const def = PLANET_BY_ID[p.id];
  if (co.mods.specialWeek === state.week)
    throw new ActionError('You have already visited the planet special this week.');
  co.mods.specialWeek = state.week;

  switch (def.special) {
    case 'magistrate': {
      // Vexx: petition for lower taxes — rare success, can backfire
      const roll = r.int(1, 10);
      if (roll <= 2) {
        const which = r.pick(['importTariff', 'exportTariff', 'passengerTax'] as const);
        state.econ[which] = Math.max(
          0,
          Math.round((state.econ[which] - (which === 'passengerTax' ? 0.05 : 0.01)) * 100) / 100,
        );
        say(
          state,
          ci,
          'good',
          `The Imperial Magistrate was in a splendid mood and granted your petition: the ${which === 'importTariff' ? 'import tariff' : which === 'exportTariff' ? 'export tariff' : 'passenger tax'} is lowered for everyone.`,
          'Imperial Magistrate',
          'magistrate',
        );
      } else if (roll === 3) {
        const owed = co.taxOwedPassenger + co.taxOwedTariff;
        co.taxOwedPassenger = 0;
        co.taxOwedTariff = 0;
        say(
          state,
          ci,
          'good',
          owed > 0
            ? `The Magistrate, moved by your eloquence, struck your ${fmt(owed)} kubars of unpaid taxes from the record.`
            : 'The Magistrate found your tax record spotless and gave you a commemorative pen.',
          'Imperial Magistrate',
          'magistrate',
        );
      } else if (roll >= 9) {
        state.econ.importTariff = Math.round((state.econ.importTariff + 0.01) * 100) / 100;
        say(
          state,
          ci,
          'bad',
          'Your petition annoyed the Magistrate. To make a point, the import tariff was raised for everyone. The other companies are not pleased with you.',
          'Imperial Magistrate',
          'magistrate',
        );
      } else {
        say(
          state,
          ci,
          'info',
          'The Magistrate listened politely to your petition, nodded, and changed nothing. Bureaucracy in action.',
          'Imperial Magistrate',
          'magistrate',
        );
      }
      return;
    }
    case 'zinn': {
      // Zile: ask Mr. Zinn a favour
      const roll = r.int(1, 10);
      if (co.zinnLoan <= 0)
        return say(
          state,
          ci,
          'good',
          'Mr. Zinn received you warmly. Since you owe him nothing, he simply admired your business acumen and served tea.',
          'Mr. Zinn',
          'zinn',
        );
      if (roll <= 2) {
        co.zinnRate = Math.max(0.01, co.zinnRate - 0.01);
        say(
          state,
          ci,
          'good',
          `Mr. Zinn, feeling generous, lowered your interest to ${Math.round(co.zinnRate * 100)} % per week.`,
          'Mr. Zinn',
          'zinn',
        );
      } else if (roll <= 4) {
        co.zinnLimit += 50000;
        say(
          state,
          ci,
          'good',
          `Mr. Zinn raised your credit limit with him to ${fmt(co.zinnLimit)} kubars.`,
          'Mr. Zinn',
          'zinn',
        );
      } else if (roll === 5) {
        const f = Math.round(co.zinnLoan / 4);
        co.zinnLoan -= f;
        say(
          state,
          ci,
          'good',
          `In a fit of sentimentality Mr. Zinn forgave a quarter of your debt: ${fmt(f)} kubars gone!`,
          'Mr. Zinn',
          'zinn',
        );
      } else if (roll <= 7) {
        const extra = 40000;
        co.zinnLoan += extra;
        co.cash += extra;
        say(
          state,
          ci,
          'good',
          `Mr. Zinn extended you an additional ${fmt(extra)} kubars, added to your loan at the usual rate.`,
          'Mr. Zinn',
          'zinn',
        );
      } else if (roll <= 9) {
        say(
          state,
          ci,
          'info',
          'Mr. Zinn listened, stroked his chin, and refused. "Come back when you are richer," he said.',
          'Mr. Zinn',
          'zinn',
        );
      } else {
        const due = Math.min(co.cash, Math.round(co.zinnLoan * 0.2));
        co.cash -= due;
        co.zinnLoan -= due;
        say(
          state,
          ci,
          'bad',
          `Your visit reminded Mr. Zinn of your debt. He demanded ${fmt(due)} kubars on the spot — and got it.`,
          'Mr. Zinn',
          'zinn',
        );
      }
      return;
    }
    case 'union': {
      // Stye: lobby the Trader's Union
      const roll = r.int(1, 10);
      if (roll <= 2) {
        co.unionRate = Math.max(0.02, co.unionRate - 0.01);
        say(
          state,
          ci,
          'good',
          `The Union lowered your loan rate to ${Math.round(co.unionRate * 100)} % per week.`,
          "Trader's Union",
          'union',
        );
      } else if (roll <= 4) {
        co.bankRate = Math.min(0.02, co.bankRate + 0.005);
        say(
          state,
          ci,
          'good',
          `The Union bank raised your savings rate to ${(co.bankRate * 100).toFixed(1)} % per week.`,
          "Trader's Union",
          'union',
        );
      } else if (roll <= 6) {
        co.unionLimit += 50000;
        say(
          state,
          ci,
          'good',
          `The Union raised your credit limit to ${fmt(co.unionLimit)} kubars.`,
          "Trader's Union",
          'union',
        );
      } else if (roll === 7 && co.unionLoan > 0) {
        const f = Math.round(co.unionLoan / 3);
        co.unionLoan -= f;
        say(
          state,
          ci,
          'good',
          `The Union forgave a third of your loan: ${fmt(f)} kubars!`,
          "Trader's Union",
          'union',
        );
      } else if (roll >= 9) {
        co.unionRate = Math.min(0.1, co.unionRate + 0.01);
        say(
          state,
          ci,
          'bad',
          `Your lobbying backfired. The Union raised your loan rate to ${Math.round(co.unionRate * 100)} %.`,
          "Trader's Union",
          'union',
        );
      } else {
        say(
          state,
          ci,
          'info',
          'The Union officials heard you out and promised to "form a committee". Nothing changed.',
          "Trader's Union",
          'union',
        );
      }
      return;
    }
    case 'insurance': {
      // Frac: premium review
      const roll = r.int(1, 10);
      if (roll <= 4) {
        co.mods.insurance = Math.max(0.4, co.mods.insurance * (1 - r.int(5, 40) / 100));
        say(
          state,
          ci,
          'good',
          'The insurance review went your way: your premiums are lowered.',
          "Voyager's Insurance",
          'insurance',
        );
      } else if (roll <= 6) {
        const refund = r.int(1, 5) * 1000;
        co.cash += refund;
        say(
          state,
          ci,
          'good',
          `An overpayment was found in your file. Voyager's Insurance refunded you ${fmt(refund)} kubars.`,
          "Voyager's Insurance",
          'insurance',
        );
      } else if (roll >= 9) {
        co.mods.insurance = Math.min(3, co.mods.insurance * (1 + r.int(5, 40) / 100));
        say(
          state,
          ci,
          'bad',
          'The review turned up a few "risk factors". Your premiums go up.',
          "Voyager's Insurance",
          'insurance',
        );
      } else {
        say(
          state,
          ci,
          'info',
          'The insurance clerk reviewed your policy, stamped it, and sent you on your way. No change.',
          "Voyager's Insurance",
          'insurance',
        );
      }
      return;
    }
    case 'broker': {
      // Bass: broker tips on all exchanges
      const lines = state.planets.map((q) => {
        const t = q.exchange.trend;
        const mood =
          q.exchange.closedFor > 0
            ? 'closed after a crash'
            : t > 0.62
              ? 'a strong bull run'
              : t > 0.52
                ? 'mildly bullish'
                : t < 0.38
                  ? 'a bear market — sell'
                  : t < 0.48
                    ? 'slightly bearish'
                    : 'flat';
        return `${PLANET_BY_ID[q.id].exchange}: ${mood} (${fmt(q.exchange.price)})`;
      });
      say(
        state,
        ci,
        'info',
        `The broker leans back and gives you the word on the street: ${lines.join(' · ')}.`,
        'Stock Broker',
        'broker',
      );
      return;
    }
    case 'media': {
      // Hork: publicity stunt
      const roll = r.int(1, 10);
      if (roll <= 3) {
        const cash = r.int(20, 50) * 1000;
        co.cash += cash;
        say(
          state,
          ci,
          'good',
          `Your publicity stunt on Hork went viral across the colonies! Sponsors paid ${fmt(cash)} kubars.`,
          'Hork Media',
          'news',
        );
      } else if (roll >= 9) {
        const cost = Math.min(co.cash, r.int(5, 15) * 1000);
        co.cash -= cost;
        say(
          state,
          ci,
          'bad',
          `Your publicity stunt flopped and the cleanup cost ${fmt(cost)} kubars. Kuku News had a field day.`,
          'Hork Media',
          'news',
        );
      } else {
        co.paxAdBonus += r.int(2, 6);
        say(
          state,
          ci,
          'good',
          'Your company was featured on Channel 7. A few extra passengers show up at your ticket counter.',
          'Hork Media',
          'news',
        );
      }
      return;
    }
    case 'mechanic': {
      // Xeen: buy a permanent upgrade
      const kind = r.pick(['cargo', 'seat', 'fuel', 'turbo'] as const);
      const price = r.int(4, 12) * 500 * (kind === 'turbo' ? 4 : 1);
      const label = {
        cargo: 'expand your cargo bay by 10 tons',
        seat: 'add a passenger seat',
        fuel: 'add 5 tons to your fuel tank',
        turbo: 'turbocharge your engine (+1 kuarp)',
      }[kind];
      ask(state, {
        id: 'mechanic',
        title: 'Your Mechanic on Xeen',
        text: `The mechanic wipes her hands and makes an offer: ${label} for ${fmt(price)} kubars. Permanent, and it only sounds dangerous.`,
        choices: [
          { id: 'yes', label: 'Do it' },
          { id: 'no', label: 'No thanks' },
        ],
        portrait: 'mechanic',
        mood: 'neutral',
        data: { kind, price },
      });
      return;
    }
    case 'engines': {
      // Pyke: buy an engine
      if (r.chance(0.25))
        return say(
          state,
          ci,
          'info',
          'The L-Tech showroom is empty this week — a big order cleaned them out. Come back later.',
          'L-Tech Engines',
          'ltech',
        );
      const price = r.int(5, 30) * 1000;
      ask(state, {
        id: 'engine',
        title: 'L-Tech Engines, Pyke',
        text: `The L-Tech salesman shows you a gleaming ${co.ship.kuarps + 1}-kuarp engine — one more kuarp than yours. Fitted and guaranteed for ${fmt(price)} kubars.`,
        choices: [
          { id: 'yes', label: 'Buy the engine' },
          { id: 'no', label: 'Just browsing' },
        ],
        portrait: 'ltech',
        mood: 'neutral',
        data: { price },
      });
      return;
    }
    case 'fuel': {
      // Nosh: wholesale fuel discount
      const disc = 10 + Math.floor(r.int(1, 30) / 2);
      co.mods.fuelDiscount = disc / 100;
      say(
        state,
        ci,
        'good',
        `Zobrok the fuel wholesaler likes your face: ${disc} % off Ionic Fuel on your next fill-up here on Nosh.`,
        'Zobrok',
        'zobrok',
      );
      return;
    }
    case 'shoreleave': {
      // Loro: crew shore leave
      const roll = r.int(1, 10);
      if (roll <= 4 && co.wagesOwed > 0) {
        const w = co.wagesOwed;
        co.wagesOwed = 0;
        co.onStrike = false;
        say(
          state,
          ci,
          'good',
          `After a week on Loro's beaches, the crew forgave the ${fmt(w)} kubars in back wages. Best holiday ever.`,
          'Peelia Veelia',
          'peelia',
        );
      } else if (roll <= 7) {
        co.crewSalary = Math.max(500, co.crewSalary - 100);
        say(
          state,
          ci,
          'good',
          `Sunburnt and happy, the crew agreed to a salary cut: ${fmt(co.crewSalary)} per person per week from now on.`,
          'Peelia Veelia',
          'peelia',
        );
      } else if (roll >= 10) {
        const bail = Math.min(co.cash, r.int(2, 8) * 1000);
        co.cash -= bail;
        say(
          state,
          ci,
          'bad',
          `The crew got a little too enthusiastic in the casinos. Bail came to ${fmt(bail)} kubars.`,
          'Peelia Veelia',
          'peelia',
        );
      } else {
        say(
          state,
          ci,
          'info',
          'The crew had a lovely time. Several of them got tattoos of your ship.',
          'Peelia Veelia',
          'peelia',
        );
      }
      return;
    }
    case 'blessing': {
      // Mira: blessing raises luck; already blessed → risk of curse
      if (co.mods.blessedWeeks > 0) {
        if (r.chance(0.5)) {
          co.luck = 0.15;
          co.mods.blessedWeeks = 0;
          say(
            state,
            ci,
            'bad',
            'The Grand Sages frowned: one does not ask twice. Your blessing is revoked and a curse takes its place. Expect trouble.',
            'Grand Sages of Mira',
            'sooth',
          );
        } else
          say(
            state,
            ci,
            'info',
            'The Grand Sages reminded you that you are already blessed, and sent you away with a cup of tea.',
            'Grand Sages of Mira',
            'sooth',
          );
      } else {
        co.luck = 0.6 + r.int(0, 25) / 100;
        co.mods.blessedWeeks = 8;
        say(
          state,
          ci,
          'good',
          'The Grand Sages of Mira blessed your voyage. For the coming weeks, fortune smiles on your ship.',
          'Grand Sages of Mira',
          'sooth',
        );
      }
      return;
    }
    case 'fortune': {
      // Ooom: pay to learn your luck
      const price = 2500 + co.mods.upgrades * 1000;
      ask(state, {
        id: 'fortune',
        title: 'Soothsayer of Ooom',
        text: `A soothsayer offers to read your aura for ${fmt(price)} kubars and tell you how lucky your ship is right now.`,
        choices: [
          { id: 'yes', label: 'Pay' },
          { id: 'no', label: 'No thanks' },
        ],
        portrait: 'sooth',
        mood: 'neutral',
        data: { price },
      });
      return;
    }
    case 'casino': {
      // Tilo: all-or-nothing wager of ≤5 % cash
      const stake = Math.max(0, Math.floor(co.cash * 0.05));
      if (stake < 100)
        return say(
          state,
          ci,
          'info',
          'The casino doorman looked at your wallet and politely suggested the free buffet.',
          'Tilo Casino',
          'casino',
        );
      ask(state, {
        id: 'casino',
        title: 'Casino of Tilo',
        text: `The croupier offers a straight 50/50 wager of ${fmt(stake)} kubars (5 % of your cash). Win and it doubles.`,
        choices: [
          { id: 'yes', label: 'Place the bet' },
          { id: 'no', label: 'Walk away' },
        ],
        portrait: 'casino',
        mood: 'neutral',
        data: { stake },
      });
      return;
    }
    case 'smuggler': {
      // Queg: Lady Cornucopia offers one commodity at ≤ market price
      const cid = r.pick(state.commodities);
      const room = co.ship.cargo - cargoTons(co);
      const tons = Math.min(room, r.int(10, 40));
      if (tons <= 0)
        return say(
          state,
          ci,
          'info',
          'Lady Cornucopia had a fine offer, but your cargo bay is full. She waved you off with a smile.',
          'Lady Cornucopia',
          'cornucopia',
        );
      const price = Math.round((p.price[cid] ?? 100) * (r.int(60, 100) / 100));
      ask(state, {
        id: 'smuggler',
        title: 'Lady Cornucopia',
        text: `Lady Cornucopia offers ${tons} tons of ${COMMODITY_BY_ID[cid].name} at ${fmt(price)} a ton (market: ${fmt(p.price[cid] ?? 0)}). No questions asked. Total ${fmt(tons * price)}.`,
        choices: [
          { id: 'yes', label: 'Buy' },
          { id: 'no', label: 'Decline' },
        ],
        portrait: 'cornucopia',
        mood: 'neutral',
        data: { cid, tons, price },
      });
      return;
    }
  }
}

export function resolveSpecialChoice(
  state: GameState,
  co: CompanyState,
  ci: number,
  id: string,
  choice: string,
  data: Record<string, unknown>,
  r: Rng,
): void {
  const yes = choice === 'yes';
  switch (id) {
    case 'notice':
      return;
    case 'mechanic': {
      if (!yes) return;
      const price = Number(data.price);
      if (co.cash < price)
        return say(
          state,
          ci,
          'bad',
          'You could not afford the upgrade. The mechanic shrugged.',
          'Your Mechanic',
          'mechanic',
        );
      co.cash -= price;
      co.mods.upgrades++;
      const kind = String(data.kind);
      if (kind === 'cargo') co.ship.cargo += 10;
      else if (kind === 'seat') co.ship.seats += 1;
      else if (kind === 'fuel') co.ship.fuelCap += 5;
      else co.ship.kuarps += 1;
      say(
        state,
        ci,
        'good',
        `Done! Your ship now has ${co.ship.cargo} t cargo, ${co.ship.seats} seats, ${co.ship.fuelCap} t fuel and ${co.ship.kuarps} kuarps.`,
        'Your Mechanic',
        'mechanic',
      );
      return;
    }
    case 'engine': {
      if (!yes) return;
      const price = Number(data.price);
      if (co.cash < price)
        return say(
          state,
          ci,
          'bad',
          'Your cash did not cover the engine. The salesman offered you a brochure.',
          'L-Tech Engines',
          'ltech',
        );
      co.cash -= price;
      co.ship.kuarps += 1;
      co.mods.upgrades++;
      say(
        state,
        ci,
        'good',
        `New engine fitted! Your ship now flies at ${co.ship.kuarps} kuarps.`,
        'L-Tech Engines',
        'ltech',
      );
      return;
    }
    case 'fortune': {
      if (!yes) return;
      const price = Number(data.price);
      if (co.cash < price)
        return say(
          state,
          ci,
          'bad',
          'You could not pay the soothsayer. She predicted you would be back.',
          'Soothsayer',
          'sooth',
        );
      co.cash -= price;
      const l = co.luck;
      const word =
        l >= 0.7
          ? 'radiant — fortune favours you'
          : l >= 0.55
            ? 'bright'
            : l >= 0.45
              ? 'balanced'
              : l >= 0.3
                ? 'clouded'
                : 'dark — beware the void';
      if (r.chance(0.08)) {
        const gift = r.int(10, 30) * 1000;
        co.cash += gift;
        return say(
          state,
          ci,
          'good',
          `The soothsayer gasped: your aura is ${word}. Then she pressed ${fmt(gift)} kubars into your hand "for the prophecy" and refused to explain.`,
          'Soothsayer',
          'sooth',
        );
      }
      say(
        state,
        ci,
        'info',
        `The soothsayer peers into the mist. "Your aura is ${word}." (Luck ${Math.round(l * 100)} %.)`,
        'Soothsayer',
        'sooth',
      );
      return;
    }
    case 'casino': {
      if (!yes) return;
      const stake = Number(data.stake);
      if (r.chance(0.5)) {
        co.cash += stake;
        ask(state, {
          id: 'casino2',
          title: 'Casino of Tilo',
          text: `You won ${fmt(stake)} kubars! The croupier smiles: double or nothing on the whole ${fmt(stake * 2)}?`,
          choices: [
            { id: 'yes', label: 'Double or nothing' },
            { id: 'no', label: 'Take the money' },
          ],
          portrait: 'casino',
          mood: 'good',
          data: { stake: stake * 2 },
        });
      } else {
        co.cash -= stake;
        say(
          state,
          ci,
          'bad',
          `The wheel spun… and you lost ${fmt(stake)} kubars. The house always wins.`,
          'Casino of Tilo',
          'casino',
        );
      }
      return;
    }
    case 'casino2': {
      if (!yes) return;
      const stake = Number(data.stake);
      if (r.chance(0.5)) {
        co.cash += stake;
        say(
          state,
          ci,
          'good',
          `Unbelievable! You doubled again and walk out with ${fmt(stake)} kubars more than you came in with.`,
          'Casino of Tilo',
          'casino',
        );
      } else {
        co.cash -= stake;
        say(
          state,
          ci,
          'bad',
          `Greed! You lost the ${fmt(stake)} kubars — all of it. The croupier looks genuinely sorry.`,
          'Casino of Tilo',
          'casino',
        );
      }
      return;
    }
    case 'smuggler': {
      if (!yes) return;
      const cid = data.cid as CommodityId;
      const tons = Number(data.tons);
      const price = Number(data.price);
      if (co.cash < tons * price)
        return say(
          state,
          ci,
          'bad',
          'You could not pay Lady Cornucopia. She was gracious about it.',
          'Lady Cornucopia',
          'cornucopia',
        );
      co.cash -= tons * price;
      const lot = co.cargo[cid];
      if (lot) {
        lot.paid = Math.round((lot.paid * lot.tons + price * tons) / (lot.tons + tons));
        lot.tons += tons;
      } else co.cargo[cid] = { tons, paid: price };
      say(
        state,
        ci,
        'good',
        `${tons} tons of ${COMMODITY_BY_ID[cid].name} were quietly loaded aboard for ${fmt(tons * price)} kubars.`,
        'Lady Cornucopia',
        'cornucopia',
      );
      return;
    }
    default:
      return;
  }
}
