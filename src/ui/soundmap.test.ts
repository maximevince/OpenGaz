import { describe, expect, it } from 'vitest';
import { COMMODITY_BY_ID, priceRange } from '../engine';
import { ACTION_SOUND, dealSound, eventSound, SCREEN_SOUND, tradeSound } from './soundmap';

/** Gems at difficulty 1: band 10*17 = 170 .. 40*17 = 680, so "good" starts at 612. */
const GEMS = priceRange(COMMODITY_BY_ID.gems, 1);

describe('dealSound', () => {
  it('calls selling under the average purchase price a bad deal', () => {
    expect(dealSound(300, 400, GEMS.max)).toBe('baddeal');
  });

  it('calls selling near the top of the band for a profit a good deal', () => {
    expect(dealSound(650, 400, GEMS.max)).toBe('gooddeal');
    expect(dealSound(0.9 * GEMS.max, 400, GEMS.max)).toBe('gooddeal'); // the boundary counts
  });

  it('stays quiet on a high price that is still a loss', () => {
    // top of the band, but the goods cost more than that — the loss wins
    expect(dealSound(650, 700, GEMS.max)).toBe('baddeal');
  });

  it('stays quiet on an ordinary profitable sale', () => {
    expect(dealSound(500, 400, GEMS.max)).toBe(null);
  });

  it('treats a lot with no recorded cost as neutral rather than a bad deal', () => {
    // paid = 0 happens for goods the company never bought (nothing to compare against)
    expect(dealSound(300, 0, GEMS.max)).toBe(null);
    expect(dealSound(650, 0, GEMS.max)).toBe('gooddeal');
  });
});

describe('tradeSound', () => {
  it('always gives buying the commodity its own noise', () => {
    const a = { type: 'buy', commodity: 'gems', tons: 3 } as const;
    expect(tradeSound(a, 650, 400, GEMS.max)).toBe('commodity.gems');
  });

  it('lets the deal verdict speak over the commodity when selling', () => {
    const a = { type: 'sell', commodity: 'gems', tons: 3 } as const;
    expect(tradeSound(a, 300, 400, GEMS.max)).toBe('baddeal');
    expect(tradeSound(a, 500, 400, GEMS.max)).toBe('commodity.gems');
  });
});

describe('eventSound', () => {
  it('gives auctions and the credit gates their own voice', () => {
    expect(eventSound('auction:bid', 'neutral')).toBe('auction');
    expect(eventSound('gate:zinn', 'bad')).toBe('zinn');
    expect(eventSound('gate:union', 'bad')).toBe('loan');
  });

  it('falls back to the mood for everything else', () => {
    expect(eventSound('ev:12', 'good')).toBe('event.good');
    expect(eventSound(undefined, undefined)).toBe('event.neutral');
  });
});

describe('the maps themselves', () => {
  it('never routes a trade through ACTION_SOUND', () => {
    // buy/sell are decided by tradeSound; a stale entry here would silently win
    expect(ACTION_SOUND.buy).toBeUndefined();
    expect(ACTION_SOUND.sell).toBeUndefined();
  });

  it('gives every service screen a greeting', () => {
    for (const screen of ['bank', 'loan', 'zinn', 'crew', 'taxes', 'insurance', 'fuel'])
      expect(SCREEN_SOUND[screen]).toBeTruthy();
  });
});
