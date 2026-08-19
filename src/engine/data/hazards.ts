/**
 * The ten hostile groups and the ten weather hazards.
 * News ids 1-10 and 39-48 name a group; weather ids 1-10 and 61-70 name a hazard. Both are
 * what turns an ordinary bad-luck flight into a specific, expensive encounter.
 */

export interface HostileDef {
  name: string;
  /** they empty your hold */
  takesCargo: boolean;
  /** they demand money */
  takesCash: boolean;
}

export const HOSTILES: readonly HostileDef[] = [
  { name: 'the Chichi Bobo Rebels', takesCargo: false, takesCash: true },
  { name: "Darleen's Smugglers", takesCargo: true, takesCash: false },
  { name: 'the Baid-Rowel Bandits', takesCargo: true, takesCash: true },
  { name: 'the Mooglers', takesCargo: false, takesCash: true },
  { name: 'the Fez Fa Fa', takesCargo: false, takesCash: true },
  { name: 'the Hungo Warriors', takesCargo: true, takesCash: false },
  { name: 'the Cylet Mind Buggers', takesCargo: true, takesCash: true },
  { name: 'the Lippo Jungies', takesCargo: false, takesCash: true },
  { name: 'the Wicky Wicks', takesCargo: true, takesCash: false },
  { name: 'Space Pirates', takesCargo: true, takesCash: false },
];

export const WEATHER_HAZARDS: readonly string[] = [
  'a meteor storm',
  'a solar storm',
  'a space hurricane',
  'a stellar typhoon',
  'a cloud of Dexxy Gas',
  'a drift of Mippi Weeds',
  'a slick of Bollup Juice',
  'a bank of Wess Vapor',
  'a stellar whirlpool',
  'a Bobble Warp',
];

/** Which hostile group a news id points at, or null when the story is pure flavour. */
export function hostileFromNews(news: number): HostileDef | null {
  if (news >= 1 && news <= 10) return HOSTILES[news - 1]!;
  if (news >= 39 && news <= 48) return HOSTILES[news - 39]!;
  return null;
}

/** Which hazard a weather id names, or null for a harmless week. */
export function hazardFromWeather(weather: number): string | null {
  if (weather >= 1 && weather <= 10) return WEATHER_HAZARDS[weather - 1]!;
  if (weather >= 61 && weather <= 70) return WEATHER_HAZARDS[weather - 61]!;
  return null;
}
