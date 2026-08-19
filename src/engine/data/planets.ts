export type PlanetId =
  | 'vexx'
  | 'zile'
  | 'stye'
  | 'frac'
  | 'bass'
  | 'hork'
  | 'xeen'
  | 'pyke'
  | 'nosh'
  | 'loro'
  | 'mira'
  | 'ooom'
  | 'tilo'
  | 'queg';

export type SpecialKind =
  | 'magistrate'
  | 'zinn'
  | 'union'
  | 'insurance'
  | 'broker'
  | 'media'
  | 'mechanic'
  | 'engines'
  | 'fuel'
  | 'shoreleave'
  | 'blessing'
  | 'fortune'
  | 'casino'
  | 'smuggler';

export interface PlanetDef {
  id: PlanetId;
  name: string;
  tagline: string;
  special: SpecialKind;
  /** exchange name shown on the stock screen */
  exchange: string;
  /** a few lines of history for the Explore → History screen */
  lore: string;
}

export const PLANETS: readonly PlanetDef[] = [
  {
    id: 'vexx',
    name: 'Vexx',
    tagline: 'Capital of Kukubia, seat of the Imperial Magistrate',
    special: 'magistrate',
    exchange: 'The Vexx Exchange',
    lore: 'Vexx has been the seat of the Nicolson dynasty since Bass Nicolson declared himself Supreme Commander and paved the capital in marble he could not afford. His son Hork lost half the empire to the Moogler uprising; his grandson Dred kept the other half by the simple expedient of never leaving the palace. Petitions to the Imperial Magistrate are heard on alternate Tuesdays and granted on alternate centuries.',
  },
  {
    id: 'zile',
    name: 'Zile',
    tagline: "Wealthy merchants' planet, home of Mr. Zinn",
    special: 'zinn',
    exchange: 'The Zile Exchange',
    lore: 'Zile grew rich the honest way: by lending money to everyone else. Its most famous son, Mr. Zinn, started with a single freighter and a talent for compound interest, and now owns a piece of every ship in the colonies — possibly including yours. Ziletians consider it rude to discuss money and ruder still not to have any.',
  },
  {
    id: 'stye',
    name: 'Stye',
    tagline: "Financial hub, headquarters of the Trader's Union",
    special: 'union',
    exchange: 'The Stye Exchange',
    lore: "The Trader's Union was founded on Stye by seven ruined merchants who agreed that if they could not beat the market they would at least regulate it. Today the Union sets credit limits, runs the bank, holds the warehouse lottery and forecloses on the unlucky with great courtesy. Its headquarters is the tallest building in Kukubia, mostly filing cabinets.",
  },
  {
    id: 'frac',
    name: 'Frac',
    tagline: "Headquarters of the Voyager's Insurance Company",
    special: 'insurance',
    exchange: 'The Frac Exchange',
    lore: "Frac was the first colony, founded by the explorer Sir Lily Slimwagon, who insisted every building be painted yellow so he could find his way home. The Voyager's Insurance Company began here as a bet between two ship captains about which of them would be eaten by space whales first. Neither was; the company kept the premiums.",
  },
  {
    id: 'bass',
    name: 'Bass',
    tagline: 'A playground for stock market analysts',
    special: 'broker',
    exchange: 'The Bass Exchange',
    lore: "Named after the first Supreme Commander, Bass is where the colonies' analysts, brokers and fortune-hunters gather to stare at charts and shout. Every exchange in Kukubia is watched from Bass, and the local brokers will happily tell you which way the wind is blowing — for a small commission, naturally.",
  },
  {
    id: 'hork',
    name: 'Hork',
    tagline: 'Media capital of Kukubia',
    special: 'media',
    exchange: 'The Hork Exchange',
    lore: "Hork is where the news is made, mostly up. Channel 7 Kuku News broadcasts from a tower shaped like a microphone, and the planet's inhabitants can smell a publicity stunt from three systems away. Nothing that happens on Hork stays on Hork; that is rather the point.",
  },
  {
    id: 'xeen',
    name: 'Xeen',
    tagline: 'One giant junkyard of spare parts and brilliant mechanics',
    special: 'mechanic',
    exchange: 'The Xeen Exchange',
    lore: 'Xeen is a junkyard the size of a planet, and its people are the finest mechanics in the known universe because they have never had a new part in their lives. Anything can be fixed on Xeen, welded onto anything else, and sold back to you with a warranty written in crayon.',
  },
  {
    id: 'pyke',
    name: 'Pyke',
    tagline: 'Industrial heartland, home of L-Tech engines',
    special: 'engines',
    exchange: 'The Pyke Exchange',
    lore: 'The forges of Pyke never cool. L-Tech, the engine works that supplies half the colonies, was born here when a foundry accident produced the first ionic drive and the second-largest crater on the planet. Pykians measure everything in kuarps, including their children.',
  },
  {
    id: 'nosh',
    name: 'Nosh',
    tagline: 'Fuel depot of the colonies',
    special: 'fuel',
    exchange: 'The Nosh Exchange',
    lore: 'Nosh sits on top of the richest Ionic Fuel deposits in Kukubia and never lets anyone forget it. Zobrok, the fuel wholesaler, runs the depot with a wink and a discount for people he likes, and a very different price for people he does not.',
  },
  {
    id: 'loro',
    name: 'Loro',
    tagline: 'Pleasure planet — every crew’s favourite stop',
    special: 'shoreleave',
    exchange: 'The Loro Exchange',
    lore: 'Loro is the pleasure planet: beaches, casinos, cocktails with tiny umbrellas, and a customs office that closes at noon. Crews beg to be routed through Loro and captains regret it, though the local hostess Peelia Veelia has been known to talk a mutinous crew back to work with nothing but a smile.',
  },
  {
    id: 'mira',
    name: 'Mira',
    tagline: 'Home of the Grand Sages and the silent Quaso Mutta',
    special: 'blessing',
    exchange: 'The Mira Exchange',
    lore: "Mira's barren sandstone plains are home to the Quaso Mutta — silent creatures that vibrate faintly and are said to know the future. The Grand Sages of Mira interpret the vibrations, bless the worthy, and occasionally curse the greedy. Pilgrims arrive sceptical and leave superstitious.",
  },
  {
    id: 'ooom',
    name: 'Ooom',
    tagline: 'Fortune tellers and soothsayers on every corner',
    special: 'fortune',
    exchange: 'The Ooom Exchange',
    lore: "On Ooom every street corner has a soothsayer, and every soothsayer has an opinion about your aura. Some of them are even right. The planet's economy runs on incense, tarot decks and the reliable human urge to know how lucky one is before it matters.",
  },
  {
    id: 'tilo',
    name: 'Tilo',
    tagline: 'Casinos as far as the eye can see',
    special: 'casino',
    exchange: 'The Tilo Exchange',
    lore: 'Tilo is one enormous casino with a spaceport attached. Its founders reasoned that travellers with money and time between flights would gamble, and they were correct. The house edge on Tilo is small, famous, and merciless.',
  },
  {
    id: 'queg',
    name: 'Queg',
    tagline: 'Smugglers’ den of Lady Cornucopia',
    special: 'smuggler',
    exchange: 'The Queg Exchange',
    lore: "Queg is officially a quiet agricultural moon; unofficially it is where Lady Cornucopia's smugglers move goods that fell off a great many freighters. Prices on Queg are excellent, paperwork is nonexistent, and the Galaxy Police maintain a very small office with a very large blind spot.",
  },
];

export const PLANET_BY_ID: Record<PlanetId, PlanetDef> = Object.fromEntries(
  PLANETS.map((p) => [p.id, p]),
) as Record<PlanetId, PlanetDef>;

/** The seven map slots (grid units). Chosen planets are shuffled into these. */
export const MAP_SLOTS: readonly { x: number; y: number }[] = [
  { x: 20, y: 0 },
  { x: 14, y: 6 },
  { x: 11, y: 13 },
  { x: 8, y: 3 },
  { x: 3, y: 10 },
  { x: 21, y: 11 },
  { x: 0, y: 1 },
];

/** Distance between two slots in "million kuters" — raw Euclidean, never rounded. */
export function slotDistance(a: number, b: number): number {
  if (a === b) return 0;
  const p = MAP_SLOTS[a]!;
  const q = MAP_SLOTS[b]!;
  return Math.hypot(p.x - q.x, p.y - q.y);
}
