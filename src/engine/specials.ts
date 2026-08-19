/**
 * Planet specials — each planet's unique institution (Explore Planet → Special).
 * One use per visit (`specialUsed`, reset at departure); a few outcomes don't consume the visit.
 * Deterministic inputs: the player's per-departure roll `random` (1..100), the weekly seed
 * `newsData` (1..100) and the week number.
 */
import { COMMODITIES } from './data/commodities';
import { LEVEL_BY_ID } from './data/levels';
import { PLANET_BY_ID } from './data/planets';
import { cargoTons, fmt, subtractCash } from './economy';
import type { Rng } from './rng';
import {
  ActionError,
  type CompanyState,
  type GameState,
  type LogEntry,
  type PendingEvent,
} from './types';

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

const yn = (yes = 'Yes', no = 'No') => [
  { id: 'yes', label: yes },
  { id: 'no', label: no },
];

/** subtract_cash + suffix */
function pay(co: CompanyState, amount: number): string {
  const short = amount - co.cash - co.bank;
  subtractCash(co, amount);
  return short > 0 ? ` The Trader's Union lent you the ${fmt(short)} kubars you were short.` : '';
}

/** eventGood "blessing floor": raise to v, or +5 capped at 85 if already there */
function blessTo(co: CompanyState, v: number): void {
  co.eventGood = co.eventGood < v ? v : Math.min(85, co.eventGood + 5);
  co.eventLastGood = true;
}

