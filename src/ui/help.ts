/** Context-sensitive help, in our own words. Keyed by screen. */
import type { Screen } from './game.svelte';

export const HELP: Partial<Record<Screen, { title: string; text: string }>> = {
  menu: {
    title: 'Main Menu',
    text: 'The heart of the game. Buy and sell in the Marketplace, pick up passengers, pay your crew and taxes, insure the next trip, and when you are done click the planet picture to travel. Every journey is one week: interest, wages and rents accrue, and whoever arrives first trades first.',
  },
  market: {
    title: 'Marketplace',
    text: 'Buy low here, sell high somewhere else. Market Price is what the planet pays today; Price Range shows the lowest and highest possible anywhere. Price You Paid is your average cost. Buying pushes the local price up and selling pushes it down. Sell back what you bought this visit and you get a full refund.',
  },
  supply: {
    title: 'Supply Chart',
    text: '0 % means the commodity is rare on that planet (expensive), 100 % means it is plentiful (cheap). Supply drifts every week and reacts to harvests, disasters and what the other companies buy. Prices are highest where supply is lowest.',
  },
  warehouse: {
    title: 'Warehouse',
    text: "You get 50 tons of storage on every planet for free. Goods in a warehouse pay no export or import tariffs and can wait for a better price. Extra space is offered now and then by the Trader's Union lottery.",
  },
  passengers: {
    title: 'Passengers',
    text: 'Set a ticket price between 100 and 10,000. The higher the price, the fewer travellers show up — above 4,000 they vanish fast. Passenger advertising fills the seats. Fares are paid on arrival and taxed at the passenger tax rate. A crew on strike will not let anyone board.',
  },
  advertise: {
    title: 'Advertising',
    text: 'Ads work for one week only and take effect on the next planet. Passenger ads bring travellers to your counter; commodity ads bring extra tons of goods to that market (your rivals can buy them too). Larger ships pay more for the same campaign.',
  },
  crew: {
    title: 'Crew',
    text: 'Every employee earns a weekly salary that accrues while you travel. Let the arrears pile up and the crew may strike, which stops passengers boarding until you pay everything. A bigger ship needs a bigger crew.',
  },
  taxes: {
    title: 'Taxes',
    text: 'The Empire charges a passenger tax on fares, an export tariff on goods you carry off a planet and an import tariff on goods you bring in. Owed taxes accrue; leave them unpaid for three weeks and the Tax Auditor collects with a 25 % fine.',
  },
  insurance: {
    title: "Voyager's Insurance",
    text: 'Insurance covers your next trip only. It reimburses losses from meteor storms, pirates, bandits, fires and the like — but never fines, gambling, wages, loans or taxes. Premiums depend on your ship, cargo and accident record.',
  },
  bank: {
    title: 'Bank',
    text: "The Trader's Union bank pays interest every week you travel. There is no limit to deposits. Lobbying on Stye can raise the rate.",
  },
  loan: {
    title: "Trader's Union Loan",
    text: 'Borrow up to your credit limit; interest is added every week. If your loan ever exceeds the credit limit the Union forces you into bankruptcy and you lose the game. Shortfalls for mandatory costs are borrowed automatically.',
  },
  zinn: {
    title: "Mr. Zinn's Loan",
    text: 'Mr. Zinn financed your ship. His interest compounds every week and is added to the debt. Exceed his credit limit and he repossesses the ship — game over. Paying him down early saves a fortune. Visiting him on Zile can bring favours.',
  },
  fuel: {
    title: 'Fuel',
    text: 'Every trip burns Ionic Fuel: roughly half the distance in million kuters, plus a few tons for the ship’s mass. Prices differ by planet and week. Run dry in deep space and an emergency tanker charges a fortune. Nosh sells wholesale.',
  },
  stock: {
    title: 'Stock Market',
    text: 'Each planet has an exchange; you can only trade on the one where you are. Brokers take 1 %. You may invest at most 50 % of your cash per week and buy only once per week. Prices follow trends — ride the bull runs, sell before the bear. Below about 250 an exchange tends to crash to zero and your shares are worthless.',
  },
  money: {
    title: 'Money',
    text: 'Net worth = cash + bank + shares − loans. The first company to reach the goal for this level wins. Company History shows the last 20 weeks; Net Worth and Market Strength compare all companies.',
  },
  map: {
    title: 'Galaxy Map',
    text: 'Click a planet to fly there. Distance divided by your engine speed (kuarps) gives the travel time; the fastest arrivals trade first next week. Check the Supply Chart to pick where your cargo will fetch the most.',
  },
  explore: {
    title: 'Explore Planet',
    text: 'Every planet has a Special institution worth a visit — banking favours, insurance reviews, upgrades, blessings, casinos and smugglers. The Weather Bureau warns of hazards, the News Center reports what moves the markets, and the Histories tell you how Kukubia got this way.',
  },
  file: {
    title: 'File Options',
    text: 'Save up to five games in this browser; the game also autosaves. "Copy game link" packs the whole game into a link you can send to the next player — the modern play-by-email.',
  },
};
