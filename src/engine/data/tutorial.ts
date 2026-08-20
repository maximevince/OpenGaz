/**
 * The tutorial ladder.
 *
 * At the Tutorial level the game starts with almost nothing switched on — a market, a bank
 * balance and a map — and hands the player one more thing to worry about every few weeks. Each
 * stage both unlocks a feature and suppresses the rules behind it, so nobody is charged a tax
 * or outbid at an auction they have not been introduced to yet.
 *
 * Stages 1..7 arrive on a fixed timetable (weeks 2 and 5 are left quiet). From stage 7 a solo
 * player decides when to take the next one; in a hot-seat or online game, where one player
 * cannot be allowed to set the pace for everyone, one arrives per week instead.
 */

/** Everything the tutorial can gate, in unlock order. */
export type Feature =
  | 'market'
  | 'zinn'
  | 'supply'
  | 'loan'
  | 'insurance'
  | 'viewCity'
  | 'fuel'
  | 'passengers'
  | 'crew'
  | 'advertising'
  | 'tax'
  | 'bank'
  | 'warehouse'
  | 'explore'
  | 'distance'
  | 'facility'
  | 'stock';

/** The stage at which each feature switches on. */
export const FEATURE_STAGE: Record<Feature, number> = {
  market: 1,
  zinn: 2,
  supply: 3,
  loan: 4,
  insurance: 5,
  viewCity: 6,
  fuel: 7,
  passengers: 8,
  crew: 9,
  advertising: 10,
  tax: 11,
  bank: 12,
  warehouse: 13,
  explore: 14,
  distance: 15,
  facility: 16,
  stock: 17,
};

export const FINAL_STAGE = 17;

/**
 * The forced timetable for the opening stages: week -> stage. Weeks 2 and 5 are rest weeks and
 * show no lesson at all, which is why the numbering skips them.
 */
const SCHEDULE: Record<number, number> = { 1: 1, 3: 2, 4: 3, 6: 4, 7: 5, 8: 6, 9: 7 };

/** The stage this week guarantees, or null if the week adds nothing by itself. */
export function scheduledStage(week: number): number | null {
  return SCHEDULE[week] ?? null;
}

/** Weeks 2 and 5 are deliberately quiet — no lesson, just play. */
export function isRestWeek(week: number): boolean {
  return week === 2 || week === 5;
}

/** One lesson per stage: what just appeared, and what to do with it. */
export interface Lesson {
  title: string;
  text: string;
}

export const LESSONS: Record<number, Lesson> = {
  1: {
    title: 'Welcome to Kukubia',
    text: 'You run a trading company. Mr. Zinn lent you the ship, and he wants his money back — so the whole game is one question: buy something on a planet where it is cheap, and sell it somewhere it is dear. Open the Marketplace, look at the Market Price against the Price Range, and buy something near the bottom of its range. Then click Journey and fly somewhere else. That is a week gone, and there is nothing else you need to know yet.',
  },
  2: {
    title: "Mr. Zinn's Loan",
    text: 'Your ship was not a gift. Mr. Zinn charges interest every week you travel, and it compounds, so the debt grows while you are busy. His screen shows what you owe and what the interest is costing you. Pay him down whenever you are flush; go past his credit limit and he takes the ship back.',
  },
  3: {
    title: 'The Supply Chart',
    text: 'Guessing where to fly gets old. The Supply Chart shows how plentiful each commodity is on every planet: 0% means rare and expensive, 100% means everywhere and cheap. Buy where the number is high, sell where it is low, and let the chart pick your next destination.',
  },
  4: {
    title: "The Trader's Union Loan",
    text: 'The Union will lend you working capital at its own weekly rate, up to a credit limit. Borrowed money that buys cargo which sells at a profit is free money; borrowed money that sits in your pocket is a slow leak. You can repay any time.',
  },
  5: {
    title: 'Insurance',
    text: "Space is not empty. Voyager's Insurance covers exactly one trip, and it does not pay out so much as prevent: with cover, the meteor, the pirate or the warehouse fire simply does not cost you anything. It will not help with fines, gambling, wages or the taxman. Buy it before a long haul with a full hold.",
  },
  6: {
    title: 'View City',
    text: "Every planet is more than a price list. The city screen lets you read the Ministry of Time and each world's own history — background for now, but the same screen grows into something far more useful later.",
  },
  7: {
    title: 'Fuel',
    text: "Ionic fuel burns roughly half the distance you fly, plus a few tons for the ship's mass, and the price differs by planet and week. Run dry between planets and an emergency tanker will rescue you at a spectacular price and cost you a week. Watch the gauge. Buy cheap where you can.\n\nFrom here on the pace is yours: press Add New Feature whenever you want the next one.",
  },
  8: {
    title: 'Passengers',
    text: 'Your ship has seats as well as a hold. Set a ticket price and travellers turn up — fewer of them the more you charge, and none at all above about 10,000. They pay when they board, on the planet you are leaving, so it is free money for a trip you were making anyway.',
  },
  9: {
    title: 'Crew Wages',
    text: 'Your crew has been working for nothing. Wages accrue every week whether you pay them or not, and firing people does not help. Let the arrears run for weeks and they strike: you pay the lot at once, and the salary goes up permanently.',
  },
  10: {
    title: 'Advertising',
    text: 'Advertising works for one week and takes effect on the planet you are flying to. Passenger ads fill your seats; commodity ads bring extra tons of goods to that market — which your rivals can buy too. Bigger ships pay more for the same campaign.',
  },
  11: {
    title: 'Taxes and Tariffs',
    text: 'The Empire has noticed you. There is a tax on ticket sales, an export tariff on goods leaving a planet and an import tariff on goods arriving. What you owe accrues. Ignore it long enough and the Tax Auditor takes an interest, which costs three times as much as paying would have.',
  },
  12: {
    title: 'The Bank',
    text: "The Trader's Union bank pays interest every week you travel, with no limit on deposits. Money doing nothing in your pocket should be in the bank; money in the bank cannot buy cargo. That tension is the whole of financial management here.",
  },
  13: {
    title: 'Warehouses',
    text: 'You have storage on every planet. Goods in a warehouse pay no tariffs and can sit there waiting for a better price instead of riding around in your hold taking up space. Store a glut, come back when the supply chart says the price has recovered.',
  },
  14: {
    title: 'Explore the City',
    text: 'The city screen is now fully open. Every world has one institution worth a visit — favours, upgrades, blessings, casinos, smugglers — usable once per stop. The News Center reports what is moving the markets, and the Weather Bureau warns of hazards on the approaches to a planet. Both are worth reading before you set course.',
  },
  15: {
    title: 'The Distance Chart',
    text: 'Turn order is decided by travel time: whoever arrives first trades first, at the prices nobody has moved yet. The distance chart shows where every company is, how fast its engine is, and how far it sits from the planet you are eyeing.',
  },
  16: {
    title: 'Auctions and Facilities',
    text: 'Emperor Dred privatises government facilities, and the Union auctions ship enlargements. Bids are sealed and placed as you set course. A facility charges every other company a landing fee, which piles up on the planet until you next touch down there — the closest thing to income that does not involve flying.',
  },
  17: {
    title: 'The Stock Market',
    text: 'Every planet has an exchange, and you can only trade the one you are standing on. Prices follow trends: ride them up, sell before they turn, and note that a badly sinking exchange can crash to nothing and take your shares with it.\n\nThat is everything. The tutorial is over — the rest of the game is yours.',
  },
};

export function lessonFor(stage: number): Lesson {
  return LESSONS[Math.min(FINAL_STAGE, Math.max(1, stage))]!;
}
