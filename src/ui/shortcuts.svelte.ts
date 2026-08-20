/**
 * Per-player shortcuts ("quick actions").
 *
 * Each flag turns a main-menu button, a grid row or the map into a one-click action instead of
 * a trip through a sub-screen. Nothing here is a rule: a shortcut dispatches exactly the same
 * engine action the long way round would, so hot-seat, play-by-link and online games all stay
 * in step. That is also why the flags live in localStorage rather than in the save — they are
 * an input preference of the person at the keyboard, keyed by company so two players sharing a
 * machine keep their own.
 *
 * Right-clicking a shortcut-enabled control always opens the full screen anyway, which is how
 * the 1997 release let you get at the sub-menus without turning the shortcut off.
 */

export type QuickFlag =
  | 'buy'
  | 'warehouse'
  | 'passengers'
  | 'advertising'
  | 'crew'
  | 'tax'
  | 'insurance'
  | 'fuel'
  | 'bank'
  | 'loan'
  | 'explore'
  | 'deposit'
  | 'travel';

export const QUICK_FLAGS: readonly { id: QuickFlag; name: string; desc: string }[] = [
  {
    id: 'buy',
    name: 'Quick Buy',
    desc: 'Clicking a row in the Marketplace trades at once: sell the whole lot if you are carrying it, otherwise buy as much as your hold and your cash allow.',
  },
  {
    id: 'warehouse',
    name: 'Quick Warehouse',
    desc: 'Clicking a row in the Warehouse moves the goods at once: load what is stored if the hold has room, otherwise store what you are carrying.',
  },
  {
    id: 'passengers',
    name: 'Quick Passengers',
    desc: 'The Pickup Passengers button boards everyone waiting at your current ticket price.',
  },
  {
    id: 'advertising',
    name: 'Quick Advertising',
    desc: 'The Advertise button re-books the campaign you ran last week without opening the screen.',
  },
  {
    id: 'crew',
    name: 'Quick Crew',
    desc: 'The Crew button pays every kubar of back wages you owe.',
  },
  { id: 'tax', name: 'Quick Taxes', desc: 'The Taxes button settles the whole tax bill.' },
  {
    id: 'insurance',
    name: 'Quick Insurance',
    desc: "The Insurance button buys cover for the next trip at Voyager's asking price.",
  },
  { id: 'fuel', name: 'Quick Fuel', desc: 'The fuel pump fills the tank to capacity.' },
  {
    id: 'bank',
    name: 'Quick Bank',
    desc: 'The Bank button deposits all your cash, or withdraws all your savings when the savings are the larger pile.',
  },
  {
    id: 'loan',
    name: 'Quick Loan',
    desc: "The Loan button repays the Trader's Union out of cash, or borrows up to your credit limit when you owe nothing.",
  },
  {
    id: 'explore',
    name: 'Quick Explore',
    desc: "The Explore button goes straight to the planet's special institution.",
  },
  {
    id: 'deposit',
    name: 'Quick Deposit',
    desc: 'Every kubar of cash goes into the bank as you leave the planet, so it earns interest while you fly.',
  },
  {
    id: 'travel',
    name: 'Quick Travel',
    desc: 'Clicking a planet on the Journey map launches immediately, with no confirmation.',
  },
];

const KEY = 'opengaz.shortcuts';
type Store = Record<string, Partial<Record<QuickFlag, boolean>>>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

class Shortcuts {
  private all = $state<Store>(read());

  /** is `flag` on for this company? */
  on(companyId: string, flag: QuickFlag): boolean {
    return this.all[companyId]?.[flag] ?? false;
  }

  set(companyId: string, flag: QuickFlag, value: boolean) {
    const mine = { ...(this.all[companyId] ?? {}), [flag]: value };
    this.all = { ...this.all, [companyId]: mine };
    this.save();
  }

  toggle(companyId: string, flag: QuickFlag) {
    this.set(companyId, flag, !this.on(companyId, flag));
  }

  /** turn every shortcut on or off at once */
  setAll(companyId: string, value: boolean) {
    const mine: Partial<Record<QuickFlag, boolean>> = {};
    for (const f of QUICK_FLAGS) mine[f.id] = value;
    this.all = { ...this.all, [companyId]: mine };
    this.save();
  }

  count(companyId: string): number {
    return QUICK_FLAGS.filter((f) => this.on(companyId, f.id)).length;
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.all));
    } catch {
      // private browsing: the choice just doesn't stick
    }
  }
}

export const shortcuts = new Shortcuts();