export function startSpecial(state: GameState, co: CompanyState, ci: number, r: Rng): void {
  const p = state.planets[co.planet]!;
  const def = PLANET_BY_ID[p.id];
  if (co.specialUsed) throw new ActionError('You have already paid your visit this stop.');
  co.specialUsed = true;
  const nd = state.newsData;
  const rand = co.random;
  const T = co.ship.tons;

  switch (def.special) {
    /* ---- Vexx: Imperial Magistrate — global tax/tariff petitions ---- */
    case 'magistrate': {
      const roll = r.fint(1, 30);
      const e = state.econ;
      if (roll === 7 || roll === 22) {
        if (e.passTax >= 2) {
          e.passTax -= 1;
          say(
            state,
            ci,
            'good',
            `Your petition succeeds! The Magistrate lowers the passenger tax to ${e.passTax}% — for everyone.`,
            'The Imperial Magistrate',
            'magistrate',
          );
        } else {
          e.passTax += 1;
          say(
            state,
            ci,
            'bad',
            `The Magistrate finds your petition impertinent and raises the passenger tax to ${e.passTax}%.`,
            'The Imperial Magistrate',
            'magistrate',
          );
        }
      } else if (roll === 8 || roll === 23) {
        if (e.importTariff >= 2) {
          e.importTariff -= 1;
          say(
            state,
            ci,
            'good',
            `The import tariff is lowered to ${e.importTariff}% across Kukubia. The merchants cheer your name.`,
            'The Imperial Magistrate',
            'magistrate',
          );
        } else {
          e.importTariff += 1;
          say(
            state,
            ci,
            'bad',
            `The Magistrate, annoyed, raises the import tariff to ${e.importTariff}%.`,
            'The Imperial Magistrate',
            'magistrate',
          );
        }
      } else if (roll === 9 || roll === 24) {
        if (e.exportTariff >= 2) {
          e.exportTariff -= 1;
          say(
            state,
            ci,
            'good',
            `The export tariff is lowered to ${e.exportTariff}% across Kukubia.`,
            'The Imperial Magistrate',
            'magistrate',
          );
        } else {
          e.exportTariff += 1;
          say(
            state,
            ci,
            'bad',
            `The Magistrate raises the export tariff to ${e.exportTariff}%. Perhaps a smaller gift next time.`,
            'The Imperial Magistrate',
            'magistrate',
          );
        }
      } else if (roll === 10 || roll === 25) {
        if (co.taxOwedPassenger + co.taxOwedTariff >= 2) {
          const owed = co.taxOwedPassenger + co.taxOwedTariff;
          co.taxOwedPassenger = 0;
          co.taxOwedTariff = 0;
          say(
            state,
            ci,
            'good',
            `A clerical miracle: the Magistrate wipes your ${fmt(owed)} kubars of owed taxes from the ledgers.`,
            'The Imperial Magistrate',
            'magistrate',
          );
        } else {
          say(
            state,
            ci,
            'info',
            'The Magistrate peers at your spotless tax record and waves you away, vaguely disappointed.',
            'The Imperial Magistrate',
            'magistrate',
          );
        }
      } else if (roll >= 11 && roll <= 15) {
        say(
          state,
          ci,
          'info',
          "The Magistrate's secretary takes your petition, stamps it twice, and files it somewhere final.",
          'The Imperial Magistrate',
          'magistrate',
        );
      } else if (roll >= 26) {
        say(
          state,
          ci,
          'info',
          'The Magistrate is away — hearing petitions, the sign says, on an entirely different planet.',
          'The Imperial Magistrate',
          'magistrate',
        );
      } else {
        say(
          state,
          ci,
          'info',
          'The Magistrate listens to your petition with magnificent patience and promises nothing whatsoever.',
          'The Imperial Magistrate',
          'magistrate',
        );
      }
      return;
    }

    /* ---- Pyke: L-Tech engines — price = random*newsData*6 ---- */
    case 'engines': {
      if (nd % 4 === 0) {
        say(
          state,
          ci,
          'info',
          'The L-Tech showroom is closed — the sales rep is at a foundry inauguration, the note says. Try again another week.',
          'L-Tech Engine Works',
          'ltech',
        );
        return;
      }
      const price = rand * nd * 6;
      ask(state, {
        id: 'special:engine',
        title: 'L-Tech Engine Works',
        text: `The L-Tech rep pats a gleaming drive unit: +1 kuarp of speed, installed while you wait, for ${fmt(price)} kubars. Buy it?`,
        choices: yn('Buy', 'Not today'),
        portrait: 'ltech',
        mood: 'neutral',
        data: { price },
      });
      return;
    }

    /* ---- Mira: Grand Sages ---- */
    case 'blessing': {
      const roll = r.fint(1, 30);
      if (roll === 6 || roll === 21) {
        co.eventGood = 15;
        co.eventLastGood = false;
        say(
          state,
          ci,
          'bad',
          'The Grand Sage studies you for a long moment, frowns, and pronounces a curse on the greedy. You feel distinctly unlucky.',
          'The Grand Sages',
          'quaso',
        );
      } else if (roll === 7 || roll === 22) {
        blessTo(co, 70);
        say(
          state,
          ci,
          'good',
          'The Grand Sage touches your forehead. Fortune, he murmurs, will walk beside you.',
          'The Grand Sages',
          'quaso',
        );
      } else if (roll === 8 || roll === 23) {
        blessTo(co, 80);
        say(
          state,
          ci,
          'good',
          'The Grand Sage smiles — a rare event, the acolytes whisper — and blesses your voyages richly.',
          'The Grand Sages',
          'quaso',
        );
      } else if (roll === 9 || roll === 10 || roll === 24 || roll === 25) {
        blessTo(co, 60);
        say(
          state,
          ci,
          'good',
          'The Grand Sage sprinkles sand over your boots and wishes you moderately well.',
          'The Grand Sages',
          'quaso',
        );
      } else if (roll === 11 || roll === 26) {
        co.eventGood = 85;
        co.eventLastGood = true;
        say(
          state,
          ci,
          'good',
          'The Grand Sage declares you a favourite of the vibrations. The Quaso Mutta themselves seem to hum approvingly.',
          'The Grand Sages',
          'quaso',
        );
      } else if (roll === 12 || roll === 27) {
        blessTo(co, 75);
        say(
          state,
          ci,
          'good',
          'The Grand Sage blesses your ship, your crew, and — after a pause — your bookkeeping.',
          'The Grand Sages',
          'quaso',
        );
      } else if (roll >= 13 && roll <= 15) {
        say(
          state,
          ci,
          'info',
          'The Grand Sages are deep in meditation. A novice suggests, very quietly, that you come back later.',
          'The Grand Sages',
          'quaso',
        );
      } else if (roll >= 28) {
        say(
          state,
          ci,
          'info',
          'The monastery is empty; the Sages are on pilgrimage among the dunes.',
          'The Grand Sages',
          'quaso',
        );
      } else {
        say(
          state,
          ci,
          'info',
          'A Grand Sage tells you a long parable about a merchant and a sandstorm. You are fairly sure it was wisdom.',
          'The Grand Sages',
          'quaso',
        );
      }
      return;
    }

    /* ---- Stye: Trader's Union HQ ---- */
    case 'union': {
      const roll = r.fint(1, 31);
      const liquid = co.cash + co.bank - co.unionLoan - co.zinnLoan;
      if (roll === 7) {
        co.unionLimit += 50000;
        say(
          state,
          ci,
          'good',
          `The Union board, in an expansive mood, raises your credit limit to ${fmt(co.unionLimit)} kubars.`,
          "The Trader's Union",
          'union',
        );
      } else if (roll === 22) {
        co.unionLimit += 75000;
        say(
          state,
          ci,
          'good',
          `The Union board raises your credit limit to ${fmt(co.unionLimit)} kubars. Somebody important must like you.`,
          "The Trader's Union",
          'union',
        );
      } else if (roll === 8 || roll === 23 || roll === 24) {
        if (co.loanRate >= 4 || (co.loanRate >= 2 && liquid > 5_000_000)) {
          co.loanRate -= 1;
          say(
            state,
            ci,
            'good',
            `Your lobbying works: the Union lowers your loan rate to ${co.loanRate}% per week.`,
            "The Trader's Union",
            'union',
          );
        } else {
          co.loanRate += 1;
          say(
            state,
            ci,
            'bad',
            `The Union takes a dim view of your lobbying and raises your loan rate to ${co.loanRate}% per week.`,
            "The Trader's Union",
            'union',
          );
        }
      } else if (roll === 9 || roll === 25) {
        if (co.savingsRate <= 2) {
          co.savingsRate += 1;
          say(
            state,
            ci,
            'good',
            `A word in the right ear: the bank now pays you ${co.savingsRate}% per week on savings.`,
            "The Trader's Union",
            'union',
          );
        } else {
          co.savingsRate -= 1;
          say(
            state,
            ci,
            'bad',
            `The bank reviews your account and trims your savings rate to ${co.savingsRate}% per week.`,
            "The Trader's Union",
            'union',
          );
        }
      } else if (roll === 10 || roll === 26) {
        if (co.unionLoan > 20) {
          const cut = Math.floor(co.unionLoan / (roll === 10 ? 3 : 4));
          co.unionLoan -= cut;
          say(
            state,
            ci,
            'good',
            `An accounting review finds in your favour: ${fmt(cut)} kubars of your Union loan is forgiven.`,
            "The Trader's Union",
            'union',
          );
        } else if (co.savingsRate <= 2) {
          co.savingsRate += 1;
          say(
            state,
            ci,
            'good',
            `Nothing to forgive — instead the bank raises your savings rate to ${co.savingsRate}% per week.`,
            "The Trader's Union",
            'union',
          );
        } else {
          co.savingsRate -= 1;
          say(
            state,
            ci,
            'bad',
            `The bank trims your savings rate to ${co.savingsRate}% per week. The Union sends its regards.`,
            "The Trader's Union",
            'union',
          );
        }
      } else if (roll === 11 || roll === 27) {
        if (co.savingsRate > 1) {
          co.savingsRate -= 1;
          say(
            state,
            ci,
            'bad',
            `A clerk finds an irregularity in your file. Savings rate down to ${co.savingsRate}% per week.`,
            "The Trader's Union",
            'union',
          );
        } else {
          co.loanRate += 1;
          say(
            state,
            ci,
            'bad',
            `A clerk finds an irregularity in your file. Loan rate up to ${co.loanRate}% per week.`,
            "The Trader's Union",
            'union',
          );
        }
      } else if ((roll >= 12 && roll <= 15) || roll >= 28) {
        say(
          state,
          ci,
          'info',
          'The Union officials are all in committee. The receptionist offers you a pamphlet on responsible borrowing.',
          "The Trader's Union",
          'union',
        );
      } else {
        say(
          state,
          ci,
          'info',
          co.unionLoan > 0
            ? `A Union official reviews your ${fmt(co.unionLoan)}-kubar loan, nods slowly, and wishes you a profitable week.`
            : 'A Union official shakes your hand, admires your debt-free ledger, and wishes you a profitable week.',
          "The Trader's Union",
          'union',
        );
      }
      return;
    }

    /* ---- Loro: Peelia Veelia ---- */
    case 'shoreleave': {
      const roll = r.fint(1, 30);
      if (roll === 5 || roll === 20) {
        const bill = r.fint(500, 2000) * co.ship.crew;
        const suffix = pay(co, bill);
        say(
          state,
          ci,
          'bad',
          `Shore leave got… festive. The damages come to ${fmt(bill)} kubars, payable before departure.${suffix}`,
          'Peelia Veelia',
          'peelia',
        );
      } else if (roll === 6 || roll === 7 || roll === 21 || roll === 22) {
        if (co.crewSalary > 1000) {
          co.crewSalary -= 100;
          say(
            state,
            ci,
            'good',
            `Peelia Veelia charms your crew into loving their jobs again. Salaries drop to ${fmt(co.crewSalary)} per person.`,
            'Peelia Veelia',
            'peelia',
          );
        } else if (roll === 21 || roll === 22) {
          co.ship.fuel = co.ship.fuelCap;
          say(
            state,
            ci,
            'good',
            'Peelia Veelia knows a fuel man who owes her a favour. Your tank is filled — on the house.',
            'Peelia Veelia',
            'peelia',
          );
        } else {
          say(
            state,
            ci,
            'info',
            'Peelia Veelia pours you something blue and tells you the gossip of three star systems.',
            'Peelia Veelia',
            'peelia',
          );
        }
      } else if (roll === 8 || roll === 9 || roll === 23 || roll === 24) {
        if (co.wagesOwed > 0) {
          const owed = co.wagesOwed;
          co.wagesOwed = 0;
          say(
            state,
            ci,
            'good',
            `After a night on Loro your crew is feeling generous: the ${fmt(owed)} kubars of back wages are forgotten.`,
            'Peelia Veelia',
            'peelia',
          );
        } else {
          say(
            state,
            ci,
            'info',
            'Your crew returns from shore leave sunburned, broke, and inexplicably wearing matching shirts.',
            'Peelia Veelia',
            'peelia',
          );
        }
      } else if ((roll >= 10 && roll <= 15) || roll >= 25) {
        say(
          state,
          ci,
          'info',
          'Peelia Veelia is entertaining other guests. The beach, however, is open.',
          'Peelia Veelia',
          'peelia',
        );
      } else {
        say(
          state,
          ci,
          'info',
          'Loro works its magic: the crew comes back humming, and nobody mentions wages at all.',
          'Peelia Veelia',
          'peelia',
        );
      }
      return;
    }

    /* ---- Zile: Mr. Zinn ---- */
    case 'zinn': {
      const roll = r.fint(1, 31);
      if (roll === 7 || roll === 22 || roll === 23) {
        if (co.zinnRate >= 2) {
          co.zinnRate -= 1;
          say(
            state,
            ci,
            'good',
            `Mr. Zinn, over tea, agrees to shave your rate to ${co.zinnRate}% per week. He seems almost hurt by your surprise.`,
            'Mr. Zinn',
            'zinn',
          );
        } else {
          co.zinnRate = 2;
          say(
            state,
            ci,
            'bad',
            `Mr. Zinn studies your remarkably low rate, tuts, and corrects it to 2% per week.`,
            'Mr. Zinn',
            'zinn',
          );
        }
      } else if (roll === 8) {
        co.zinnLimit += 50000;
        say(
          state,
          ci,
          'good',
          `Mr. Zinn raises your credit line to ${fmt(co.zinnLimit)} kubars. "Spend it wisely," he says, meaning: spend it.`,
          'Mr. Zinn',
          'zinn',
        );
      } else if (roll === 24) {
        co.zinnLimit += 75000;
        say(
          state,
          ci,
          'good',
          `Mr. Zinn raises your credit line to ${fmt(co.zinnLimit)} kubars and winks alarmingly.`,
          'Mr. Zinn',
          'zinn',
        );
      } else if (roll === 9 || roll === 25) {
        if (co.zinnLoan > 20) {
          const cut = Math.floor(co.zinnLoan / (roll === 9 ? 3 : 4));
          co.zinnLoan -= cut;
          say(
            state,
            ci,
            'good',
            `Mr. Zinn, citing an anniversary of some kind, forgives ${fmt(cut)} kubars of your debt.`,
            'Mr. Zinn',
            'zinn',
          );
        } else {
          say(
            state,
            ci,
            'info',
            'Mr. Zinn inspects your nearly clean slate and sighs, a man deprived of his favourite pastime.',
            'Mr. Zinn',
            'zinn',
          );
        }
      } else if (roll === 10 || roll === 26) {
        const loan = roll === 10 ? 50000 : 40000;
        const limit = roll === 10 ? 75000 : 60000;
        co.zinnLoan += loan;
        co.zinnLimit += limit;
        co.cash += loan;
        say(
          state,
          ci,
          'good',
          `Mr. Zinn presses ${fmt(loan)} kubars on you — "an investment in our friendship" — and raises your limit by ${fmt(limit)}. The interest clock, of course, is already ticking.`,
          'Mr. Zinn',
          'zinn',
        );
      } else if ((roll >= 11 && roll <= 15) || roll >= 27) {
        say(
          state,
          ci,
          'info',
          'Mr. Zinn is in a meeting, says the receptionist, with somebody richer.',
          'Mr. Zinn',
          'zinn',
        );
      } else {
        say(
          state,
          ci,
          'info',
          `Mr. Zinn receives you warmly, enquires after your health, your ship, and your ${fmt(co.zinnLoan)}-kubar loan — in that order.`,
          'Mr. Zinn',
          'zinn',
        );
      }
      return;
    }

    /* ---- Frac: Voyager's Insurance HQ ---- */
    case 'insurance': {
      const X = rand * co.ship.cargo * 4;
      const roll = r.fint(1, 30);
      if ((roll >= 8 && roll <= 11) || (roll >= 23 && roll <= 26)) {
        if (co.insurancePriceRange >= 6) {
          co.insurancePriceRange -= 5;
          co.insuranceCost = Math.floor(co.insuranceCost / 2);
          say(
            state,
            ci,
            'good',
            `A premium review goes your way: risk class down, and your next premium is halved to ${fmt(co.insuranceCost)} kubars.`,
            "Voyager's Insurance",
            'insurance',
          );
        } else {
          co.insurancePriceRange += 5;
          co.insuranceCost = co.insurancePriceRange * 1000 - r.fint(1, 1000);
          say(
            state,
            ci,
            'bad',
            `The actuaries re-run your numbers and dislike what they find. Next premium: ${fmt(co.insuranceCost)} kubars.`,
            "Voyager's Insurance",
            'insurance',
          );
        }
      } else if (roll === 12 || roll === 27) {
        co.insurancePriceRange += 5;
        co.insuranceCost = co.insurancePriceRange * 1000 - r.fint(1, 1000);
        say(
          state,
          ci,
          'bad',
          `Your risk class is raised — something about "flight patterns". Next premium: ${fmt(co.insuranceCost)} kubars.`,
          "Voyager's Insurance",
          'insurance',
        );
      } else if (roll === 20) {
        const suffix = pay(co, X);
        say(
          state,
          ci,
          'bad',
          `An audit finds you were under-charged for years. The difference — ${fmt(X)} kubars — is due immediately.${suffix}`,
          "Voyager's Insurance",
          'insurance',
        );
      } else if (roll >= 28) {
        co.cash += X;
        say(
          state,
          ci,
          'good',
          `An audit finds you were over-charged for years. Voyager's refunds ${fmt(X)} kubars with icy politeness.`,
          "Voyager's Insurance",
          'insurance',
        );
      } else {
        say(
          state,
          ci,
          'info',
          'A claims adjuster shows you around the Hall of Catastrophes. You leave feeling oddly keen to buy insurance.',
          "Voyager's Insurance",
          'insurance',
        );
      }
      return;
    }

    /* ---- Tilo: Casino ---- */
    case 'casino': {
      if (nd % 6 === 0) {
        say(
          state,
          ci,
          'info',
          `The All Or Nothing table is closed — week ${state.week}'s high-roller tournament has taken every seat.`,
          'The Casino',
          'casino',
        );
        return;
      }
      const max = Math.floor(0.05 * co.cash);
      ask(state, {
        id: 'special:casino',
        title: 'All Or Nothing',
        text: `The croupier fans the cards. One hand, double or nothing, house limit 5% of your cash (${fmt(max)} kubars). Place your bet.`,
        choices: [
          { id: 'yes', label: 'Play' },
          { id: 'no', label: 'Walk away' },
        ],
        input: { label: 'Your bet (kubars)', min: 0, max, initial: Math.floor(0.0125 * co.cash) },
        portrait: 'casino',
        mood: 'neutral',
      });
      return;
    }

    /* ---- Queg: Lady Cornucopia ---- */
    case 'smuggler': {
      const cat = state.week % 3;
      const item = rand % 6;
      const def2 = COMMODITIES[cat * 6 + item]!;
      const k = def2.rank;
      const difficulty = LEVEL_BY_ID(state.settings.level).difficulty;
      const pMin = (difficulty + 1) * k * 5;
      const pMax = k * 40;
      const q = Math.max(Math.floor((co.ship.cargo * rand) / 100), Math.floor(co.ship.cargo / 2));
      const market = p.price[def2.id] ?? pMax;
      const price = Math.min(
        pMin + Math.floor(((pMax - pMin) * nd) / 100),
        Math.floor(0.9 * market),
      );
      const room = co.ship.cargo - cargoTons(co);
      if (q > room) {
        co.specialUsed = false; // come back with an emptier hold
        say(
          state,
          ci,
          'info',
          `Lady Cornucopia has ${q} tons of ${def2.name} to move — more than your hold can take. "Come back lighter," she suggests.`,
          'Lady Cornucopia',
          'cornucopia',
        );
        return;
      }
      if (nd % 5 === 0) {
        say(
          state,
          ci,
          'info',
          'The docks are quiet; Lady Cornucopia is "entertaining customs officials" and has nothing to sell this week.',
          'Lady Cornucopia',
          'cornucopia',
        );
        return;
      }
      ask(state, {
        id: 'special:smuggler',
        title: 'Lady Cornucopia',
        text: `Lady Cornucopia lifts a tarp: ${q} tons of ${def2.name}, fallen off a freighter, at ${fmt(price)} kubars a ton (market: ${fmt(market)}). All of it, or none. Deal?`,
        choices: yn('Deal', 'No deal'),
        portrait: 'cornucopia',
        mood: 'neutral',
        data: { commodity: def2.id, q, price },
      });
      return;
    }

    /* ---- Xeen: Mechanic ---- */
    case 'mechanic': {
      const price = rand * nd * 6;
      const kind = rand % 4;
      const what =
        kind === 0
          ? 'squeeze another kuarp out of your engine (+1 speed)'
          : kind === 1
            ? 'weld on a spare bay (+10 tons of cargo space)'
            : kind === 2
              ? 'bolt in another seat (+1 passenger)'
              : 'fit a salvaged auxiliary tank (+5 tons of fuel)';
      ask(state, {
        id: 'special:mechanic',
        title: 'The Xeen Mechanic',
        text: `A mechanic wipes her hands on her overalls and offers to ${what} for ${fmt(price)} kubars. No warranty, obviously. Deal?`,
        choices: yn('Deal', 'No thanks'),
        portrait: 'mechanic',
        mood: 'neutral',
        data: { price, kind },
      });
      return;
    }

    /* ---- Ooom: Soothsayer ---- */
    case 'fortune': {
      if (state.week % 5 === 0) {
        say(
          state,
          ci,
          'info',
          'The soothsayer reads your palm for free — a promotion, she says. She sees travel in your future. And cargo.',
          'The Soothsayer',
          'sooth',
        );
        return;
      }
      const fee = Math.floor((rand * T) / 10);
      ask(state, {
        id: 'special:fortune',
        title: 'The Soothsayer',
        text: `The soothsayer of Ooom will read your fortune — the true one, luck and all — for ${fmt(fee)} kubars. Pay?`,
        choices: yn('Pay', 'Keep walking'),
        portrait: 'sooth',
        mood: 'neutral',
        data: { fee },
      });
      return;
    }

    /* ---- Hork: media / your agent ---- */
    case 'media': {
      const X = r.fint(25, 75) * T;
      const table = r.fint(1, 3);
      const e = (rand % 10) + 1;
      const win =
        (table === 1 && (e === 1 || e === 2 || e === 6 || e === 8)) ||
        (table === 2 && e === 2) ||
        (table === 3 && e === 2);
      const lose = table === 2 && e === 3;
      if (win) {
        co.cash += X;
        say(
          state,
          ci,
          'good',
          `Your publicity stunt is the talk of Channel 7! Sponsorships bring in ${fmt(X)} kubars.`,
          'Hork Media',
          'news',
        );
      } else if (lose) {
        const suffix = pay(co, X);
        say(
          state,
          ci,
          'bad',
          `Your publicity stunt goes badly, publicly wrong. Damage control costs ${fmt(X)} kubars.${suffix}`,
          'Hork Media',
          'news',
        );
      } else {
        say(
          state,
          ci,
          'info',
          'Your press conference is bumped for a story about a two-headed kubar calf. Nobody prints a word about you.',
          'Hork Media',
          'news',
        );
      }
      return;
    }

    /* ---- Bass: Stock Broker — free reading, does not consume the visit ---- */
    case 'broker': {
      co.specialUsed = false;
      if (state.week % 6 === 0) {
        say(
          state,
          ci,
          'info',
          'The brokerage floor is dark: the analysts are all at a conference, presumably telling each other to buy low.',
          'The Bass Broker',
          'broker',
        );
        return;
      }
      const verdict = (t: number) =>
        t <= 20
          ? 'SELL — and run'
          : t <= 30
            ? 'sell'
            : t <= 40
              ? 'leaning sell'
              : t <= 60
                ? 'hold'
                : t <= 70
                  ? 'leaning buy'
                  : t <= 80
                    ? 'buy'
                    : 'BUY — with both hands';
      const lines = state.planets
        .map(
          (pl) =>
            `${PLANET_BY_ID[pl.id].exchange}: ${pl.exchange.crashed ? 'CRASHED' : verdict(pl.exchange.trend)}`,
        )
        .join('\n');
      say(
        state,
        ci,
        'info',
        `The broker flips through her charts and rattles off the word on every exchange:\n\n${lines}`,
        'The Bass Broker',
        'broker',
      );
      return;
    }

    /* ---- Nosh: Zobrok fuel ---- */
    case 'fuel': {
      if (co.ship.fuel >= co.ship.fuelCap) {
        say(
          state,
          ci,
          'info',
          'Zobrok eyes your full tank and shrugs: "Nothing to sell a man who needs nothing." He waves you off cheerfully.',
          'Zobrok',
          'zobrok',
        );
        return;
      }
      if (nd % 5 === 0) {
        say(
          state,
          ci,
          'info',
          'The depot is sold out — a freighter convoy drained the tanks this morning. Zobrok apologises with both pairs of hands.',
          'Zobrok',
          'zobrok',
        );
        return;
      }
      const disc = 10 + rand / 2;
      const unit = Math.floor(p.fuelPrice * (1 - disc / 100));
      const tons = co.ship.fuelCap - co.ship.fuel;
      const cost = unit * tons;
      ask(state, {
        id: 'special:zobrok',
        title: 'Zobrok',
        text: `Zobrok leans in: "For you, friend — a full tank at ${fmt(unit)} a ton." (${tons} tons, ${fmt(cost)} kubars, ${Math.floor(disc)}% off the posted price.) Fill up?`,
        choices: yn('Fill up', 'No thanks'),
        portrait: 'zobrok',
        mood: 'neutral',
        data: { unit, tons, cost },
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
  amount?: number,
): void {
  switch (id) {
    case 'notice':
      return;
    case 'special:engine': {
      if (choice !== 'yes') return;
      const price = data.price as number;
      if (state.newsData % 4 === 0) {
        // the sale falls through only after you agree
        say(
          state,
          ci,
          'info',
          `The rep rummages in the back and returns empty-handed: "Sold the last one ${(state.week % 10) + 1} minutes ago." No charge, no engine.`,
          'L-Tech Engine Works',
          'ltech',
        );
        return;
      }
      const suffix = pay(co, price);
      co.ship.kuarps += 1;
      say(
        state,
        ci,
        'good',
        `The new drive purrs. Engine speed is now ${co.ship.kuarps} kuarps.${suffix}`,
        'L-Tech Engine Works',
        'ltech',
      );
      return;
    }
    case 'special:mechanic': {
      if (choice !== 'yes') return;
      const price = data.price as number;
      const kind = data.kind as number;
      if (r.fint(1, 3) === 1) {
        say(
          state,
          ci,
          'info',
          'The mechanic tinkers for an hour, swears colourfully, and gives up. "No charge. Wasn\'t meant to be."',
          'The Xeen Mechanic',
          'mechanic',
        );
        return;
      }
      const suffix = pay(co, price);
      if (kind === 0) co.ship.kuarps += 1;
      else if (kind === 1) co.ship.cargo += 10;
      else if (kind === 2) {
        co.ship.seats += 1;
        // a passenger can board on the spot if demand outstrips your old cabin
        if (co.paxPickedUp && co.paxWaiting > co.passengers) {
          co.passengers += 1;
          co.cash += co.paxPrice;
          co.taxOwedPassenger += Math.floor((co.paxPrice * state.econ.passTax) / 100);
        }
      } else co.ship.fuelCap += 5;
      say(
        state,
        ci,
        'good',
        `Sparks fly, something clangs, and it works. The mechanic accepts ${fmt(price)} kubars and a handshake.${suffix}`,
        'The Xeen Mechanic',
        'mechanic',
      );
      return;
    }
    case 'special:zobrok': {
      if (choice !== 'yes') return;
      const cost = data.cost as number;
      if (cost > co.cash) {
        say(
          state,
          ci,
          'info',
          'Zobrok counts your kubars, sighs, and rolls the hose back up. "Cash, friend. Cash."',
          'Zobrok',
          'zobrok',
        );
        return;
      }
      co.cash -= cost;
      co.ship.fuel = co.ship.fuelCap;
      say(
        state,
        ci,
        'good',
        `The tank gurgles to full. Zobrok pockets ${fmt(cost)} kubars and salutes with two arms.`,
        'Zobrok',
        'zobrok',
      );
      return;
    }
    case 'special:smuggler': {
      if (choice !== 'yes') return;
      const c = data.commodity as import('./data/commodities').CommodityId;
      const q = data.q as number;
      const price = data.price as number;
      const suffix = pay(co, price * q);
      const lot = co.cargo[c];
      if (!lot) co.cargo[c] = { tons: q, paid: price };
      else {
        lot.paid = Math.floor((lot.paid * lot.tons + price * q) / (lot.tons + q));
        lot.tons += q;
      }
      say(
        state,
        ci,
        'good',
        `${q} tons change hands in the dark. Lady Cornucopia bites one of your kubars, nods, and is gone.${suffix}`,
        'Lady Cornucopia',
        'cornucopia',
      );
      return;
    }
    case 'special:fortune': {
      if (choice !== 'yes') return;
      const fee = data.fee as number;
      const suffix = pay(co, fee);
      const g = co.eventGood;
      const mult = g <= 60 ? 0 : g <= 65 ? 5 : g <= 70 ? 10 : g <= 75 ? 15 : g <= 80 ? 20 : 25;
      if (mult > 0 && r.fint(1, 2) === 1) {
        const win = fee * mult;
        co.cash += win;
        say(
          state,
          ci,
          'good',
          `The soothsayer gasps: your stars are extraordinary. She presses ${fmt(win)} kubars on you — "the cards insist."${suffix}`,
          'The Soothsayer',
          'sooth',
        );
      } else {
        const reading =
          g <= 20
            ? 'a black cloud follows your ship'
            : g <= 40
              ? 'your stars are… troubled'
              : g <= 60
                ? 'your fortune is perfectly, profoundly average'
                : g <= 75
                  ? 'luck leans your way'
                  : 'you are among the luckiest beings she has ever read';
        say(
          state,
          ci,
          'info',
          `The soothsayer studies the cards a long while: ${reading}.${suffix}`,
          'The Soothsayer',
          'sooth',
        );
      }
      return;
    }
    case 'special:casino': {
      if (choice !== 'yes') return;
      const bet = Math.floor(amount ?? 0);
      if (bet <= 0 || bet > co.cash || bet > Math.floor(0.05 * co.cash)) {
        co.specialUsed = false; // invalid bet doesn't consume the visit
        say(
          state,
          ci,
          'info',
          'The croupier shakes his head at your bet. "House rules: real money, five percent of cash at most."',
          'The Casino',
          'casino',
        );
        return;
      }
      subtractCash(co, bet);
      if (r.fint(1, 20) > 10) {
        say(
          state,
          ci,
          'bad',
          `The house wins. Your ${fmt(bet)} kubars vanish beneath the croupier's spotless glove.`,
          'The Casino',
          'casino',
        );
        return;
      }
      askDouble(state, co, bet, 2, 9);
      return;
    }
    case 'special:double': {
      const bet = data.bet as number;
      const mult = data.mult as number;
      const chance = data.chance as number;
      if (choice !== 'yes') {
        const win = bet * mult;
        co.cash += win;
        say(
          state,
          ci,
          'good',
          `You collect ${fmt(win)} kubars and leave while the leaving is good.`,
          'The Casino',
          'casino',
        );
        return;
      }
      if (r.fint(1, 20) <= chance) {
        askDouble(state, co, bet, mult * 2, chance - 1);
      } else {
        say(
          state,
          ci,
          'bad',
          `The cards turn. Everything — all ${fmt(bet * mult)} kubars of winnings — slides back to the house.`,
          'The Casino',
          'casino',
        );
      }
      return;
    }
    default:
      return;
  }
}

function askDouble(
  state: GameState,
  co: CompanyState,
  bet: number,
  mult: number,
  chance: number,
): void {
  ask(state, {
    id: 'special:double',
    title: 'All Or Nothing',
    text: `You win! Your ${fmt(bet)}-kubar bet stands at ${fmt(bet * mult)} kubars. The croupier raises an eyebrow: double or nothing?`,
    choices: [
      { id: 'yes', label: 'Double!' },
      { id: 'no', label: `Take ${fmt(bet * mult)}` },
    ],
    portrait: 'casino',
    mood: 'good',
    data: { bet, mult, chance },
  });
}
