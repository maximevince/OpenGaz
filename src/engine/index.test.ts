import { describe, expect, it } from 'vitest';
import { GAME_NAME } from './index';

describe('engine', () => {
  it('has a name', () => {
    expect(GAME_NAME).toBe('OpenGaz');
  });
});
